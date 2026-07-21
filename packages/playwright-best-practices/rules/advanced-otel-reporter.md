---
title: Export Test Traces and Metrics to OpenTelemetry Backends with reporter-otel
impact: MEDIUM
impactDescription: transforms raw test results into queryable time-series metrics and distributed traces for CI observability
tags: opentelemetry, otel, reporter, traces, metrics, jaeger, grafana, prometheus, observability, ci
---

## Export Test Traces and Metrics to OpenTelemetry Backends with reporter-otel

**Impact: MEDIUM (transforms raw test results into queryable time-series metrics and distributed traces for CI observability)**

Playwright's built-in reporter surfaces results as HTML or JSON snapshots. The `@playwright-labs/reporter-otel` package sends every test run as OpenTelemetry traces and metrics to any OTLP-compatible backend — Jaeger, Grafana Tempo, Prometheus, Datadog, Grafana Cloud. Every test becomes a span with step-level children, and built-in metrics track pass rate, duration p95, retries, step counts and durations by category, annotation counts, run wall-clock time, and process memory without any extra code.

## When to Use

- **Use reporter-otel when**: You want long-term test health trends, flakiness dashboards, or Playwright traces in the same system as your service traces
- **Add fixture-otel when**: Individual tests need custom business counters, latency histograms, or need to propagate a `traceparent` into the system under test
- **Use the built-in step and run metrics when**: You need to know where suite time goes — `pw_test_step_count` / `pw_test_step_duration` are recorded for every step (nested included) with a `test.step.category` attribute, `pw_test_annotation_count` tracks tagging by `annotation.type`, and `pw_run_duration` captures wall-clock run time — all with zero code changes
- **Required for**: Teams running CI at scale who need to answer "which tests are getting slower?" or "what's our pass rate over the last 7 days?"

## Guidelines

### Do

- Add `resourceAttributes` with deployment environment and service version — makes dashboards filterable by branch or release
- Pass CI environment variables via `env` option so they appear as span attributes
- Use the `prefix` option to namespace your metrics when sharing a collector with other services
- Set up the full stack (OTel Collector → Jaeger + Prometheus + Grafana) for local development using the provided Docker Compose example
- Query pass rate and duration p95 in Grafana/Prometheus to detect degradation before it becomes a crisis
- Group `pw_test_step_duration` by `test.step.category` (`pw:api`, `expect`, `hook`, `test.step`) to see whether actions, assertions, or hooks dominate suite time before optimizing anything
- Alert on `pw_run_duration` for CI job duration — it is wall-clock per run, so it stays honest under parallel workers where summing per-test durations misleads
- Slice `pw_test_annotation_count` by `annotation.type` to audit tagging discipline across suites (`issue`, `feature`, or custom types)

### Don't

- Don't point Playwright directly at Jaeger or Prometheus — always go through an OTel Collector; it handles buffering, retries, and fan-out
- Don't set `exportIntervalMillis` too low (< 10s) in large parallel runs — it creates unnecessary load on the collector
- Don't skip `satisfies OtelReporterOptions` on the config object — TypeScript type checking prevents misconfigured endpoints from silently dropping data
- Don't use HTTPS without valid certificates unless you set the appropriate Node TLS env vars
- Don't rebuild step, annotation, or run-duration metrics with `fixture-otel` counters — the reporter records them automatically; reserve custom fixtures for business metrics the reporter cannot see

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/reporter-otel`
- **Default endpoint**: `localhost:4318` (OTLP/HTTP) — standard OTel Collector port
- **Backends tested**: Jaeger, Grafana Tempo, Grafana Cloud, Prometheus (via Collector), Datadog OTLP intake
- **Config key options**: `host`, `port`, `protocol`, `headers`, `auth`, `prefix`, `resourceAttributes`, `env`, `exportIntervalMillis`
- **Auto-instrumented metrics (no code required)**: `pw_test_step_count` / `pw_test_step_duration` (attrs `test.step.category`, `test.suite`, `test.project`, `browser.*`), `pw_test_annotation_count` (attrs `annotation.type`, `test.suite`), `pw_run_duration` (run wall-clock, ms histogram recorded at `onEnd`)
- **Runtime resource attributes**: `process.runtime.name` is auto-detected as `nodejs`, `bun`, or `deno` (via `process.versions`); `process.runtime.version` plus full component versions land as `process.runtime.versions.*` (`…versions.node`, `…versions.v8`, `…versions.openssl`, `…versions.bun` under Bun, `…versions.deno` under Deno) — split dashboards by runtime when CI runners are heterogeneous

## Edge Cases and Constraints

### Limitations

- The reporter creates the test span at `onTestEnd` (not `onTestBegin`) — this is intentional so that annotations pushed during the test are available before the span is created. All timing is preserved via explicit `startTime`.
- `fixture-otel` metrics are sent over a stdout bridge (`__pw_otel__` prefix) — they arrive in the reporter's `onStdOut` hook, not through a direct SDK call. This works across worker boundaries but requires the reporter to be active.
- Without the reporter running, `startWorkerSdk()` in `fixture-otel` exits silently — safe for local runs without a collector

### Edge Cases

1. **Grafana Cloud auth**: Use `auth.username` = instance ID, `auth.password` = API key. Protocol must be `https` and port `443`.
2. **Missing spans in Jaeger**: If spans appear in Prometheus metrics but not Jaeger, the collector is routing traces and metrics to different exporters — check collector pipeline config.
3. **High-cardinality attributes**: Adding unique IDs (user IDs, order IDs) to `resourceAttributes` can exhaust Prometheus label space. Use span attributes via `pw_otel.*` annotations for per-test data instead.
4. **Mixed runtimes in CI**: If some runners execute Playwright under Bun or Deno, `process.runtime.name` and `process.runtime.versions.*` (visible in Prometheus `target_info`) tell them apart — filter by runtime before comparing duration trends, because runtimes are not performance-equivalent.

### What Breaks If Ignored

- **Without reporter**: Test results exist only as ephemeral JSON — no trend analysis, no flakiness detection by historical rate
- **Without resourceAttributes**: All spans from all branches land in the same unlabeled bucket — impossible to compare staging vs. main
- **Without OTel Collector**: Pointing directly at Jaeger's OTLP endpoint works but loses the ability to fan-out to Prometheus simultaneously

**Incorrect (no observability, raw JSON only):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["json", { outputFile: "results.json" }], // ❌ ephemeral, not queryable over time
  ],
});
```

**Correct (reporter-otel with full CI enrichment):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { type OtelReporterOptions } from "@playwright-labs/reporter-otel";

export default defineConfig({
  reporter: [
    ["list"],  // keep console output
    [
      "@playwright-labs/reporter-otel",
      {
        host: "localhost",
        port: 4318,
        prefix: "e2e_",
        // ✅ Enriches every metric with deployment context
        resourceAttributes: {
          "deployment.environment": process.env.ENVIRONMENT ?? "local",
          "service.version": process.env.APP_VERSION ?? "0.0.0",
          "service.name": "playwright-e2e",
        },
        // ✅ CI variables become span attributes — queryable in Jaeger
        env: {
          CI: process.env.CI,
          BUILD_ID: process.env.BUILD_ID,
          GIT_BRANCH: process.env.GIT_BRANCH,
          GIT_COMMIT: process.env.GIT_COMMIT,
        },
      } satisfies OtelReporterOptions,
    ],
  ],
});
```

```typescript
// Grafana Cloud configuration
export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-otel",
      {
        host: "otlp-gateway-prod-eu-west-0.grafana.net",
        port: 443,
        protocol: "https",
        auth: {
          username: process.env.GRAFANA_INSTANCE_ID!,  // numeric instance ID
          password: process.env.GRAFANA_API_KEY!,       // Grafana API key
        },
        prefix: "pw_",
        resourceAttributes: {
          "deployment.environment": process.env.ENVIRONMENT ?? "local",
        },
      } satisfies OtelReporterOptions,
    ],
  ],
});
```

```typescript
// Remote collector with auth headers (Datadog, Honeycomb, etc.)
export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-otel",
      {
        host: "otel-collector.internal",
        port: 4318,
        protocol: "https",
        headers: {
          "X-Scope-OrgID": "team-frontend",
          "DD-API-KEY": process.env.DD_API_KEY!,
        },
      } satisfies OtelReporterOptions,
    ],
  ],
});
```

```promql
# Useful PromQL queries once data is in Prometheus / Grafana

# Overall pass rate (%)
100 * sum(e2e_tests_total{test_result="pass"}) / sum(e2e_tests_total)

# Pass rate by test suite (identify which suites are flaky)
100 * sum by (test_suite) (e2e_tests_total{test_result="pass"})
  / sum by (test_suite) (e2e_tests_total)

# 95th percentile test duration
histogram_quantile(0.95,
  sum by (le) (rate(e2e_test_duration_milliseconds_bucket[1h]))
)

# Average test duration in seconds (by project)
sum by (test_project) (e2e_test_duration_milliseconds_sum)
  / sum by (test_project) (e2e_test_duration_milliseconds_count)
  / 1000

# Total retries (flakiness signal)
sum(e2e_test_retries_total)

# Where suite time goes — total step seconds by category
sum by (test_step_category) (e2e_test_step_duration_milliseconds_sum) / 1000

# 95th percentile step duration by category (find slow hooks or expects)
histogram_quantile(0.95,
  sum by (le, test_step_category) (rate(e2e_test_step_duration_milliseconds_bucket[1h]))
)

# Step counts by category
sum by (test_step_category) (e2e_test_step_count_total)

# Annotation usage by type (tagging discipline across suites)
sum by (annotation_type) (e2e_test_annotation_count_total)

# Wall-clock run duration (CI job time trend)
histogram_quantile(0.95,
  sum by (le) (rate(e2e_run_duration_milliseconds_bucket[1d]))
)

# Tests by browser
sum by (browser_name) (e2e_tests_total)

# Heap memory during test run (MB)
e2e_process_memory_heap_used_bytes / 1024 / 1024
```

```yaml
# docker-compose.yml — local OTel stack for development
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    ports:
      - "4318:4318"   # OTLP/HTTP
      - "8889:8889"   # Prometheus metrics endpoint
    volumes:
      - ./otel-collector.yaml:/etc/otel-collector.yaml
    command: ["--config=/etc/otel-collector.yaml"]

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686" # Jaeger UI
      - "4317:4317"   # OTLP/gRPC

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

```typescript
// Adding custom span attributes via annotations (no fixture-otel needed)
import { test } from "@playwright/test";
import { annotationLabel } from "@playwright-labs/reporter-otel";

test("checkout flow", async ({ page }) => {
  // ✅ These annotations become span attributes in Jaeger/Tempo
  test.info().annotations.push(
    { type: annotationLabel("feature"), description: "checkout" },
    { type: annotationLabel("team"),    description: "payments" },
    { type: annotationLabel("sprint"),  description: "2026-Q2-W3" },
  );

  await page.goto("/checkout");
  // span attributes: { feature: 'checkout', team: 'payments', sprint: '2026-Q2-W3' }
});
```

Reference: [@playwright-labs/reporter-otel](https://github.com/vitalics/playwright-labs/tree/main/packages/reporter-otel)
