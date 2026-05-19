export {
  OtelEvent,
  OTEL_EVENT_PREFIX,
  WORKER_BASE_URL_ENV,
  WORKER_HEADERS_ENV,
  TRACEPARENT_ANNOTATION,
  type MetricType,
  type DataPoint,
  type MetricPayload,
  type SpanPayload,
  type OtelPayload,
} from "./events";

export { Span, type SpanStatus } from "./span";

export {
  BaseMetric,
  Counter,
  Histogram,
  UpDownCounter,
  type MetricOptions,
} from "./metrics";

export {
  resolveOtelConfig,
  createOtelSdk,
  DEFAULT_HOST,
  DEFAULT_PORT,
  DEFAULT_PROTOCOL,
  DEFAULT_PREFIX,
  DEFAULT_EXPORT_INTERVAL,
  type OtelCoreOptions,
  type ResolvedOtelConfig,
} from "./sdk";

export { startWorkerSdk, type WorkerSdkOptions } from "./worker-sdk";

// Re-export OTel API primitives needed by fixture-otel so it can use them
// without declaring @opentelemetry/api as a direct dependency.
export {
  context as otelContext,
  trace as otelTrace,
  TraceFlags,
} from "@opentelemetry/api";
export type { SpanContext } from "@opentelemetry/api";
