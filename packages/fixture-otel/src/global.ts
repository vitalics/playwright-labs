import {
  Counter,
  Histogram,
  type MetricOptions,
} from "@playwright-labs/otel-core";

/** Metric kinds that can be registered as global metrics. */
type GlobalMetricKind = "counter" | "histogram";

/**
 * Process-level registry of shared metrics, keyed by `${kind}:${name}`.
 *
 * Playwright runs each worker in its own process, so a module-level `Map`
 * naturally scopes the registry to a single worker: every test executed by
 * that worker sees the same instances and values accumulate across tests.
 */
const globalMetrics = new Map<string, Counter | Histogram>();

function getOrCreate(
  kind: "counter",
  name: string,
  options?: MetricOptions,
): Counter;
function getOrCreate(
  kind: "histogram",
  name: string,
  options?: MetricOptions,
): Histogram;
function getOrCreate(
  kind: GlobalMetricKind,
  name: string,
  options?: MetricOptions,
): Counter | Histogram {
  const key = `${kind}:${name}`;
  const existing = globalMetrics.get(key);
  if (existing) return existing;

  const otherKind: GlobalMetricKind =
    kind === "counter" ? "histogram" : "counter";
  if (globalMetrics.has(`${otherKind}:${name}`)) {
    throw new Error(
      `Global metric "${name}" is already registered as a ${otherKind}`,
    );
  }

  const metric =
    kind === "counter" ? new Counter(name, options) : new Histogram(name, options);
  globalMetrics.set(key, metric);
  return metric;
}

/**
 * Returns the shared {@link Counter} for `name`, creating it on first use.
 * `options` only apply at creation and are ignored on subsequent calls.
 */
export function getGlobalCounter(name: string, options?: MetricOptions): Counter {
  return getOrCreate("counter", name, options);
}

/**
 * Returns the shared {@link Histogram} for `name`, creating it on first use.
 * `options` only apply at creation and are ignored on subsequent calls.
 */
export function getGlobalHistogram(
  name: string,
  options?: MetricOptions,
): Histogram {
  return getOrCreate("histogram", name, options);
}

/**
 * Flushes every registered global metric. Draining makes this a no-op for
 * metrics with no data recorded since the last flush.
 */
export function collectGlobalMetrics(): void {
  globalMetrics.forEach((m) => m.collect());
}
