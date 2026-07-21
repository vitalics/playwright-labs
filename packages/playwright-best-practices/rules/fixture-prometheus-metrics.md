---
title: Instrument Tests with Custom Prometheus Counters, Gauges, and Histograms
impact: MEDIUM
impactDescription: turns test activity into queryable Prometheus metrics for CI dashboards and alerting
tags: prometheus, metrics, counter, gauge, histogram, fixtures, monitoring
---

## Instrument Tests with Custom Prometheus Counters, Gauges, and Histograms

**Impact: MEDIUM (turns test activity into queryable Prometheus metrics for CI dashboards and alerting)**

The `@playwright-labs/reporter-prometheus-remote-write` reporter ships built-in test metrics (durations, counts, step timings). The `@playwright-labs/fixture-prometheus` package adds custom business metrics from inside tests: per-test fixtures `useCounterMetric` / `useGaugeMetric`, and worker-shared `useGlobalCounter` / `useGlobalHistogram`. Under the hood all of them are `@playwright-labs/prometheus-core` primitives (`Counter`, `Gauge`, `Histogram`) that serialize timeseries to stdout on `collect()` — the reporter picks them up and pushes them to Prometheus via remote write. Without the reporter in your config, every metric you record goes nowhere.

## When to Use

- **Use useCounterMetric when**: Counting events inside a single test — API calls made, elements rendered, retries triggered
- **Use useGaugeMetric when**: Tracking a value that goes up and down — in-flight requests, active sessions, items in a cart
- **Use useGlobalCounter / useGlobalHistogram when**: The same metric should accumulate across all tests in a worker — total page visits, suite-wide load-time distribution
- **Use standalone Counter / Gauge / Histogram when**: You need metrics outside test bodies — module scope, helper utilities, worker-scoped fixtures — via `@playwright-labs/prometheus-core` (also re-exported by the reporter)
- **Required for**: Any setup where metrics must actually reach Prometheus — the reporter is not optional, it is the transport

## Guidelines

### Do

- Configure `@playwright-labs/reporter-prometheus-remote-write` in `playwright.config.ts` with `serverUrl` before recording anything — no reporter, no delivery
- Call `.collect()` explicitly on metrics from `useCounterMetric` / `useGaugeMetric` — per-test fixtures are **not** auto-flushed at teardown
- Use the `using` keyword (TypeScript 5.2+) for scope-bound metrics — `Symbol.dispose` calls `collect()` and `reset()` on block exit
- Choose custom histogram `buckets` that match your SLOs (e.g. `[0.1, 0.5, 1, 2.5, 5]` seconds) instead of always accepting `DEFAULT_BUCKETS`
- Keep labels low-cardinality: route names, endpoints, regions — values from a small, bounded set
- Use `useGlobalCounter` / `useGlobalHistogram` for cross-test accumulation — they auto-flush at every test's teardown

### Don't

- Don't assume per-test fixtures flush themselves — an uncollected `useCounterMetric` metric silently vanishes when the test ends
- Don't record metrics without the reporter configured — `collect()` writes JSON events to `process.stdout`, and with nobody parsing them the data is lost
- Don't call `collect()` in a tight loop expecting deltas to accumulate — each call drains pending samples; a call with no new samples is a no-op
- Don't put test-unique values (test IDs, user IDs, timestamps) into labels — high cardinality exhausts the Prometheus label space
- Don't register the same name via both `useGlobalCounter` and `useGlobalHistogram` — it throws `Global metric "<name>" is already registered as a <kind>`
- Don't pass unsorted or empty `buckets` to a `Histogram` — the constructor throws `"buckets" must be a non-empty array of finite numbers in strictly ascending order`

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/fixture-prometheus @playwright-labs/reporter-prometheus-remote-write`
- **Per-test fixtures**: `useCounterMetric(name, labels?)` → `Counter`, `useGaugeMetric(name, labels?)` → `Gauge`
- **Worker-shared fixtures**: `useGlobalCounter(name, labels?)`, `useGlobalHistogram(name, { buckets?, labels? })`
- **Standalone primitives**: `new Counter({ name, ...labels }, initialValue?)`, `new Gauge({ name, ...labels })`, `new Histogram({ name, buckets?, ...labels })` from `@playwright-labs/prometheus-core`
- **Metric API**: `inc(value?)`, `dec(value?)`, `set(value)`, `zero()`, `observe(value)`, `labels(extra)`, `collect()`, `reset()`
- **Reporter options**: `serverUrl` (required, throws if missing), `prefix` (default `pw_`, applied to every metric name), `headers`, `auth.username` / `auth.password`, `labels`, `env`

## Edge Cases and Constraints

### Limitations

- Metrics travel over a **stdout event bridge**: `collect()` writes a newline-terminated single-line JSON event (`{ name: "prometheus-remote-writer", payload }`) per series, and the reporter's `onStdOut` hook parses and pushes them. This requires the reporter to be active in the same Playwright run — standalone use silently discards data.
- `collect()` has **drain semantics**: it flushes only samples recorded since the previous flush. A repeated `collect()` with no new samples writes nothing. This is deliberate — Prometheus 3.x rejects remote-write requests that re-send already-pushed samples ("out of order sample"), which would break the entire batch.
- Sample timestamps are **strictly increasing**: several `inc()` calls within the same millisecond still get distinct timestamps (`Math.max(Date.now(), last + 1)`), because Prometheus keeps only the first sample when several share a timestamp.
- "Global" fixtures are global **per worker process**, not per run. With N workers you get N independent instances of the same metric.
- A `Histogram` is multi-series: one flush emits one stdout event per child counter with pending samples — one per bucket plus `_sum` and `_count`.

### Edge Cases

1. **Histogram composition**: A `Histogram` is a composition of `Counter`s, not a `Metric` subclass: cumulative `${name}_bucket{le="<bound>"}` counters (including `le="+Inf"`), plus `${name}_sum` and `${name}_count`. `observe(value)` increments every bucket whose bound is `>= value` (the `+Inf` bucket always matches), adds `value` to `_sum`, and increments `_count`. Buckets default to `DEFAULT_BUCKETS` (`[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]`). Children are exposed as `histogram.buckets`, `histogram.sum`, `histogram.count`.
2. **Global fixture creation options**: `buckets` / `labels` passed to `useGlobalHistogram` apply only at first creation — later calls with the same name return the cached instance and ignore new options.
3. **Mid-test collect on globals**: Manual `collect()` on a global metric is safe — drain semantics ensure the auto-flush at teardown only emits what is new.

### What Breaks If Ignored

- **Without the reporter**: every `collect()` call writes to stdout and nothing is parsed or pushed — dashboards stay empty with no error anywhere
- **Without collect() on per-test fixtures**: the fixture tears down, the metric is garbage-collected, and the samples never leave the worker
- **Without drain semantics awareness**: re-collecting the same metric "to be safe" emits nothing; conversely, never collecting means samples accumulate in memory until the worker exits
- **Without bucket discipline**: default buckets tuned for seconds make millisecond-scale observations land almost entirely in the first bucket — the histogram becomes useless for latency analysis

**Incorrect (metrics recorded but never shipped):**

```typescript
// playwright.config.ts — ❌ no Prometheus reporter configured
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [["list"]],
});
```

```typescript
// tests/checkout.spec.ts
import { test, expect } from "@playwright-labs/fixture-prometheus";

test("checkout flow", async ({ page, useCounterMetric, useGaugeMetric }) => {
  const apiCalls = useCounterMetric("checkout_api_calls", {
    endpoint: "/api/orders",
  });
  const inFlight = useGaugeMetric("http_in_flight");

  page.on("request", () => inFlight.inc());
  page.on("requestfinished", () => inFlight.dec());

  await page.goto("/checkout");
  apiCalls.inc();
  // ❌ Test ends here: collect() was never called, so the samples stay in the
  // worker's memory. Even if they were collected, no reporter is configured
  // to parse the stdout events — the data is lost either way.
  await expect(page).toHaveURL("/confirmation");
});
```

**Why this fails:**

- Per-test fixtures do not auto-flush — without `collect()` the samples never leave the worker process
- Without `@playwright-labs/reporter-prometheus-remote-write` in the config, stdout events are never parsed or pushed
- The failure is silent: tests pass, no error is logged, and Grafana shows nothing

**Correct (reporter configured, metrics explicitly collected):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { type PrometheusOptions } from "@playwright-labs/reporter-prometheus-remote-write";

export default defineConfig({
  reporter: [
    ["list"],
    [
      "@playwright-labs/reporter-prometheus-remote-write",
      {
        serverUrl: "http://localhost:9090/api/v1/write",
        prefix: "e2e_", // ✅ every metric lands as e2e_<name>
      } satisfies PrometheusOptions,
    ],
  ],
});
```

```typescript
// tests/fixtures.ts — re-export so every spec uses the extended test
export { test, expect } from "@playwright-labs/fixture-prometheus";
```

```typescript
// tests/checkout.spec.ts
import { test, expect } from "./fixtures";

test("checkout flow", async ({ page, useCounterMetric, useGaugeMetric }) => {
  const apiCalls = useCounterMetric("checkout_api_calls", {
    endpoint: "/api/orders", // ✅ low-cardinality label
  });
  const inFlight = useGaugeMetric("http_in_flight");

  page.on("request", () => inFlight.inc());
  page.on("requestfinished", () => inFlight.dec());
  page.on("requestfailed", () => inFlight.dec());

  await page.goto("/checkout");
  apiCalls.inc();

  await expect(page).toHaveURL("/confirmation");

  // ✅ Explicit flush — per-test fixtures are not collected automatically
  apiCalls.labels({ status: "success" }).collect();
  inFlight.collect();
});

// ✅ Scope-bound collection with the `using` keyword (TypeScript 5.2+)
test("hero banner renders", async ({ page, useCounterMetric }) => {
  {
    using renders = useCounterMetric("hero_renders");
    await page.goto("/");
    await expect(page.getByTestId("hero")).toBeVisible();
    renders.inc();
  } // ✅ collect() + reset() called automatically on block exit
});
```

**Why this works:**

- The reporter's `onStdOut` hook intercepts the JSON events from `collect()` and remote-writes them to Prometheus
- Explicit `collect()` (or `using`) guarantees per-test metrics are flushed before the fixture tears down
- The `prefix` option namespaces all metrics, and low-cardinality labels keep queries fast

## Common Mistakes

### Mistake 1: Expecting per-test fixtures to auto-flush

```typescript
test("tracks nothing", async ({ page, useCounterMetric }) => {
  const clicks = useCounterMetric("cta_clicks");
  await page.getByTestId("cta").click();
  clicks.inc();
  // ❌ no collect() — the sample dies with the test
});
```

**Why this is wrong**: Only `useGlobalCounter` / `useGlobalHistogram` auto-flush at teardown. `useCounterMetric` / `useGaugeMetric` require an explicit `collect()`.

**How to fix**:

```typescript
test("tracks clicks", async ({ page, useCounterMetric }) => {
  const clicks = useCounterMetric("cta_clicks", { button: "hero-cta" });
  await page.getByTestId("cta").click();
  clicks.inc();
  clicks.collect(); // ✅ flush before teardown
});
```

### Mistake 2: Installing the fixtures but not the reporter

```typescript
// playwright.config.ts
export default defineConfig({
  reporter: [["html"]], // ❌ metrics are written to stdout and never parsed
});
```

**Why this is wrong**: The fixture system has no network path of its own. `collect()` serializes timeseries as newline-delimited JSON on the worker's stdout; only the reporter's `onStdOut` hook turns them into remote-write requests. Without it, `serverUrl` is never read and nothing is shipped.

**How to fix**:

```typescript
export default defineConfig({
  reporter: [
    ["html"],
    [
      "@playwright-labs/reporter-prometheus-remote-write",
      { serverUrl: "http://localhost:9090/api/v1/write" },
    ],
  ],
});
```

### Mistake 3: High-cardinality labels and invalid buckets

```typescript
test("label explosion", async ({ page, useCounterMetric }) => {
  // ❌ unique value per test run — one new label set per execution
  const orders = useCounterMetric("orders_created", {
    orderId: crypto.randomUUID(),
  });
  await page.goto("/orders/new");
  orders.inc();
  orders.collect();
});

test("bad buckets", async ({ useGlobalHistogram }) => {
  // ❌ not strictly ascending — constructor throws
  const t = useGlobalHistogram("page_load_seconds", { buckets: [1, 0.5, 5] });
  t.observe(0.3);
});
```

**Why this is wrong**: Every distinct label set creates a new timeseries in Prometheus — unique IDs per run exhaust label space and make aggregation impossible. And `Histogram` validates bucket bounds at construction: empty arrays, non-finite values, or non-ascending order all throw.

**How to fix**:

```typescript
test("bounded labels", async ({ page, useCounterMetric }) => {
  // ✅ labels from a small, bounded set
  const orders = useCounterMetric("orders_created", { route: "/orders/new" });
  await page.goto("/orders/new");
  orders.inc();
  orders.collect();
});

test("valid buckets", async ({ useGlobalHistogram }) => {
  // ✅ strictly ascending bounds matched to your SLOs
  const t = useGlobalHistogram("page_load_seconds", {
    buckets: [0.1, 0.5, 1, 2.5, 5],
    labels: { route: "/dashboard" },
  });
  t.observe(0.3);
});
```

## Advanced Patterns

### Standalone metrics in a worker-scoped fixture

Use `@playwright-labs/prometheus-core` primitives directly when metrics must outlive a single test but you want full control over flushing:

```typescript
// fixtures/worker-metrics.ts
import { test as base } from "@playwright/test";
import { Counter, Histogram } from "@playwright-labs/prometheus-core";

export const test = base.extend<
  {},
  { workerMetrics: { apiCalls: Counter; loadTime: Histogram } }
>({
  workerMetrics: [
    async ({}, use) => {
      const apiCalls = new Counter({ name: "api_calls", job: "e2e" });
      const loadTime = new Histogram({
        name: "page_load_seconds",
        buckets: [0.1, 0.5, 1, 2.5, 5],
      });
      await use({ apiCalls, loadTime });
      // ✅ Flush once per worker — drain semantics ship exactly the new samples
      apiCalls.collect();
      loadTime.collect();
    },
    { scope: "worker" },
  ],
});
```

```typescript
// tests/dashboard.spec.ts
import { test } from "../fixtures/worker-metrics";

test("dashboard loads", async ({ page, workerMetrics }) => {
  const start = Date.now();
  await page.goto("/dashboard");
  workerMetrics.loadTime.observe((Date.now() - start) / 1000);
  workerMetrics.apiCalls.inc();
});
```

**When to use this pattern**: You already maintain a custom fixture file and want suite-level aggregation without the `useGlobal*` cache semantics — e.g. different labels per project, or flushing in `afterAll` instead of per-test teardown.

### Suite-wide latency distribution with useGlobalHistogram

```typescript
import { test } from "./fixtures";

test("home page", async ({ page, useGlobalHistogram }) => {
  const loadTime = useGlobalHistogram("page_load_seconds", {
    buckets: [0.1, 0.5, 1, 2.5, 5], // ✅ applies at first creation only
  });
  const start = Date.now();
  await page.goto("/");
  loadTime.observe((Date.now() - start) / 1000);
  // ✅ no collect() needed — auto-flushed at this test's teardown
});

test("users page", async ({ page, useGlobalHistogram }) => {
  const loadTime = useGlobalHistogram("page_load_seconds"); // ✅ same instance
  const start = Date.now();
  await page.goto("/users");
  loadTime.observe((Date.now() - start) / 1000);
});
```

The flush emits the full composition: cumulative `pw_page_load_seconds_bucket{le="0.1"}` … `{le="+Inf"}`, plus `pw_page_load_seconds_sum` and `pw_page_load_seconds_count`. Query it with standard PromQL:

```promql
# p95 page load across the suite
histogram_quantile(0.95,
  sum by (le) (rate(pw_page_load_seconds_bucket[1h]))
)

# average observed load time
sum(pw_page_load_seconds_sum) / sum(pw_page_load_seconds_count)
```

## Integration with Other Best Practices

- **fixture-merge-tests-expects**: Merge `test`/`expect` from `@playwright-labs/fixture-prometheus` with your other extensions via `mergeTests` / `mergeExpects` so every spec file imports from one fixture module
- **parallel-test-isolation**: Global metrics are per-worker — with N workers you get N series distinguished only by their samples; aggregate in PromQL (`sum by (name)`) rather than expecting a single suite-wide value
- **advanced-otel-reporter**: The Prometheus reporter and `reporter-otel` can run side by side in the `reporter` array — use Prometheus for metric dashboards and alerting, OTel traces for per-test debugging
- **Scale considerations**: At 100+ tests, prefer `useGlobalCounter` / `useGlobalHistogram` (one auto-flush per test, drained deltas) over per-test `collect()` storms, and keep every label set bounded

Reference: [@playwright-labs/fixture-prometheus](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-prometheus)
