export {
  default as Reporter,
  default,
  annotationLabel,
  ANNOTATION_PREFIX,
  type OtelReporterOptions,
} from "./reporter";

// Re-export core primitives so reporter-otel consumers can import everything
// from a single package when they don't use fixture-otel separately.
export {
  BaseMetric,
  Counter,
  Histogram,
  UpDownCounter,
  type MetricOptions,
  Span,
  type SpanStatus,
  OtelEvent,
  type OtelPayload,
  type MetricPayload,
  type SpanPayload,
  type MetricType,
  type DataPoint,
} from "@playwright-labs/otel-core";
