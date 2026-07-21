---
title: Instrument Tests with Custom OTel Metrics, Spans, and Distributed Trace Propagation
impact: MEDIUM
impactDescription: adds business-level telemetry to tests and connects Playwright spans with upstream service traces
tags: opentelemetry, otel, metrics, spans, tracing, traceparent, counter, histogram, useSpan, withSpan, fixture-otel
---

## Instrument Tests with Custom OTel Metrics, Spans, and Distributed Trace Propagation

**Impact: MEDIUM (adds business-level telemetry to tests and connects Playwright spans with upstream service traces)**

The built-in reporter-otel metrics track test results and durations. The `@playwright-labs/fixture-otel` package goes further — its fixtures let you record custom business metrics (`useCounter`, `useHistogram`, `useUpDownCounter`), create named child spans (`useSpan`, `withSpan`), and propagate a W3C `traceparent` into the system under test so every downstream service span appears in the same Jaeger trace as the Playwright test span.

## When to Use

- **Use useCounter when**: Counting specific events inside a test — API calls made, items rendered, retries triggered
- **Use useHistogram when**: Recording latency or size distributions — page load time, response sizes, render durations
- **Use useUpDownCounter when**: Tracking values that go up and down — in-flight requests, queue depth, active connections
- **Use useGlobalCounter when**: Counting events across the whole worker run — total URL/page calls, suite-wide API usage; one shared instance per worker, values accumulate between tests
- **Use useGlobalHistogram when**: Recording distributions across the whole worker run — page-load latency for the entire suite, not a single test; one shared instance per worker, values accumulate between tests
- **Use useSpan when**: Grouping a logical operation into a named span visible in Jaeger alongside Playwright steps
- **Use withSpan when**: Wrapping a utility function in a span without needing a fixture
- **Use useTraceparent when**: The test calls real services and you want Playwright and service spans in one trace
- **Requires**: `@playwright-labs/reporter-otel` running in `playwright.config.ts`

## Guidelines

### Do

- Pair `test.step` with `withSpan` for simultaneous visibility in Playwright Trace Viewer and Jaeger
- Use the `using` keyword (TypeScript 5.2+) for deterministic span/metric cleanup within a scope block
- Call `useTraceparent()` once at the top of tests that make real HTTP calls — all auto-instrumented libraries pick it up via `AsyncLocalStorage`
- Add `startWorkerSdk({ instrumentations: [...] })` in a worker-scoped fixture to enable zero-config trace propagation across all tests in the worker
- Use `toBeOtelMetricCollected()` and `toHaveOtelCallCount(n)` to assert that instrumentation fired the expected number of times

### Don't

- Don't call `useTraceparent()` multiple times in one test — it is idempotent and always returns the same object
- Don't use `useSpan` for spans that cross `await` boundaries without holding a reference — the span stays open until fixture teardown, but explicit `span.end()` is clearer
- Don't add test-unique IDs (order IDs, user IDs) as metric attributes — high cardinality exhausts Prometheus label space; use span attributes instead
- Don't import from `@playwright-labs/fixture-otel` in tests that don't use the reporter — the stdout bridge writes JSON lines to stdout, which can interfere with reporters that parse stdout

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/fixture-otel @playwright-labs/reporter-otel`
- **Fixtures**: `useCounter(name, options?)`, `useHistogram(name, options?)`, `useUpDownCounter(name, options?)`, `useGlobalCounter(name, options?)`, `useGlobalHistogram(name, options?)`, `useSpan(name)`, `useTraceparent()`
- **Standalone helper**: `withSpan(name, callback)` — no fixture required
- **Worker SDK**: `startWorkerSdk(options)` — call once per worker for auto-instrumented trace propagation
- **Matchers**: `toBeOtelMetricCollected()`, `toHaveOtelCallCount(n)`, `toHaveOtelMinCallCount(min)`, `toBeOtelSpanEnded()`

## Edge Cases and Constraints

### Limitations

- Metrics and spans are flushed via `process.stdout` (`__pw_otel__` prefix) — they require `reporter-otel` to be active in the same Playwright process; standalone use without the reporter silently discards data
- `withSpan` spans and the reporter's test span are siblings under the same `traceparent` root, not parent–child — this is an architectural trade-off because the test span is created at `onTestEnd`
- `startWorkerSdk()` is a singleton — calling it multiple times is safe; calling it without the reporter running is also safe (exits silently)

### Edge Cases

1. **Span still open after test**: If `span.end()` is not called, the fixture teardown closes it automatically. The span's end time reflects the fixture teardown moment, not the test end.
2. **Nested `withSpan` calls**: Automatically produce parent–child relationships in Jaeger via `AsyncLocalStorage` context propagation — no manual wiring needed.
3. **Manual vs. automatic traceparent**: Both modes use the same `traceparent` value and are fully composable within one test.

### What Breaks If Ignored

- **Without useTraceparent**: Playwright spans and service spans appear as unrelated traces in Jaeger — no end-to-end trace correlation
- **Without custom metrics**: You can only see "test passed/failed" — not "how many retries happened inside this test" or "how long did the checkout API take"
- **Without withSpan + test.step**: Playwright Trace Viewer shows steps but not the downstream spans they trigger; Jaeger shows spans but not the test steps

**Incorrect (no instrumentation, no trace correlation):**

```typescript
import { test, expect } from "@playwright/test";

test("checkout flow", async ({ page, request }) => {
  // ❌ Playwright span exists in Jaeger, but the service spans are separate traces
  const res = await request.post("/api/orders", {
    data: { items: ["abc-123"] },
  });
  expect(res.ok()).toBe(true);
  // ❌ No visibility into how many items were processed, how long it took
});
```

**Correct (trace propagation + custom metrics + span instrumentation):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  reporter: [["@playwright-labs/reporter-otel", { host: "localhost", port: 4318 }]],
});
```

```typescript
// fixtures/index.ts — worker SDK + merged fixtures
import { mergeTests, mergeExpects } from "@playwright/test";
import {
  test as otelTest,
  expect as otelExpect,
  startWorkerSdk,
} from "@playwright-labs/fixture-otel";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

const workerOtel = otelTest.extend<{}, { otelWorker: void }>({
  otelWorker: [
    async ({}, use) => {
      // ✅ Runs once per worker — enables zero-config trace propagation
      startWorkerSdk({ instrumentations: [getNodeAutoInstrumentations()] });
      await use();
    },
    { scope: "worker" },
  ],
});

export const test = mergeTests(workerOtel);
export const expect = mergeExpects(otelExpect);
```

```typescript
// tests/checkout.spec.ts
import { test, expect } from "../fixtures";
import { withSpan } from "@playwright-labs/fixture-otel";

test("checkout with full observability", async ({
  page,
  request,
  useTraceparent,
  useCounter,
  useHistogram,
  useSpan,
}) => {
  // ✅ All HTTP calls in this test share one traceId with Playwright's test span
  const { traceparent, traceId } = useTraceparent();
  console.log("Trace:", `http://localhost:16686/trace/${traceId}`);

  // ✅ Business metrics
  const apiCalls  = useCounter("checkout_api_calls", { unit: "calls" });
  const pageLoads = useHistogram("page_load_ms", { unit: "ms" });

  // ✅ Wrapping test.step in withSpan: visible in both Trace Viewer and Jaeger
  await test.step("load cart", () =>
    withSpan("cart.load", async (span) => {
      const start = Date.now();
      await page.goto("/cart");
      const elapsed = Date.now() - start;

      span.setAttribute("cart.url", "/cart");
      pageLoads.record(elapsed, { route: "/cart" });
    }),
  );

  // ✅ Named span for the API call — joins the same trace automatically
  const orderSpan = useSpan("order.create");
  const res = await request.post("/api/orders", {
    headers: { traceparent },               // manual propagation for request fixture
    data: { items: ["abc-123", "def-456"] },
  });
  apiCalls.add(1, { endpoint: "/api/orders", status: String(res.status()) });
  orderSpan.setAttribute("order.items", 2);
  orderSpan.setAttribute("order.status", String(res.status()));
  orderSpan.end();

  expect(res).toBeOK();

  await test.step("confirm page", () =>
    withSpan("confirmation.load", async (span) => {
      const start = Date.now();
      await page.waitForURL("/confirmation/**");
      pageLoads.record(Date.now() - start, { route: "/confirmation" });
      span.setAttribute("confirmation.url", page.url());
    }),
  );

  // ✅ Assert instrumentation fired as expected
  expect(apiCalls).toHaveOtelCallCount(1);
  expect(pageLoads).toHaveOtelMinCallCount(2);
  expect(orderSpan).toBeOtelSpanEnded();
});
```

```typescript
// Tracking in-flight requests with UpDownCounter
test("loading indicator during requests", async ({ page, useUpDownCounter }) => {
  const inFlight = useUpDownCounter("http_in_flight");

  // ✅ Tracks concurrent request depth
  page.on("request",         () => inFlight.add(1));
  page.on("requestfinished", () => inFlight.add(-1));
  page.on("requestfailed",   () => inFlight.add(-1));

  await page.goto("/dashboard");
  expect(inFlight).toHaveOtelMinCallCount(1);
});
```

```typescript
// Scope-bound cleanup with the `using` keyword (TypeScript 5.2+)
test("scope-bound spans and metrics", async ({ useCounter, useSpan, page }) => {
  {
    using span = useSpan("hero.load");           // ✅ span.end() on block exit
    await page.goto("/");
    span.setAttribute("hero.variant", "v2");
  }

  {
    using clicks = useCounter("cta_clicks");     // ✅ clicks.collect() on block exit
    await page.click('[data-testid="cta"]');
    clicks.add(1, { button: "hero-cta" });
  }
});
```

```typescript
// withSpan standalone — no fixture, wraps any async utility
import { withSpan } from "@playwright-labs/fixture-otel";

async function fetchUserWithSpan(id: string) {
  return withSpan("db.users.find", async (span) => {
    span.setAttribute("db.table", "users");
    span.setAttribute("user.id", id);
    return db.users.findById(id); // span status = "error" if this throws
  });
}

test("user profile loads", async ({ page, useTraceparent }) => {
  useTraceparent(); // auto-propagates to withSpan via AsyncLocalStorage
  const user = await fetchUserWithSpan("123");
  await page.goto(`/profile/${user.id}`);
  // db.users.find span appears as child of the test span in Jaeger
});
```

## Global Metrics Across Tests

`useGlobalCounter` and `useGlobalHistogram` return a **shared** metric instance — one per metric name for the whole worker process, cached in a module-level registry. Every test that asks for the same name receives the same object, and recorded values accumulate across the tests of that worker. All global metrics are auto-flushed at the teardown of every test that used a global fixture — no manual `collect()` needed.

Two constraints to keep in mind:

- **Per worker, not per run**: each Playwright worker keeps its own registry. The reporter deduplicates instruments by metric name, so data points from all workers still land in a single OTel instrument.
- **One kind per name**: requesting a name already registered as the other kind (e.g. `useGlobalHistogram("x")` after `useGlobalCounter("x")`) throws an error. Options apply only at first creation and are ignored on subsequent calls for the same name.

```typescript
// tests/navigation.spec.ts — url_calls counted across the whole worker run
test("home page", async ({ useGlobalCounter, page }) => {
  const urlCalls = useGlobalCounter("url_calls", { unit: "requests" });

  await page.goto("/home");
  urlCalls.add(1, { url: "/home" });
  // ✅ auto-flushed at teardown — no collect() call needed
});

test("dashboard", async ({ useGlobalCounter, page }) => {
  const urlCalls = useGlobalCounter("url_calls"); // ✅ same shared instance

  await page.goto("/dashboard");
  urlCalls.add(1, { url: "/dashboard" });

  // ✅ values accumulate across tests within the worker
  expect(urlCalls).toHaveOtelCallCount(2);
});
```

```typescript
// Run-wide latency distribution with a shared histogram
test("run-wide latency", async ({ useGlobalHistogram, page }) => {
  const loadTime = useGlobalHistogram("page_load_ms", { unit: "ms" });

  const start = Date.now();
  await page.goto("/dashboard");
  loadTime.record(Date.now() - start, { route: "/dashboard" });
});
```

## Integration with Other Best Practices

- **fixture-global-metrics**: Dedicated rule for the shared global fixtures — registry semantics, naming conventions, and aggregation pitfalls when metrics span multiple tests and workers. Use this rule for per-test instrumentation; follow `fixture-global-metrics` when metrics must accumulate across a run.

Reference: [@playwright-labs/fixture-otel](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-otel)
