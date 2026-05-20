---
"@playwright-labs/reporter-otel": minor
"@playwright-labs/otel-core": minor
---

Feature: add traceparent context tracking (#49)

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
