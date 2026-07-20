# @playwright-labs/reporter-otel

OpenTelemetry reporter for [Playwright](https://playwright.dev). Sends test traces and metrics to any OTLP-compatible backend — Jaeger, Grafana Tempo, Prometheus (via OTel Collector), Datadog, and more.

## Packages

This feature is split across two packages:

| Package | Description |
|---|---|
| **`@playwright-labs/reporter-otel`** | Playwright reporter — exports built-in traces and metrics |
| **`@playwright-labs/fixture-otel`** | `test` and `expect` extensions — `useCounter`, `useHistogram`, `useSpan`, custom matchers |

Install only what you need:

```bash
# Reporter only (traces + built-in metrics)
npm install @playwright-labs/reporter-otel

# Reporter + custom fixture support
npm install @playwright-labs/reporter-otel @playwright-labs/fixture-otel
```

## Features

- Exports **distributed traces** — every test and step becomes a span visible in Jaeger / Tempo
- Exports **built-in Playwright metrics** — results, durations, retries, attachments, errors
- Captures **browser and project metadata** — browser name, channel, viewport, locale, headless mode
- Captures **host identity** — username, hostname, IP address, OS platform
- Monitors **Node.js process internals** — heap, RSS, CPU
- **Trace propagation** via `useTraceparent` — generate a single W3C `traceparent` per test and forward it to every downstream service call, so Playwright spans and service spans appear in the same trace
- **Custom metrics** via `@playwright-labs/fixture-otel` — `Counter`, `Histogram`, `UpDownCounter`
- **Custom spans** via `useSpan` fixture — child spans nested under the test span
- **Custom expect matchers** — `toBeOtelMetricCollected`, `toHaveOtelCallCount`, `toBeOtelSpanEnded`
- `Symbol.dispose` support — use `using` for deterministic metric/span cleanup
- Configurable OTEL collector endpoint, auth, headers, and metric prefix

## Requirements

- Playwright >= 1.13.0
- Node.js >= 18
- An OpenTelemetry Collector with OTLP/HTTP receiver (default port `4318`)

## Setup

### 1. Configure the reporter

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { type OtelReporterOptions } from "@playwright-labs/reporter-otel";

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-otel",
      {
        host: "localhost",
        port: 4318,
      } satisfies OtelReporterOptions,
    ],
  ],
});
```

### 2. (Optional) Add custom metrics and spans

Install `@playwright-labs/fixture-otel` and import its extended `test` and `expect`:

```typescript
// tests/fixtures.ts — re-export for your test files
export { test, expect } from "@playwright-labs/fixture-otel";
```

Or extend your own fixtures:

```typescript
import { test as otelTest } from "@playwright-labs/fixture-otel";
import { type MyFixtures, myFixtures } from "./my-fixtures";

export const test = otelTest.extend<MyFixtures>(myFixtures);
export { expect } from "@playwright-labs/fixture-otel";
```

## Configuration

All options are optional.

| Option | Type | Default | Description |
|---|---|---|---|
| `host` | `string` | `'localhost'` | OTEL collector hostname |
| `port` | `number` | `4318` | OTEL collector port (OTLP/HTTP) |
| `protocol` | `'http' \| 'https'` | `'http'` | Connection protocol |
| `headers` | `Record<string, string>` | `{}` | Extra HTTP headers (API keys, tenant IDs) |
| `auth.username` | `string` | — | Basic auth username |
| `auth.password` | `string` | — | Basic auth password |
| `prefix` | `string` | `'pw_'` | Prefix added to all built-in metric names |
| `resourceAttributes` | `Record<string, string \| number \| boolean>` | `{}` | Extra OTel resource attributes |
| `env` | `Record<string, string \| undefined>` | `{}` | Env vars exposed as `env.<key>` resource attributes |
| `exportIntervalMillis` | `number` | `60000` | How often to push metrics (ms); a flush always runs on exit |

### Examples

**Remote collector with auth:**

```typescript
export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-otel",
      {
        host: "otel-collector.internal",
        port: 4318,
        protocol: "https",
        auth: {
          username: process.env.OTEL_USERNAME,
          password: process.env.OTEL_PASSWORD,
        },
        headers: { "X-Scope-OrgID": "my-team" },
      },
    ],
  ],
});
```

**With CI metadata:**

```typescript
export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-otel",
      {
        host: "localhost",
        port: 4318,
        prefix: "e2e_",
        resourceAttributes: {
          "deployment.environment": process.env.ENVIRONMENT ?? "local",
          "service.version": process.env.APP_VERSION ?? "0.0.0",
        },
        env: {
          CI: process.env.CI,
          BUILD_ID: process.env.BUILD_ID,
          BRANCH: process.env.GIT_BRANCH,
        },
      },
    ],
  ],
});
```

**Grafana Cloud OTLP endpoint:**

```typescript
export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-otel",
      {
        host: "otlp-gateway-prod-eu-west-0.grafana.net",
        port: 443,
        protocol: "https",
        auth: {
          username: process.env.GRAFANA_INSTANCE_ID,
          password: process.env.GRAFANA_API_KEY,
        },
      },
    ],
  ],
});
```

## Built-in Metrics

All metric names are prefixed with `prefix` (default `pw_`).  
The OTel Collector's Prometheus exporter appends a unit suffix: `ms` → `_milliseconds`, `bytes` → `_bytes`, `us` → `_microseconds`.

| Metric (OTel name) | Prometheus name | Type | Attributes |
|---|---|---|---|
| `pw_tests_total` | `pw_tests_total` | Counter | `test.status`, `test.result`, `test.suite`, `test.project`, `browser.name`, `browser.channel`, `browser.headless`, `browser.viewport`, `browser.locale` |
| `pw_test_duration` | `pw_test_duration_milliseconds_bucket/sum/count` | Histogram (ms) | same as above |
| `pw_test_retries` | `pw_test_retries_total` | Counter | `test.suite` |
| `pw_test_attachment_count` | `pw_test_attachment_count_total` | Counter | `attachment.content_type` |
| `pw_test_attachment_size` | `pw_test_attachment_size_bytes_bucket/sum/count` | Histogram (bytes) | — |
| `pw_test_error_count` | `pw_test_error_count_total` | Counter | `error.location`, `error.message` |
| `pw_test_step_count` | `pw_test_step_count_total` | Counter | `test.step.category`, `test.suite`, `test.project`, `browser.name`, `browser.channel`, `browser.headless`, `browser.viewport`, `browser.locale` |
| `pw_test_step_duration` | `pw_test_step_duration_milliseconds_bucket/sum/count` | Histogram (ms) | same as above |
| `pw_test_annotation_count` | `pw_test_annotation_count_total` | Counter | `annotation.type`, `test.suite` |
| `pw_run_duration` | `pw_run_duration_milliseconds_bucket/sum/count` | Histogram (ms) | — |
| `pw_process_memory_heap_used` | `pw_process_memory_heap_used_bytes` | Gauge | — |
| `pw_process_memory_heap_total` | `pw_process_memory_heap_total_bytes` | Gauge | — |
| `pw_process_memory_rss` | `pw_process_memory_rss_bytes` | Gauge | — |
| `pw_os_memory_free` | `pw_os_memory_free_bytes` | Gauge | — |
| `pw_process_cpu_user` | `pw_process_cpu_user_microseconds` | Gauge | — |
| `pw_process_cpu_system` | `pw_process_cpu_system_microseconds` | Gauge | — |

### Resource attributes (on every signal)

The reporter attaches these as OTel resource attributes (available in `target_info` in Prometheus):

| Attribute | Value |
|---|---|
| `host.user` | OS username (`os.userInfo().username`) |
| `host.name` | Machine hostname |
| `host.ip` | First non-loopback IPv4 address |
| `os.platform` | `darwin`, `linux`, `win32`, … |
| `os.arch` | CPU architecture |
| `playwright.workers` | Number of workers |
| `playwright.config_file` | Path to `playwright.config.ts` |
| `process.runtime.name` | Detected runtime: `nodejs`, `bun`, or `deno` (via `process.versions`) |
| `process.runtime.version` | Version of the detected runtime |
| `process.runtime.versions.*` | Full runtime component versions (`process.runtime.versions.node`, `.v8`, `.openssl`, …; `.bun` under Bun, `.deno` under Deno) |

## Traces

Every test produces a root span. Every Playwright step produces a child span.  
Additional spans from `useSpan` appear as further children of the test span.

> **Implementation note**: the test span is created at the end of the test (not at `onTestBegin`), so that annotations pushed during the test — including `pw_otel.traceparent` — are available when the span context is resolved. All timing is preserved: the span's `startTime` is still set to when the test began.

### Test span attributes

| Attribute | Description |
|---|---|
| `test.case.name` | Test title |
| `test.suite.name` | Describe block name |
| `test.case.result.status` | `pass` or `fail` |
| `code.filepath` | Source file |
| `code.lineno` | Source line |
| `test.id` | Playwright test ID |
| `test.status` | `passed`, `failed`, `timedOut`, `skipped`, … |
| `test.duration_ms` | Duration in milliseconds |
| `test.retry` | Retry attempt number |
| `test.project` | Playwright project name |
| `browser.name` | `chromium`, `firefox`, `webkit` |
| `browser.channel` | `chrome`, `msedge`, or empty |
| `browser.headless` | `"true"` / `"false"` |
| `browser.viewport` | e.g. `"1280x720"` |
| `browser.locale` | e.g. `"en-US"` |

### Propagating the trace ID to downstream services

The `useTraceparent` fixture from `@playwright-labs/fixture-otel` gives every test a single W3C
[`traceparent`](https://www.w3.org/TR/trace-context/) that is shared by the reporter's test span
and all spans emitted by the services the test calls.

It supports **two modes simultaneously** — automatic and manual — so you can mix them freely in
the same test.

#### Automatic propagation (no manual headers)

When `startWorkerSdk()` is called in the worker, the fixture activates the traceparent as the OTel
`AsyncLocalStorage` context for the entire test.  Every library instrumented by OpenTelemetry
(`node:http`, global `fetch`, gRPC, database clients, …) picks it up automatically — no manual
header injection needed.

**Step 1 — add a worker-scoped fixture that calls `startWorkerSdk`:**

```typescript
// fixtures.ts
import { test as baseTest } from "@playwright-labs/fixture-otel";
import { startWorkerSdk } from "@playwright-labs/fixture-otel";
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

`startWorkerSdk` is a singleton — safe to call multiple times. It reads the OTLP endpoint from
the env var set by the reporter (`PLAYWRIGHT_OTEL_BASE_URL`) and exits silently when the reporter
is not running.

**Step 2 — add `useTraceparent` to any test:**

```typescript
import { test } from "@playwright-labs/fixture-otel";

// No extra setup needed — all fetch/http calls are auto-instrumented.
test("checkout", async ({ useTraceparent, page }) => {
  useTraceparent(); // activates the OTel context; return value optional here
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Buy" }).click();
  // Every fetch and http.request made by the app shares the same traceId.
});
```

#### Manual propagation

For clients that are not auto-instrumented (Playwright's `request` fixture, custom `fetch` wrappers,
non-Node runtimes), call `useTraceparent()` to get the header value and inject it yourself:

```typescript
test("checkout API", async ({ useTraceparent, request }) => {
  const { traceparent, traceId } = useTraceparent();

  await request.post("/api/order", { headers: { traceparent } });
  await request.get("/api/order/latest", { headers: { traceparent } });

  console.log("trace:", traceId); // same ID visible in Jaeger for all spans
});
```

Both modes are fully composable — the same traceparent value is used whether you inject it
manually or it is propagated automatically.

#### `Traceparent` object

| Property | Type | Description |
|---|---|---|
| `traceId` | `string` | 32-char lowercase hex trace ID |
| `spanId` | `string` | 16-char lowercase hex parent span ID |
| `traceparent` | `string` | Full W3C header value: `00-{traceId}-{spanId}-01` |

### Forwarding annotations as span attributes

Add `pw_otel.`-prefixed annotations inside a test to attach custom attributes to the test span:

```typescript
test("checkout flow", async ({ page }) => {
  test.info().annotations.push(
    { type: "pw_otel.feature", description: "checkout" },
    { type: "pw_otel.team",    description: "platform" },
  );
  // span attributes: { feature: 'checkout', team: 'platform' }
});
```

Use the `annotationLabel` helper to avoid typos:

```typescript
import { annotationLabel } from "@playwright-labs/reporter-otel";

test.info().annotations.push({
  type: annotationLabel("feature"),
  description: "checkout",
});
```

## Custom Fixtures (`@playwright-labs/fixture-otel`)

Install the package and import from it:

```bash
npm install @playwright-labs/fixture-otel
```

```typescript
import { test, expect } from "@playwright-labs/fixture-otel";
```

### Counter

```typescript
test("track API calls", async ({ useCounter, page }) => {
  const requests = useCounter("api_requests", { unit: "requests" });

  await page.goto("/users");
  requests.add(1, { endpoint: "/users", status: "200" });

  await page.goto("/orders");
  requests.add(1, { endpoint: "/orders", status: "200" });

  expect(requests).toHaveOtelCallCount(2);
  // automatically flushed to reporter after the test
});
```

### Histogram

```typescript
test("track page load latency", async ({ useHistogram, page }) => {
  const duration = useHistogram("page_load_ms", { unit: "ms" });

  const start = Date.now();
  await page.goto("/dashboard");
  duration.record(Date.now() - start, { route: "/dashboard" });

  expect(duration).toBeOtelMetricCollected();
});
```

### UpDownCounter

```typescript
test("track in-flight requests", async ({ useUpDownCounter, page }) => {
  const inFlight = useUpDownCounter("http_in_flight");

  page.on("request",        () => inFlight.add(1));
  page.on("requestfinished",() => inFlight.add(-1));
  page.on("requestfailed",  () => inFlight.add(-1));

  await page.goto("/dashboard");
  expect(inFlight).toHaveOtelMinCallCount(1);
});
```

### useTraceparent — W3C trace propagation

Generates a W3C `traceparent` at the start of the test, activates it as the OTel context for the
test duration, and registers it as the `pw_otel.traceparent` annotation so the reporter's test span
joins the same trace.

**Automatic** — with `startWorkerSdk()` running in the worker, all instrumented code propagates
it without any manual work:

```typescript
test("checkout", async ({ useTraceparent, page }) => {
  useTraceparent(); // activates context — return value optional
  await page.goto("/checkout");
  // fetch/http auto-instrumented spans share the same traceId automatically
});
```

**Manual** — get the header value and inject it yourself:

```typescript
test("order API", async ({ useTraceparent, request }) => {
  const { traceparent } = useTraceparent();
  await request.post("/api/orders", { headers: { traceparent } });
});
```

Calling `useTraceparent()` multiple times in the same test returns the **same object** — the OTel context and annotation are set up once at fixture initialisation.

### useSpan — custom child spans

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
test("simulate timeout", async ({ useSpan }) => {
  const span = useSpan("db.query");
  span.setStatus("error", "Connection timed out after 5000ms");
  span.end();
});
```

### `using` keyword — scope-bound lifecycle

Both metrics and spans implement `Symbol.dispose`, so they work with the TypeScript 5.2+ `using` keyword:

```typescript
test("scope-bound metric", async ({ useCounter, useSpan, page }) => {
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

### `withSpan` — callback-based span helper

`withSpan` is a standalone function (no fixture required) that wraps a synchronous or async callback in an OTel span.  The span is created before the callback runs and ended automatically when it completes — whether it resolves or throws.

```typescript
import { withSpan } from "@playwright-labs/fixture-otel";
```

#### Pairing with `test.step`

Using both together gives visibility in two places simultaneously — Playwright Trace Viewer (steps) and Jaeger / Tempo (spans):

```typescript
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

#### Standalone usage (without `test.step`)

```typescript
const user = await withSpan("db.users.find", async (span) => {
  span.setAttribute("db.table", "users");
  return db.findById(userId);
});
```

#### Error handling

If the callback throws or rejects, the span status is set to `"error"` with the error message, then the span is ended and the error re-thrown:

```typescript
// Span status = "error", message = "HTTP 500 Internal Server Error"
await withSpan("api.orders", async (span) => {
  const res = await fetch("/api/orders");
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
});
```

## Custom Expect Matchers

Available when importing `expect` from `@playwright-labs/fixture-otel`:

### `toBeOtelMetricCollected()`

Asserts the metric was recorded at least once and `collect()` was called.

```typescript
const counter = useCounter("http_requests");
counter.add(1);
expect(counter).toBeOtelMetricCollected();
```

### `toHaveOtelCallCount(n)`

Asserts the exact number of times a value was recorded.

```typescript
counter.add(1);
counter.add(1);
counter.add(1);
expect(counter).toHaveOtelCallCount(3);
```

### `toHaveOtelMinCallCount(min)`

Asserts the metric was recorded at least `min` times.

```typescript
expect(counter).toHaveOtelMinCallCount(2);
```

### `toBeOtelSpanEnded()`

Asserts that a `useSpan` span has been ended.

```typescript
const span = useSpan("my.operation");
span.end();
expect(span).toBeOtelSpanEnded();
```

## How Custom Metrics and Spans Work

The fixture system uses a **stdout event bridge** between Playwright workers and the reporter process:

1. When `collect()` is called (manually, on fixture teardown, or when a `using` block exits), the metric class serializes its data points as a JSON line prefixed with `__pw_otel__` and writes it to `process.stdout`.
2. When `span.end()` is called, the Span serializes itself the same way.
3. The reporter's `onStdOut` hook intercepts these lines and records them with the shared OTel SDK — metrics via the `Meter`, spans as child spans of the current test span.

This design works seamlessly across Playwright's multi-worker architecture without additional network setup.

## E2E Example (`example/`)

The package includes a fully wired example under `packages/reporter-otel/example/` with a Docker Compose stack:

| Service | Port | Purpose |
|---|---|---|
| `otel-collector` | `4318` OTLP/HTTP, `8889` Prometheus metrics | Receives all traces and metrics |
| `jaeger` | `16686` UI, `4317` OTLP/gRPC | Stores and visualises traces |
| `prometheus` | `9090` | Scrapes and stores metrics |
| `grafana` | `3000` | Pre-configured dashboards |

### Start the stack

```bash
cd packages/reporter-otel/example
docker compose up -d --wait
```

### Run the example

```bash
pnpm test:e2e
```

This runs three Playwright projects:

| Project | File | Purpose |
|---|---|---|
| `generate` | `tests/sample.spec.ts` | Emits OTel traces + custom metrics |
| `verify` | `tests/verify.spec.ts` | Queries backends and asserts data arrived |
| `demo` | `tests/edge-cases.spec.ts` | Intentional failures, timeouts, and retries — produces realistic fail/retry metrics in Grafana |

### Open the UIs

| URL | Service |
|---|---|
| http://localhost:3000 | Grafana (dashboards: *Playwright OTel — Base*, *Per User*) |
| http://localhost:16686 | Jaeger — select service `playwright` |
| http://localhost:9090 | Prometheus |
| http://localhost:8889/metrics | Raw OTel Collector scrape endpoint |

### Tear down

```bash
docker compose down --remove-orphans
```

## Useful PromQL Queries

```promql
# Tests by result
sum by (test_result) (pw_tests_total)

# Pass rate
100 * sum(pw_tests_total{test_result="pass"}) / sum(pw_tests_total)

# 95th percentile test duration
histogram_quantile(0.95, sum by (le) (rate(pw_test_duration_milliseconds_bucket[5m])))

# Average test duration in ms
sum(pw_test_duration_milliseconds_sum) / sum(pw_test_duration_milliseconds_count)

# Retries
sum(pw_test_retries_total)

# Tests by browser
sum by (browser_name) (pw_tests_total)

# Tests by project
sum by (test_project) (pw_tests_total)

# Heap memory in MB
pw_process_memory_heap_used_bytes / 1024 / 1024
```

## TypeScript

All types are fully exported:

```typescript
import type {
  OtelReporterOptions,
} from "@playwright-labs/reporter-otel";

// parseTraceparent is exported for consumers who need to inspect a traceparent
// string outside of the reporter lifecycle:
import { parseTraceparent, TRACEPARENT_ANNOTATION } from "@playwright-labs/reporter-otel";

// From the fixture package:
import type {
  OtelFixture,
  Traceparent,
  WorkerSdkOptions,
  Counter,
  Histogram,
  UpDownCounter,
  Span,
  OtelMatchers,
} from "@playwright-labs/fixture-otel";

// Value exports:
import { withSpan, startWorkerSdk, TRACEPARENT_ANNOTATION } from "@playwright-labs/fixture-otel";
```

## License

MIT
