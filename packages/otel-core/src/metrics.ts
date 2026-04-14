import { OtelEvent } from "./events";

export type MetricOptions = {
  /** Human-readable description of what the metric measures. */
  description?: string;
  /** Unit of measurement (e.g. `'ms'`, `'bytes'`, `'requests'`). */
  unit?: string;
};

type DataPoint = {
  value: number;
  attributes?: Record<string, string | number | boolean>;
};

/**
 * Base class for all worker-side OTel metric wrappers.
 *
 * Recorded values are buffered locally and forwarded to the reporter process
 * on `collect()` (or when the `using` declaration exits scope via
 * `Symbol.dispose`). The reporter's `onStdOut` hook intercepts the emitted
 * event and records it with the shared OTel meter.
 *
 * @example
 * ```ts
 * // Automatic flush at end of test (fixture teardown calls collect())
 * const counter = useCounter('api_requests');
 * counter.add(1, { endpoint: '/users' });
 *
 * // Explicit, deterministic flush with `using`
 * using histogram = useHistogram('response_time', { unit: 'ms' });
 * histogram.record(Date.now() - start);
 * // histogram.collect() is called automatically when the block exits
 * ```
 */
export abstract class BaseMetric implements Disposable {
  private _callCount = 0;
  protected readonly _dataPoints: DataPoint[] = [];

  constructor(
    readonly name: string,
    protected readonly options?: MetricOptions,
  ) {}

  /** @internal */
  protected _record(
    value: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this._callCount++;
    this._dataPoints.push({ value, attributes });
  }

  /**
   * Total number of times a value was recorded across the lifetime of this
   * metric. Does **not** reset after `collect()`.
   */
  get callCount(): number {
    return this._callCount;
  }

  /**
   * Flushes all buffered data points to the OTel reporter via stdout.
   *
   * Called automatically by the fixture teardown after each test ends.
   * Call it manually for deterministic mid-test flushing.
   * A second call is a no-op if no new data has been recorded since the last flush.
   */
  collect(): void {
    if (this._dataPoints.length === 0) return;
    OtelEvent.emit({
      kind: "metric",
      type: this.metricType,
      name: this.name,
      ...(this.options?.description !== undefined && {
        description: this.options.description,
      }),
      ...(this.options?.unit !== undefined && { unit: this.options.unit }),
      dataPoints: [...this._dataPoints],
    });
    this._dataPoints.length = 0;
  }

  /**
   * Called automatically when exiting a `using` block.
   * Equivalent to calling `collect()`.
   */
  [Symbol.dispose](): void {
    this.collect();
  }

  /** @internal */
  protected abstract readonly metricType:
    | "counter"
    | "histogram"
    | "updown_counter";
}

/**
 * Worker-side OTel **Counter** — a monotonically increasing value.
 * Obtained via the `useCounter` fixture.
 *
 * @example
 * ```ts
 * test('track requests', async ({ useCounter, page }) => {
 *   const requests = useCounter('api_requests', { unit: 'requests' });
 *   await page.goto('/users');
 *   requests.add(1, { endpoint: '/users', status: '200' });
 * });
 * ```
 */
export class Counter extends BaseMetric {
  protected readonly metricType = "counter" as const;

  /**
   * Adds a non-negative value to the counter.
   * @param value - Must be >= 0.
   * @param attributes - Optional labels for this data point.
   */
  add(
    value: number,
    attributes?: Record<string, string | number | boolean>,
  ): this {
    this._record(value, attributes);
    return this;
  }
}

/**
 * Worker-side OTel **Histogram** — a statistical distribution of values.
 * Obtained via the `useHistogram` fixture.
 *
 * @example
 * ```ts
 * test('track page load', async ({ useHistogram, page }) => {
 *   const duration = useHistogram('page_load_duration', { unit: 'ms' });
 *   const start = Date.now();
 *   await page.goto('/dashboard');
 *   duration.record(Date.now() - start, { route: '/dashboard' });
 * });
 * ```
 */
export class Histogram extends BaseMetric {
  protected readonly metricType = "histogram" as const;

  /**
   * Records a measured value into the histogram distribution.
   * @param value - The measured value.
   * @param attributes - Optional labels for this data point.
   */
  record(
    value: number,
    attributes?: Record<string, string | number | boolean>,
  ): this {
    this._record(value, attributes);
    return this;
  }
}

/**
 * Worker-side OTel **UpDownCounter** — a value that can increase or decrease.
 * Obtained via the `useUpDownCounter` fixture.
 * Use for queue depths, active connections, in-flight operations, etc.
 *
 * @example
 * ```ts
 * test('track in-flight requests', async ({ useUpDownCounter, page }) => {
 *   const inFlight = useUpDownCounter('http_requests_in_flight');
 *   inFlight.add(1);
 *   await page.goto('/api');
 *   inFlight.add(-1);
 * });
 * ```
 */
export class UpDownCounter extends BaseMetric {
  protected readonly metricType = "updown_counter" as const;

  /**
   * Adds a value (positive or negative) to the counter.
   * @param value - Can be any number.
   * @param attributes - Optional labels for this data point.
   */
  add(
    value: number,
    attributes?: Record<string, string | number | boolean>,
  ): this {
    this._record(value, attributes);
    return this;
  }
}
