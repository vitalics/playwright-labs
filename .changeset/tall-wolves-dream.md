---
"@playwright-labs/otel-core": minor
"@playwright-labs/reporter-otel": minor
"@playwright-labs/fixture-otel": minor
---

Feature: W3C traceparent propagation with automatic and manual instrumentation support

Enables a single `traceId` per test that spans both Playwright steps and downstream
service calls, so every request your app makes during a test appears in the same trace.

### `@playwright-labs/otel-core`

- Added `TRACEPARENT_ANNOTATION` constant (`"pw_otel.traceparent"`) — the shared key
  used by the fixture to annotate a test and by the reporter to read it
- Added `startWorkerSdk(options?)` — initialises a singleton `NodeSDK` in the worker
  process and points its OTLP exporter at the reporter's local HTTP server
  (`PLAYWRIGHT_OTEL_BASE_URL`). Call once before any tests run; subsequent calls are
  no-ops. Returns immediately when the reporter is not running.
- Re-exports `context`, `trace`, `TraceFlags`, and `SpanContext` from
  `@opentelemetry/api` so `fixture-otel` does not need a direct dependency on it.

### `@playwright-labs/reporter-otel`

- **Deferred span creation**: the test span is now created in `onTestEnd` instead of
  `onTestBegin`, so the `pw_otel.traceparent` annotation pushed by the fixture is
  already available when the span context is resolved. Span `startTime` is preserved
  from `onTestBegin`.
- **Traceparent injection**: when a `pw_otel.traceparent` annotation is present, the
  test span is created as a child of that remote context, placing it in the same trace
  as all instrumented outgoing requests.
- **Step spans deferred**: step spans are created recursively from `result.steps` in
  `onTestEnd` (instead of imperatively in `onStepBegin`/`onStepEnd`) so they share the
  same trace context as the test span.
- Exported `parseTraceparent(value)` — parses a W3C traceparent string into an OTel
  `SpanContext`; returns `undefined` for invalid input.

### `@playwright-labs/fixture-otel`

- Added `useTraceparent()` fixture — generates a W3C traceparent at fixture
  initialisation, registers it as the `pw_otel.traceparent` annotation, and activates
  the corresponding OTel context for the duration of the test via
  `otelContext.with()`.

  **Automatic propagation** (requires `startWorkerSdk()` in the worker): the
  `AsyncLocalStorageContextManager` picks up the activated context and all
  auto-instrumented libraries (`node:http`, global `fetch`, gRPC, …) propagate the
  traceparent without any manual header injection:

  ```ts
  // fixtures.ts
  import { test as baseTest, startWorkerSdk } from "@playwright-labs/fixture-otel";
  import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

  export const test = baseTest.extend<{}, { otelWorker: void }>({
    otelWorker: [
      async ({}, use) => {
        startWorkerSdk({ instrumentations: [getNodeAutoInstrumentations()] });
        await use();
      },
      { scope: "worker" },
    ],
  });
  ```

  ```ts
  // my.spec.ts
  test("checkout", async ({ useTraceparent, page }) => {
    useTraceparent(); // activates OTel context; return value is optional
    await page.goto("/checkout"); // all fetch/http requests carry the same traceId
  });
  ```

  **Manual propagation**: call `useTraceparent()` to get the header string and inject it
  yourself when working with non-instrumented clients:

  ```ts
  test("order API", async ({ useTraceparent, request }) => {
    const { traceparent } = useTraceparent();
    await request.post("/api/order", { headers: { traceparent } });
  });
  ```

  Calling `useTraceparent()` multiple times within the same test returns the same
  `Traceparent` object — the annotation and OTel context are set up once.

- Added `Traceparent` interface and `TRACEPARENT_ANNOTATION` re-export.
- Re-exports `startWorkerSdk` and `WorkerSdkOptions` from `@playwright-labs/otel-core`.
