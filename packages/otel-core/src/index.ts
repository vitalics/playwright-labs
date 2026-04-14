export {
  OtelEvent,
  OTEL_EVENT_PREFIX,
  WORKER_BASE_URL_ENV,
  WORKER_HEADERS_ENV,
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
