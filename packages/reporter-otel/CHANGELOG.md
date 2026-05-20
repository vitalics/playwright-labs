# @playwright-labs/reporter-otel

## 1.1.0

### Minor Changes

- b32d9ba: Feature: add traceparent context tracking (#49)

  ### `@playwright-labs/reporter-otel`
  - **Deferred span creation**: the test span is now created in `onTestEnd` instead of
    `onTestBegin`, so the `pw_otel.traceparent` annotation set by the fixture is
    available before the span context is resolved. Span `startTime` is preserved.
  - **Traceparent injection**: when a `pw_otel.traceparent` annotation is present, the
    test span is created as a child of that remote context, placing it in the same trace
    as all instrumented outgoing requests from the test.
  - **Step spans deferred**: step spans are created recursively from `result.steps` in
    `onTestEnd` so they share the same trace context as the test span.
  - Exported `parseTraceparent(value)` helper — parses a W3C traceparent string into an
    OTel `SpanContext`; returns `undefined` for invalid input.

  ### `@playwright-labs/otel-core`
  - Added `TRACEPARENT_ANNOTATION` constant (`"pw_otel.traceparent"`) — the shared key
    used by the fixture to annotate a test and read by the reporter to resolve the trace context.
  - Added `startWorkerSdk(options?)` — initialises a singleton `NodeSDK` in the worker
    process with an OTLP trace exporter pointing at the reporter's local HTTP server
    (`PLAYWRIGHT_OTEL_BASE_URL`). Subsequent calls are no-ops; returns immediately when
    the reporter is not running.

- a80f334: Feature: add tracking for parent span ids during the test before sending metrics in OTEL (related #49)

### Patch Changes

- Updated dependencies [a80f334]
- Updated dependencies [b32d9ba]
  - @playwright-labs/otel-core@1.1.0

## 1.0.1

### Patch Changes

- Updated dependencies [0ed8282]
  - @playwright-labs/otel-core@1.0.1

## 1.0.0

### Major Changes

- 7d6ee21: Introduce `@playwright-labs/reporter-otel` — an OpenTelemetry reporter for Playwright that sends traces and metrics to any OTLP-compatible backend (Jaeger, Grafana Tempo, Prometheus via OTel Collector, Datadog, and more).

  Every test becomes a root span; every Playwright step becomes a child span. Built-in metrics cover test results, durations, retries, attachments, errors, and Node.js process health (heap, RSS, CPU). Browser and project metadata (name, channel, headless, viewport, locale) are captured as span and metric attributes.

  Basic usage:

  ```ts
  // playwright.config.ts
  import { defineConfig } from "@playwright/test";

  export default defineConfig({
    reporter: [
      ["@playwright-labs/reporter-otel", { host: "localhost", port: 4318 }],
    ],
  });
  ```

### Patch Changes

- Updated dependencies [7d6ee21]
  - @playwright-labs/otel-core@1.0.0
