import { Timeseries } from "prometheus-remote-write";
import { Event } from "./events";

export abstract class Metric<
  const MetricName extends string = string,
  const Labels extends Record<string, string> = Record<string, string>,
> {
  /** **NOTE:** Must be initialized in constructor */
  protected series!: Timeseries;
  /** How many leading samples of `series` were already flushed (collected or drained). */
  private _sentCount = 0;
  constructor(metadata: Record<"name", MetricName> & Labels) {
    if (!metadata.name) {
      throw new Error(`"name" property for metadata is required`);
    }
  }
  /** Internal method */
  _getSeries(): Timeseries {
    return this.series;
  }
  /**
   * Internal method. Returns the series with only the samples that were not
   * flushed yet, and marks them as sent.
   *
   * Prometheus (3.x) rejects a whole remote-write request when it carries
   * samples older than the series' newest stored sample ("out of order
   * sample"), so re-sending already-pushed samples breaks the entire batch.
   * Draining guarantees every sample is shipped exactly once.
   */
  _drainSeries(): Timeseries {
    const drained: Timeseries = {
      labels: { ...this.series.labels },
      samples: this.series.samples.slice(this._sentCount),
    };
    this._sentCount = this.series.samples.length;
    return drained;
  }
  /** Internal method. `true` when there are samples that were not flushed yet. */
  _hasPendingSamples(): boolean {
    return this.series.samples.length > this._sentCount;
  }
  /** Append extra labels */
  labels(labels: Record<string, string>): this {
    this.series.labels = {
      ...this.series.labels,
      ...labels,
    };
    return this;
  }

  /**
   * Send metrics to prometheus.
   *
   * Flushes only the samples recorded since the previous `collect()` —
   * repeated calls without new samples write nothing.
   */
  collect() {
    if (!this._hasPendingSamples()) {
      return this;
    }
    const event = new Event(this._drainSeries());
    // Newline-terminated so back-to-back events can be split into single
    // JSON lines by the reporter (`JSON.parse` tolerates the trailing "\n").
    process.stdout.write(JSON.stringify(event) + "\n");
    return this;
  }
  /** revert metric to initial state */
  abstract reset(): this;

  [Symbol.dispose]() {
    this.collect();
    this.reset();
  }
}

/**
 * Counters go up, and reset when the process restarts.
 *
 * Initial value is 0
 */
export class Counter<
  const MetricName extends string = string,
  const Labels extends Record<string, string> = Record<string, string>,
> extends Metric<MetricName, Labels> {
  protected counter: number = 0;
  /** Timestamp of the last recorded sample — keeps sample timestamps strictly increasing. */
  private _lastTs = 0;
  constructor(
    protected readonly metadata: Record<"name", MetricName> & Labels,
    protected initialValue = 0,
  ) {
    super(metadata);

    this.counter = initialValue;
    const { name, ...restMetadata } = this.metadata;
    this._lastTs = Date.now();
    this.series = {
      labels: {
        __name__: name,
        ...restMetadata,
      },
      samples: [
        {
          value: this.counter,
          timestamp: this._lastTs,
        },
      ],
    };
  }

  /**
   * Strictly increasing sample timestamp. Prometheus keeps only the first
   * sample when several samples of one series share a timestamp, so multiple
   * `inc()` calls within the same millisecond must not reuse `Date.now()`.
   */
  protected nextTimestamp(): number {
    this._lastTs = Math.max(Date.now(), this._lastTs + 1);
    return this._lastTs;
  }

  /** Increase counter by selected value */
  inc(value = 1) {
    this.counter += value;
    this.series.samples.push({
      value: this.counter,
      timestamp: this.nextTimestamp(),
    });
    return this;
  }

  reset(): this {
    return new Counter(this.metadata, this.initialValue) as never;
  }
}

/* Gauges are similar to Counters but a Gauge's value can be decreased. */
export class Gauge<
  const MetricName extends string = string,
  const Labels extends Record<string, string> = Record<string, string>,
> extends Counter<MetricName, Labels> {
  /** Decrement gauge value */
  dec(value = 1) {
    this.counter -= value;
    this.series.samples.push({
      value: this.counter,
      timestamp: this.nextTimestamp(),
    });
    return this;
  }

  /** set gauge value */
  set(value = 1) {
    this.counter = value;
    this.series.samples.push({
      value: this.counter,
      timestamp: this.nextTimestamp(),
    });
    return this;
  }

  /** set gauge to zero  */
  zero() {
    return this.set(0);
  }

  reset(): this {
    return new Gauge(this.metadata, this.initialValue) as never;
  }
}

/** Default bucket bounds used by Prometheus client libraries. */
export const DEFAULT_BUCKETS = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];

/**
 * A histogram samples observations (usually request durations or response
 * sizes) and counts them in configurable buckets.
 *
 * Implemented as a composition of counters — a histogram is multi-series and
 * therefore does not extend `Metric`:
 *
 * - `${name}_bucket{le="<bound>"}` — one counter per bound plus `le="+Inf"`,
 *   cumulative (an observation increments every bucket whose bound is `>=`
 *   the observed value).
 * - `${name}_sum` — sum of all observed values.
 * - `${name}_count` — total number of observations (always equals the
 *   `le="+Inf"` bucket).
 *
 * Each child counter drains independently, so `collect()` emits one
 * newline-terminated JSON event per child with pending samples.
 */
export class Histogram<const MetricName extends string = string> {
  /** One counter per bucket bound, with the `+Inf` bucket as the last element. */
  readonly buckets: Counter[];
  /** Sum of all observed values (`${name}_sum`). */
  readonly sum: Counter;
  /** Total number of observations (`${name}_count`). */
  readonly count: Counter;
  /** Bucket upper bounds (without the implicit `+Inf` bound). */
  private readonly bounds: number[];

  constructor(
    protected readonly metadata: Record<"name", MetricName> & {
      buckets?: number[];
    } & Record<string, unknown>,
  ) {
    const { name, buckets, ...restMetadata } = metadata;
    if (!name) {
      throw new Error(`"name" property for metadata is required`);
    }
    if (
      buckets !== undefined &&
      (buckets.length === 0 ||
        buckets.some((bound) => !Number.isFinite(bound)) ||
        buckets.some((bound, index) => index > 0 && bound <= buckets[index - 1]))
    ) {
      throw new Error(
        `"buckets" must be a non-empty array of finite numbers in strictly ascending order`,
      );
    }
    this.bounds = buckets ?? [...DEFAULT_BUCKETS];
    // Extra metadata labels are spread onto every child series.
    const labels = restMetadata as Record<string, string>;
    this.buckets = [
      ...this.bounds.map(
        (bound) =>
          new Counter({
            name: `${name}_bucket`,
            ...labels,
            le: `${bound}`,
          }),
      ),
      new Counter({ name: `${name}_bucket`, ...labels, le: "+Inf" }),
    ];
    this.sum = new Counter({ name: `${name}_sum`, ...labels });
    this.count = new Counter({ name: `${name}_count`, ...labels });
  }

  /**
   * Record an observation: increments every bucket whose bound is `>= value`
   * (the `+Inf` bucket always matches), adds `value` to the sum and increments
   * the observation count.
   */
  observe(value: number): this {
    this.bounds.forEach((bound, index) => {
      if (bound >= value) {
        this.buckets[index].inc();
      }
    });
    // The `+Inf` bucket is the last one and is always incremented.
    this.buckets[this.buckets.length - 1].inc();
    this.sum.inc(value);
    this.count.inc();
    return this;
  }

  /**
   * Send metrics to prometheus.
   *
   * Collects every child counter — each drains independently and writes its
   * own single-line JSON event to stdout. Children without pending samples
   * are skipped automatically (their `collect()` is a no-op).
   */
  collect(): this {
    [...this.buckets, this.sum, this.count].forEach((counter) =>
      counter.collect(),
    );
    return this;
  }

  /** revert metric to initial state */
  reset(): this {
    return new Histogram(this.metadata) as never;
  }

  [Symbol.dispose]() {
    this.collect();
    this.reset();
  }
}
