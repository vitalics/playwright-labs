export {
  test,
  type OtelFixture,
  type Traceparent,
  Counter,
  Histogram,
  UpDownCounter,
  Span,
  type MetricOptions,
  TRACEPARENT_ANNOTATION,
} from "./fixture";

export { startWorkerSdk, type WorkerSdkOptions } from "@playwright-labs/otel-core";

export { expect, type OtelMatchers } from "./matchers";

export { withSpan } from "./with-span";
