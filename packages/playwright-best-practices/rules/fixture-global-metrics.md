---
title: Reuse Global Metrics Across Tests with useGlobalCounter and useGlobalHistogram
impact: MEDIUM
impactDescription: aggregates run-wide counters and latency distributions across tests without manual bookkeeping
tags: global metrics, counter, histogram, fixtures, otel, prometheus, accumulation, worker
---

## Reuse Global Metrics Across Tests with useGlobalCounter and useGlobalHistogram

**Impact: MEDIUM (aggregates run-wide counters and latency distributions across tests without manual bookkeeping)**

Per-test fixtures like `useCounter` / `useHistogram` (fixture-otel) or `useCounterMetric` / `useGaugeMetric` (fixture-prometheus) create a fresh metric for every test — values die with the test. The global fixtures `useGlobalCounter` and `useGlobalHistogram` return a **shared instance** cached in a module-level registry keyed by `${kind}:${name}`: every test in the same worker that asks for the same name receives the **same object**, and recorded values accumulate across the whole run. Use them for cross-test aggregates — total URL calls, run-wide latency distributions, retry counts across the suite — instead of re-implementing accumulation with module-level variables.

## When to Use

- **Use useGlobalCounter when**: Counting events across the whole run — page/URL calls, API requests, retries triggered by any test
- **Use useGlobalHistogram when**: Building a latency or size distribution over many tests — every `page.goto` duration in the suite landing in one histogram
- **Use per-test fixtures instead when**: A value must be isolated to one test — call counts asserted per test, per-test latency, anything you would not want another test's data to pollute
- **Consider alternatives when**: You need run-wide totals across *all* workers — global metrics are per-worker, so query the backend (Prometheus/Grafana) and sum by metric name instead of reading one counter in-process
- **Identical API in both stacks**: `@playwright-labs/fixture-otel` (with `@playwright-labs/reporter-otel`) and `@playwright-labs/fixture-prometheus` (with `@playwright-labs/reporter-prometheus-remote-write`) expose the same `useGlobalCounter` / `useGlobalHistogram` fixtures with the same semantics

## Guidelines

### Do

- Request the same global metric by name from as many tests as need it — the registry guarantees they share one instance per worker
- Pass `options` (OTel stack) or `labels` / `buckets` (Prometheus stack) at the first call site and treat them as the canonical configuration for that metric name
- Record with low-cardinality attributes — `url`, `route`, `endpoint` — never per-test unique IDs
- Rely on the automatic flush: every test that used a global fixture triggers `collect()` on all registered global metrics at teardown
- Query the backend for run-wide totals — the reporter deduplicates instruments by metric name, so data points from all workers land in a single instrument

### Don't

- Don't request the same name with the other kind — `useGlobalHistogram("x")` after `useGlobalCounter("x")` throws `Global metric "x" is already registered as a counter`
- Don't pass options on later calls expecting them to merge or override — options apply only at first creation and are silently ignored afterwards
- Don't call `collect()` to "reset" a global metric between tests — `collect()` drains and emits, it does not zero the value; use a per-test fixture when you need isolation
- Don't expect one counter to span the whole run when `workers > 1` — each worker is a separate process with its own registry, so N workers produce N independent instances
- Don't use global metrics for assertions about a single test's behavior — accumulation makes pass/fail depend on test execution order within the worker

### Tool Usage Patterns

- **Install (OTel)**: `npm install @playwright-labs/fixture-otel @playwright-labs/reporter-otel`
- **Install (Prometheus)**: `npm install @playwright-labs/fixture-prometheus @playwright-labs/reporter-prometheus-remote-write`
- **OTel fixtures**: `useGlobalCounter(name, options?)` → `Counter.add(n, attributes?)`; `useGlobalHistogram(name, options?)` → `Histogram.record(value, attributes?)`
- **Prometheus fixtures**: `useGlobalCounter(name, labels?)` → `Counter.inc()` / `Counter.inc(n)`; `useGlobalHistogram(name, { buckets?, labels? })` → `Histogram.observe(value)`
- **Registry key**: `${kind}:${name}` — kind and name together identify the shared instance
- **Matchers (OTel)**: `toHaveOtelCallCount(n)` works on global counters and sees the accumulated count across tests in the worker

## Edge Cases and Constraints

### Limitations

- **Per-worker scope**: Playwright runs each worker in its own process. "Global" means global to one worker process — with 4 workers, `url_calls` exists as 4 independent counters, each accumulating only the tests its worker executed
- **Options are frozen at creation**: the first test to request a name decides its `unit`, `labels`, and `buckets`; a later test passing different options gets the original instance with no warning
- **Kind collision is fatal**: requesting an already-registered name with the other kind throws immediately, failing that test

### Edge Cases

1. **Test with no new recordings**: Flush drains, so a global metric untouched since the last flush is a no-op at teardown — no empty data points, no double emission. Manual mid-test `collect()` calls remain safe for the same reason.
2. **Same name, two spec files**: Both files get the same instance *within one worker*; if Playwright schedules them on different workers, each worker accumulates its own value. The backend still aggregates by metric name.
3. **First creation inside a shared setup helper**: If a `beforeEach` or custom fixture creates the metric with options, those options win for the whole worker — put canonical options in the earliest shared call site, not in individual tests.

### What Breaks If Ignored

- **Recreating a per-test metric per test for a run-wide number**: every test emits its own isolated series — totals must be reconstructed by hand, and per-test names/labels often diverge silently
- **Module-level `let total = 0` accumulation**: works until sharding or retries change scheduling, survives nothing outside the process, and never reaches the metrics backend
- **Asserting exact counts on a global metric**: `expect(urlCalls).toHaveOtelCallCount(1)` in the second test fails because the first test already recorded — assertions on globals must expect accumulated values

**Incorrect (per-test fixture used for a run-wide aggregate):**

```typescript
import { test, expect } from "@playwright-labs/fixture-otel";

test("home page", async ({ useCounter, page }) => {
  // ❌ Fresh counter per test — the suite-wide total is lost
  const urlCalls = useCounter("url_calls", { unit: "requests" });

  await page.goto("/home");
  urlCalls.add(1, { url: "/home" });

  expect(urlCalls).toHaveOtelCallCount(1);
});

test("dashboard", async ({ useCounter, page }) => {
  // ❌ Another isolated instance — starts from zero again
  const urlCalls = useCounter("url_calls", { unit: "requests" });

  await page.goto("/dashboard");
  urlCalls.add(1, { url: "/dashboard" });

  // There is no way to know how many URL calls the run made in total.
  expect(urlCalls).toHaveOtelCallCount(1);
});
```

**Why this fails:**
- Each test creates and flushes its own counter — no cross-test total exists anywhere
- The two `url_calls` series are independent; the backend sees two isolated points, not an accumulating signal
- Any "how many pages did the whole suite hit?" question requires manual post-processing of every per-test emission

**Correct (global counter accumulating across tests):**

```typescript
import { test, expect } from "@playwright-labs/fixture-otel";

test("home page", async ({ useGlobalCounter, page }) => {
  // ✅ First creation — options apply here and only here
  const urlCalls = useGlobalCounter("url_calls", { unit: "requests" });

  await page.goto("/home");
  urlCalls.add(1, { url: "/home" });
}); // flushed automatically at teardown — no manual collect() needed

test("dashboard", async ({ useGlobalCounter, page }) => {
  // ✅ Same instance as the previous test — value carries over
  const urlCalls = useGlobalCounter("url_calls");

  await page.goto("/dashboard");
  urlCalls.add(1, { url: "/dashboard" });

  expect(urlCalls).toHaveOtelCallCount(2); // accumulated across both tests
});
```

**Why this works:**
- The registry returns the same object for `"counter:url_calls"` to every test in the worker — additions accumulate
- Teardown flush emits the running total after each test that used a global fixture, with zero bookkeeping in test code
- The reporter deduplicates instruments by metric name, so data from all workers lands in one `url_calls` instrument for backend-side run totals

The same pattern in the Prometheus stack — note the different method names:

```typescript
import { test } from "@playwright-labs/fixture-prometheus";

test("home page", async ({ useGlobalCounter, page }) => {
  const urlCalls = useGlobalCounter("url_calls");
  await page.goto("/");
  urlCalls.inc();
});

test("users page", async ({ useGlobalCounter, page }) => {
  const urlCalls = useGlobalCounter("url_calls"); // same instance
  await page.goto("/users");
  urlCalls.inc(); // now counts 2 page visits across both tests
});
```

## Common Mistakes

### Mistake 1: Requesting the same name with the other kind

```typescript
test("a", async ({ useGlobalCounter, page }) => {
  useGlobalCounter("page_load_ms").add(1);
});

test("b", async ({ useGlobalHistogram, page }) => {
  // ❌ Throws: Global metric "page_load_ms" is already registered as a counter
  const loadTime = useGlobalHistogram("page_load_ms", { unit: "ms" });
});
```

**Why this is wrong**: The registry keys instances by `${kind}:${name}` but enforces one kind per name. A counter and a histogram cannot share a name in the same worker.

**How to fix**:

```typescript
test("b", async ({ useGlobalHistogram, page }) => {
  // ✅ Distinct name per kind — or reuse the existing kind for that name
  const loadTime = useGlobalHistogram("page_load_duration_ms", { unit: "ms" });
  const start = Date.now();
  await page.goto("/dashboard");
  loadTime.record(Date.now() - start, { route: "/dashboard" });
});
```

### Mistake 2: Expecting later options to apply

```typescript
test("a", async ({ useGlobalCounter, page }) => {
  // First creation — no unit configured
  useGlobalCounter("url_calls").add(1);
});

test("b", async ({ useGlobalCounter, page }) => {
  // ❌ { unit: "requests" } is silently ignored — the metric already exists
  const urlCalls = useGlobalCounter("url_calls", { unit: "requests" });
});
```

**Why this is wrong**: Options apply only at first creation and are ignored on subsequent calls for the same name. Test "b" reads as if it configures the metric, but the configuration depends on which test happens to run first in the worker.

**How to fix**:

```typescript
// fixtures/global-metrics.ts — single canonical creation point
import { test as base } from "@playwright-labs/fixture-otel";

export const test = base.extend<{ urlCalls: void }>({
  urlCalls: [
    async ({ useGlobalCounter }, use) => {
      // ✅ Canonical options, created before any test records
      useGlobalCounter("url_calls", { unit: "requests" });
      await use();
    },
    { auto: true },
  ],
});
```

```typescript
test("dashboard", async ({ useGlobalCounter, page }) => {
  const urlCalls = useGlobalCounter("url_calls"); // options already settled
  await page.goto("/dashboard");
  urlCalls.add(1, { url: "/dashboard" });
});
```

The Prometheus equivalent — later `buckets` / `labels` are likewise ignored:

```typescript
test("a", async ({ useGlobalHistogram, page }) => {
  // ✅ Buckets decided at first creation; later calls cannot change them
  const loadTime = useGlobalHistogram("page_load_seconds", {
    buckets: [0.1, 0.5, 1, 2.5, 5],
  });
  const start = Date.now();
  await page.goto("/dashboard");
  loadTime.observe((Date.now() - start) / 1000);
});
```

### Mistake 3: Asserting per-test values on a global metric

```typescript
test("checkout", async ({ useGlobalCounter, page }) => {
  const apiCalls = useGlobalCounter("api_calls");
  await page.goto("/checkout");
  apiCalls.add(1, { endpoint: "/api/orders" });

  // ❌ Fails whenever an earlier test in this worker already recorded to api_calls
  expect(apiCalls).toHaveOtelCallCount(1);
});
```

**Why this is wrong**: Global metrics accumulate. An exact-count assertion makes the test's outcome depend on which tests ran before it in the same worker — order-dependent, and breaks when tests are added, removed, or resharded.

**How to fix**:

```typescript
test("checkout", async ({ useCounter, page }) => {
  // ✅ Per-test fixture for per-test assertions — isolated value
  const apiCalls = useCounter("api_calls", { unit: "calls" });
  await page.goto("/checkout");
  apiCalls.add(1, { endpoint: "/api/orders" });

  expect(apiCalls).toHaveOtelCallCount(1); // exactly this test's activity
});
```

## Advanced Patterns

Combine a global counter (how often) with a global histogram (how slow) to get a suite-level performance profile from ordinary navigation code:

```typescript
import { test, type Counter, type Histogram } from "@playwright-labs/fixture-otel";
import type { Page } from "@playwright/test";

async function visit(
  page: Page,
  url: string,
  urlCalls: Counter,
  loadTime: Histogram,
) {
  const start = Date.now();
  await page.goto(url);
  loadTime.record(Date.now() - start, { route: url });
  urlCalls.add(1, { url });
}

test("suite profile — home", async ({ page, useGlobalCounter, useGlobalHistogram }) => {
  const urlCalls = useGlobalCounter("url_calls", { unit: "requests" });
  const loadTime = useGlobalHistogram("page_load_ms", { unit: "ms" });

  await visit(page, "/home", urlCalls, loadTime);
});

test("suite profile — dashboard", async ({ page, useGlobalCounter, useGlobalHistogram }) => {
  const urlCalls = useGlobalCounter("url_calls");
  const loadTime = useGlobalHistogram("page_load_ms");

  await visit(page, "/dashboard", urlCalls, loadTime);
});
```

Once data is in Prometheus (either stack reaches it — via the OTel Collector for fixture-otel, via remote-write for fixture-prometheus), run-wide questions become queries:

```promql
# Total URL calls across the whole run (all workers summed by metric name)
sum(url_calls_total)

# p95 page load across every test that navigated
histogram_quantile(0.95,
  sum by (le) (rate(page_load_ms_bucket[1h]))
)
```

**When to use this pattern**: regression detection at suite level — "did the average page get slower this release?" — where per-test assertions are too noisy and backend trends give the answer for free.

## Integration with Other Best Practices

- **Instrument Tests with Custom OTel Metrics, Spans, and Distributed Trace Propagation**: per-test `useCounter` / `useHistogram` answer "what happened inside this test"; global fixtures answer "what happened across the run". Use both — isolated values for assertions, global values for trends.
- **Export Test Traces and Metrics to OpenTelemetry Backends with reporter-otel**: global metrics require the reporter active in the same process — the stdout bridge silently discards data without it. Add `resourceAttributes` so accumulated series are filterable by branch and environment.
- **Merge Fixtures and Expects**: put canonical global-metric creation (with options) into a shared fixtures module so every spec file imports the same settled configuration.
- **Parallel Test Sharding**: sharding splits workers across machines — global metrics stay per-worker, so always read run-wide totals from the backend (`sum` by metric name), never from in-process state.

Reference: [@playwright-labs/fixture-otel](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-otel) and [@playwright-labs/fixture-prometheus](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-prometheus)
