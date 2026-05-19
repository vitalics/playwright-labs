# @playwright-labs/fixture-otel

OTel metric fixtures, span helpers, and custom matchers for [`@playwright/test`](https://playwright.dev).

Pair with [`@playwright-labs/reporter-otel`](../reporter-otel) so that everything recorded in test workers is automatically exported to Jaeger, Grafana Tempo, Prometheus, or any other OTLP-compatible backend.

## Requirements

- Playwright >= 1.13.0
- Node.js >= 18
- `@playwright-labs/reporter-otel` configured in `playwright.config.ts`

## Installation

```bash
npm install @playwright-labs/fixture-otel
# also install the reporter if you haven't already
npm install @playwright-labs/reporter-otel
```

## Setup

Configure the reporter in `playwright.config.ts`, then import `test` and `expect` from this package:

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [["@playwright-labs/reporter-otel", { host: "localhost", port: 4318 }]],
});
```

```typescript
// tests/fixtures.ts — re-export for your test files
export { test, expect } from "@playwright-labs/fixture-otel";
```

Or extend your own fixtures:

```typescript
import { test as otelTest } from "@playwright-labs/fixture-otel";
import { myFixtures, type MyFixtures } from "./my-fixtures";

export const test = otelTest.extend<MyFixtures>(myFixtures);
export { expect } from "@playwright-labs/fixture-otel";
```

## Fixtures

All fixtures are automatically cleaned up after each test — metrics are flushed and spans are ended without any manual call.

### `useCounter`

Creates an OTel **Counter** — a monotonically increasing value.

```typescript
test("track API calls", async ({ useCounter, page }) => {
  const requests = useCounter("api_requests", { unit: "requests" });

  await page.goto("/users");
  requests.add(1, { endpoint: "/users", method: "GET" });

  await page.goto("/orders");
  requests.add(1, { endpoint: "/orders", method: "GET" });

  expect(requests).toHaveOtelCallCount(2);
}); // requests.collect() called automatically in teardown
```

### `useHistogram`

Creates an OTel **Histogram** — a distribution of values (latency, sizes, etc.).

```typescript
test("track page load latency", async ({ useHistogram, page }) => {
  const duration = useHistogram("page_load_ms", { unit: "ms" });

  const start = Date.now();
  await page.goto("/dashboard");
  duration.record(Date.now() - start, { route: "/dashboard" });

  expect(duration).toBeOtelMetricCollected();
});
```

### `useUpDownCounter`

Creates an OTel **UpDownCounter** — a value that can increase or decrease. Use for queue depths, in-flight operations, active connections, etc.

```typescript
test("track in-flight requests", async ({ useUpDownCounter, page }) => {
  const inFlight = useUpDownCounter("http_in_flight");

  page.on("request",         () => inFlight.add(1));
  page.on("requestfinished", () => inFlight.add(-1));
  page.on("requestfailed",   () => inFlight.add(-1));

  await page.goto("/dashboard");
  expect(inFlight).toHaveOtelMinCallCount(1);
});
```

### `useTraceparent`

Generates a W3C [`traceparent`](https://www.w3.org/TR/trace-context/) at the start of the test, activates it as the OTel `AsyncLocalStorage` context for the entire test duration, and registers it as the `pw_otel.traceparent` annotation so the reporter's test span joins the same trace.

Calling `useTraceparent()` multiple times within the same test returns the **same object** — the OTel context and annotation are set up once at fixture initialisation.

#### Automatic propagation (zero-config header injection)

When `startWorkerSdk()` has been called in the worker process, every library instrumented by OpenTelemetry (`node:http`, global `fetch`, gRPC, database clients, …) picks up the context automatically via `AsyncLocalStorage`. No manual header injection needed.

```typescript
import { test, startWorkerSdk } from "@playwright-labs/fixture-otel";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

// worker-setup.ts — call once per worker, before any tests run
startWorkerSdk({ instrumentations: [getNodeAutoInstrumentations()] });

// my.spec.ts
test("checkout", async ({ useTraceparent, page }) => {
  useTraceparent(); // activates context; return value optional here
  await page.goto("/checkout");
  // Every fetch / http.request the app makes automatically carries the same traceId
});
```

Register the setup file in `playwright.config.ts`:

```typescript
export default defineConfig({
  require: ["./worker-setup.ts"],
  reporter: [["@playwright-labs/reporter-otel", { host: "localhost", port: 4318 }]],
});
```

Or as a worker-scoped fixture:

```typescript
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

#### Manual propagation

For clients that are not auto-instrumented (Playwright's `request` fixture, custom fetch wrappers, non-Node runtimes), call `useTraceparent()` to get the header value and inject it yourself:

```typescript
test("order API", async ({ useTraceparent, request }) => {
  const { traceparent, traceId } = useTraceparent();

  await request.post("/api/orders", { headers: { traceparent } });
  await request.get("/api/orders/latest", { headers: { traceparent } });

  console.log("trace:", traceId); // same ID visible in Jaeger for all spans
});
```

Both modes compose freely — the same `traceparent` string is used whether it is injected manually or propagated automatically through instrumented libraries.

#### `Traceparent` object

| Property | Type | Description |
|---|---|---|
| `traceId` | `string` | 32-char lowercase hex trace ID |
| `spanId` | `string` | 16-char lowercase hex parent span ID |
| `traceparent` | `string` | Full W3C header value: `00-{traceId}-{spanId}-01` |

### `useSpan`

Creates a named **Span** that appears as a child of the current test span in Jaeger / Tempo. The span is automatically ended by the fixture teardown if not explicitly closed.

```typescript
test("track checkout", async ({ useSpan, page }) => {
  const span = useSpan("checkout.flow");
  await page.goto("/checkout");
  span.setAttribute("cart.items", 3);
  span.setAttribute("payment.method", "credit_card");
  span.end();

  expect(span).toBeOtelSpanEnded();
});
```

Spans support method chaining and error status:

```typescript
test("simulate error", async ({ useSpan }) => {
  const span = useSpan("payment.charge");
  span
    .setAttribute("payment.method", "credit_card")
    .setStatus("error", "Card declined")
    .end();
});
```

## `withSpan` — callback-based span helper

`withSpan` wraps a callback in an OTel span without requiring a fixture. The span is created before the callback runs and ended automatically when it completes — whether it resolves or throws.

Designed to pair naturally with Playwright's `test.step`, giving visibility in both the Playwright Trace Viewer (steps) and Jaeger / Tempo (spans):

```typescript
import { test } from "@playwright-labs/fixture-otel";
import { withSpan } from "@playwright-labs/fixture-otel";

test("checkout flow", async ({ page }) => {
  await test.step("add item to cart", () =>
    withSpan("cart.add", (span) => {
      span.setAttribute("product.id", "abc-123");
      return page.click('[data-testid="add-to-cart"]');
    }),
  );

  await test.step("complete checkout", () =>
    withSpan("checkout.submit", async (span) => {
      span.setAttribute("cart.items", 3);
      span.setAttribute("payment.method", "credit_card");
      await page.click('[data-testid="checkout"]');
      span.setStatus("ok");
    }),
  );
});
```

Standalone usage — `withSpan` preserves and returns the callback's return value:

```typescript
const user = await withSpan("db.users.find", async (span) => {
  span.setAttribute("db.table", "users");
  return db.findById(userId);
});
```

On error, the span status is set to `"error"` and the error is re-thrown:

```typescript
await withSpan("api.orders", async (span) => {
  const res = await fetch("/api/orders");
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}); // span status = "error" if fetch throws
```

### Nested spans

Nested `withSpan` calls automatically produce **parent–child** relationships in the OTel backend. The context is propagated via `AsyncLocalStorage`, so no manual wiring is needed:

```typescript
await withSpan("checkout.flow", async (flow) => {
  flow.setAttribute("cart.items", 3);

  await withSpan("db.orders", async (db) => {
    db.setAttribute("db.table", "orders");
  });

  await withSpan("http.payment", async (pay) => {
    pay.setAttribute("method", "credit_card");
  });
});
```

This produces the following tree in Jaeger / Tempo:

```
[test span]
  └── checkout.flow
        ├── db.orders
        └── http.payment
```

## `using` keyword — scope-bound lifecycle (TypeScript 5.2+)

Both metrics and spans implement `Symbol.dispose`, so they work with the `using` keyword for deterministic, scope-bound cleanup:

```typescript
test("scope-bound lifecycle", async ({ useCounter, useSpan, page }) => {
  {
    using span = useSpan("page.load");
    await page.goto("/dashboard");
    span.setAttribute("status", "loaded");
  } // span.end() called automatically

  {
    using requests = useCounter("api_calls");
    await page.click('[data-testid="load-more"]');
    requests.add(1);
  } // requests.collect() called automatically
});
```

## Custom Matchers

Import `expect` from `@playwright-labs/fixture-otel` to get the OTel matchers.

### `toBeOtelMetricCollected()`

Passes when the metric was recorded at least once.

```typescript
const counter = useCounter("http_requests");
counter.add(1);
expect(counter).toBeOtelMetricCollected();
expect(emptyCounter).not.toBeOtelMetricCollected();
```

### `toHaveOtelCallCount(n)`

Passes when the metric was recorded exactly `n` times. `callCount` persists across `collect()` calls.

```typescript
counter.add(1);
counter.add(1);
counter.add(1);
expect(counter).toHaveOtelCallCount(3);
expect(counter).not.toHaveOtelCallCount(2);
```

### `toHaveOtelMinCallCount(min)`

Passes when the metric was recorded at least `min` times.

```typescript
counter.add(1);
counter.add(1);
expect(counter).toHaveOtelMinCallCount(1);  // passes
expect(counter).toHaveOtelMinCallCount(2);  // passes
expect(counter).not.toHaveOtelMinCallCount(5); // passes (2 < 5)
```

### `toBeOtelSpanEnded()`

Passes when the span has been ended via `span.end()` or by exiting a `using` block.

```typescript
const span = useSpan("my.operation");
expect(span).not.toBeOtelSpanEnded(); // still open
span.end();
expect(span).toBeOtelSpanEnded();     // now closed
```

## TypeScript

All types and values are exported:

```typescript
import type {
  OtelFixture,
  Traceparent,
  WorkerSdkOptions,
  Counter,
  Histogram,
  UpDownCounter,
  Span,
  MetricOptions,
  OtelMatchers,
} from "@playwright-labs/fixture-otel";

import {
  withSpan,
  startWorkerSdk,
  TRACEPARENT_ANNOTATION,
} from "@playwright-labs/fixture-otel";
```

## How it works

### Metrics and custom spans — stdout event bridge

The fixture system uses a **stdout event bridge** between Playwright workers and the reporter:

1. When `collect()` is called — manually, on fixture teardown, or when a `using` block exits — the metric serialises its data points as a JSON line prefixed with `__pw_otel__` and writes it to `process.stdout`.
2. When `span.end()` is called, the span is serialised the same way.
3. The reporter's `onStdOut` hook intercepts these lines and records them with the shared OTel SDK — metrics via the `Meter`, spans as child spans of the current test span.

This works seamlessly across Playwright's multi-worker architecture without any additional network setup.

### Trace propagation — deferred span creation

The reporter creates the test span at `onTestEnd` (not `onTestBegin`) so that the `pw_otel.traceparent` annotation pushed by the `useTraceparent` fixture is available before the span context is resolved. All timing is preserved — the span's `startTime` is still set to when the test began.

### Auto-instrumentation — worker SDK

`startWorkerSdk()` initialises an OTel `NodeSDK` in the worker process with an OTLP trace exporter that points directly at the reporter's local HTTP server (`PLAYWRIGHT_OTEL_BASE_URL`). When active, its `AsyncLocalStorageContextManager` picks up the context activated by `useTraceparent()` and all instrumented libraries propagate the traceparent automatically.

## License

MIT
