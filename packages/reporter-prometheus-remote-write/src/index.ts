export {
  default as Reporter,
  default,
  type PrometheusOptions,
} from "./reporter";

// Re-export core primitives so consumers can import everything from a
// single package when they don't use fixture-prometheus separately.
export {
  Metric,
  Counter,
  Gauge,
  Histogram,
  DEFAULT_BUCKETS,
  Event,
} from "@playwright-labs/prometheus-core";
