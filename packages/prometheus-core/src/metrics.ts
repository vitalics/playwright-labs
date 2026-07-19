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
    process.stdout.write(JSON.stringify(event));
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
