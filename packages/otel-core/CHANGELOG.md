# @playwright-labs/otel-core

## 1.1.0

### Minor Changes

- a80f334: Feature: added `spanId` and `parentSpanId` fields to span events (related #49)
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

## 1.0.1

### Patch Changes

- 0ed8282: Add README documenting all public exports — `Counter`, `Histogram`, `UpDownCounter`, `Span`, `OtelEvent`, `resolveOtelConfig`, and `createOtelSdk` — with the stdout bridge architecture, `using` keyword lifecycle, and SDK factory examples.

## 1.0.0

### Major Changes

- 7d6ee21: Introduce `@playwright-labs/otel-core` — the shared OTel primitives used by the reporter and fixture packages.

  Exports `Counter`, `Histogram`, `UpDownCounter`, and `Span` classes. Each class serializes its data as a `__pw_otel__`-prefixed JSON line written to `process.stdout`, allowing Playwright workers to forward metric and trace data to the reporter process without additional network setup.

  Basic usage:

  ```ts
  import { Counter, Span } from "@playwright-labs/otel-core";

  const counter = new Counter("api_requests", { unit: "requests" });
  counter.add(1, { endpoint: "/users" });
  counter.collect(); // emits to stdout → picked up by reporter

  const span = new Span("db.query");
  span.setAttribute("db.table", "users");
  span.end(); // emits to stdout → recorded as a child span
  ```
