---
title: Push Test Metrics to Prometheus in Real Time with reporter-prometheus-remote-write
impact: MEDIUM
impactDescription: turns ephemeral CI results into live, queryable Prometheus series for dashboards and alerting
tags: prometheus, metrics, reporter, remote-write, grafana, monitoring, observability, ci
---

## Push Test Metrics to Prometheus in Real Time with reporter-prometheus-remote-write

**Impact: MEDIUM (turns ephemeral CI results into live, queryable Prometheus series for dashboards and alerting)**

Playwright's HTML report is a static snapshot: it lives inside one CI build, gets archived as an artifact, and cannot answer "is this suite getting slower over the last 30 days?" The `@playwright-labs/reporter-prometheus-remote-write` package pushes every test result into Prometheus as it happens — `onTestEnd` and `onTestStepEnd` series arrive during the run, run-level aggregates flush at exit, and Node.js process stats ride along. Grafana turns that into pass-rate trends, duration heatmaps, and failure-spike alerts next to your application metrics.

## When to Use

- **Use this reporter when**: Your observability stack is already Prometheus + Grafana and you want test health (pass rate, duration, retries, timeouts) queryable with PromQL and alertable via Alertmanager
- **Use this reporter when**: You want metrics *during* the run — per-test and per-step series land in Prometheus as each test finishes, not after the HTML report is uploaded
- **Consider reporter-otel when**: You need distributed traces, or you ship telemetry to multiple backends through an OTel Collector instead of pushing straight to Prometheus
- **Consider the HTML report when**: You only need to debug a single failed run locally — a time-series database adds no value there
- **Required for**: Teams tracking flakiness and duration trends across branches, shards, and releases over weeks or months

## Guidelines

### Do

- Set `serverUrl` to the full remote-write endpoint — `http://localhost:9090/api/v1/write`, not just `http://localhost:9090`
- Start Prometheus 3.x with `--web.enable-remote-write-receiver` (on 2.x use `--enable-feature=remote-write-receiver`) — the push endpoint is off by default
- Keep `["list"]` in the reporter array — this reporter sets `printsToStdio()` to `false`, so without `list` you get no console output
- Use the `prefix` option (default `pw_`) to namespace metrics when several test suites share one Prometheus
- Add static dimensions via `labels` (e.g. `{ ci: "true", branch: "main" }`) — they are applied to every series the reporter pushes
- Pass an explicit allowlist via `env` (e.g. `{ GIT_BRANCH: process.env.GIT_BRANCH }`) so build metadata becomes the `pw_env` series
- Type the options object with `satisfies PrometheusOptions` — TypeScript catches a missing `serverUrl` at compile time instead of at run start

### Don't

- Don't omit `serverUrl` — the reporter constructor throws a `TypeError` and the run never starts
- Don't forget the receiver flag on Prometheus — without it the endpoint answers **404** and every push is lost
- Don't pass `env: process.env` — it leaks tokens, passwords, and internal hostnames into a database your whole org can read
- Don't put run-unique values (build IDs, timestamps, test IDs) into the `labels` option — every run becomes a new set of series and cardinality explodes; per-test identity is already on the built-in series via labels like `title`, `testId`, `location`
- Don't create `Counter`/`Gauge` metrics without calling `.collect()` — nothing is sent until you do
- Don't use a key literally named `name` inside `env` or `labels` — it collides with the metric-name field

### Tool Usage Patterns

- **Install**: `npm i @playwright-labs/reporter-prometheus-remote-write`
- **Options** (`PrometheusOptions`): `serverUrl` (required, `string | URL`), `headers`, `auth.username` / `auth.password` (basic auth), `prefix` (default `pw_`), `labels`, `env` (default `{}` — deliberately empty for security)
- **Endpoint**: the reporter POSTs snappy-compressed remote-write payloads to `<prometheus>/api/v1/write` — Prometheus needs no scrape job for Playwright; a self-scrape-only `prometheus.yml` is enough
- **Custom metrics**: `Counter` and `Gauge` are re-exported from the reporter (source: `@playwright-labs/prometheus-core`); fixtures `useCounterMetric` / `useGaugeMetric` / `useGlobalCounter` / `useGlobalHistogram` live in the sibling `@playwright-labs/fixture-prometheus` package
- **Ready-made stack**: `examples/grafana-stack` in the monorepo — `pnpm install && pnpm test:e2e` boots Prometheus + Grafana via Docker Compose, runs a metrics-generating project, then a `verify` project that queries the Prometheus HTTP API to assert the data arrived

## Edge Cases and Constraints

### Limitations

- Run-level aggregates (`pw_tests_total_count`, `pw_tests_passed_count`, `pw_tests_failed_count`, `pw_tests_skipped_count`, `pw_tests_timed_out_count`, `pw_tests_total_duration`) are flushed **once at `onExit`** — they appear in Prometheus only after the whole run completes. Per-test and per-step series are the real-time part.
- The remote-write receiver is **disabled by default** in Prometheus. There is no config-file toggle — it is a command-line flag.
- Push model: Prometheus never scrapes Playwright. If Prometheus is unreachable, the metrics are simply not stored — the reporter does not buffer to disk.
- `env` defaults to `{}` on purpose: the reporter's README states that sending **all** environment variables would make them visible to any Prometheus user.

### Edge Cases

1. **Prometheus version flag drift**: Prometheus 2.x used `--enable-feature=remote-write-receiver`; 3.x moved it to `--web.enable-remote-write-receiver`. Copying a 2.x compose file against a `prom/prometheus:v3.x` image silently restores the 404 behavior.
2. **Empty series are skipped**: the reporter drains each metric and only sends unsent samples — a drained metric with no new samples produces an empty series that Prometheus rejects, and resending old samples triggers "out of order sample" rejections. Expect a metric to exist only after it recorded at least one sample.
3. **Authenticated / multi-tenant endpoints**: for a remote Prometheus behind basic auth use `auth: { username, password }`; for gateway-style setups pass extra HTTP headers via `headers` (e.g. an org/tenant header).
4. **Custom metrics cross worker boundaries as stdout events**: `.collect()` writes a newline-delimited JSON `{ name: "prometheus-remote-writer", payload }` line that the reporter parses in `onStdOut`. The reporter's own internal output is counted in `pw_stdout` with label `internal="true"` so you can filter it out of log-volume queries.

### What Breaks If Ignored

- **Without the receiver flag**: every POST to `/api/v1/write` gets a 404 and not a single series reaches Prometheus — dashboards stay empty even though the run "reported" fine
- **Without `serverUrl`**: `TypeError` from the reporter constructor — Playwright exits before running any test
- **HTML-only reporting**: results die with the CI artifact — no pass-rate trend, no duration p95 history, no alerting when `main` starts failing
- **Without `labels`/`env` enrichment**: all runs from all branches land in identical series — you cannot compare `main` vs. a feature branch or staging vs. CI

**Incorrect (static HTML snapshot only — nothing queryable over time):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["html"], // ❌ a per-build artifact — cannot trend pass rate or duration
  ],
});
```

**Why this fails:**

- Every build produces an isolated report; there is no way to ask "which tests got slower this month?"
- Failure spikes on `main` are discovered by someone opening the report, not by an alert
- Duration, retry, and timeout data never reaches the same dashboards the team already watches

**Correct (remote-write reporter with typed options and CI enrichment):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { type PrometheusOptions } from "@playwright-labs/reporter-prometheus-remote-write";

export default defineConfig({
  reporter: [
    ["list"], // ✅ keep console output — the reporter itself prints nothing
    [
      "@playwright-labs/reporter-prometheus-remote-write",
      {
        // ✅ full remote-write path; Prometheus must run with
        // --web.enable-remote-write-receiver (3.x) or
        // --enable-feature=remote-write-receiver (2.x)
        serverUrl: "http://localhost:9090/api/v1/write",
        prefix: "pw_",
        // ✅ static dimensions on every series — filterable in PromQL
        labels: {
          ci: String(Boolean(process.env.CI)),
          branch: process.env.GIT_BRANCH ?? "local",
        },
        // ✅ explicit allowlist — becomes the pw_env series; never process.env
        env: {
          GIT_COMMIT: process.env.GIT_COMMIT,
          BUILD_ID: process.env.BUILD_ID,
        },
      } satisfies PrometheusOptions,
    ],
  ],
});
```

**Why this works:**

- Per-test (`pw_test_duration`, `pw_test_retry_count`) and per-step (`pw_test_step_duration`) series arrive in Prometheus while the run is still executing
- `labels` and the allowlisted `env` make every query sliceable by branch and build
- `satisfies PrometheusOptions` turns misconfiguration into a compile error instead of a runtime `TypeError`

## Common Mistakes

### Mistake 1: Prometheus 3.x started without the remote-write receiver flag

```yaml
# docker-compose.yml — BROKEN against Prometheus 3.x
services:
  prometheus:
    image: prom/prometheus:v3.3.0
    ports:
      - "9090:9090"
    # ❌ no receiver flag — POST /api/v1/write answers 404
    command: ["--config.file=/etc/prometheus/prometheus.yml"]
```

**Why this is wrong**: The receiver is off by default. The reporter pushes every series to `/api/v1/write`, gets a 404 for each batch, and no metric is ever stored. On 2.x the flag was `--enable-feature=remote-write-receiver`; upgrading the image without updating the flag brings the 404 back.

**How to fix**:

```yaml
# docker-compose.yml — Prometheus 3.x with the receiver enabled
services:
  prometheus:
    image: prom/prometheus:v3.3.0
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    # ✅ CRITICAL: turns the remote-write endpoint on
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--web.enable-remote-write-receiver"
```

### Mistake 2: Omitting `serverUrl`

```typescript
// ❌ throws TypeError before the first test runs
reporter: [["@playwright-labs/reporter-prometheus-remote-write"]];
```

**Why this is wrong**: `serverUrl` is the only required option. The constructor validates it immediately and raises a `TypeError` telling you to set `serverUrl: 'http://localhost:9090/api/v1/write'` — the run never starts.

**How to fix**:

```typescript
// ✅ always pass the full endpoint URL, typed for autocomplete
import { type PrometheusOptions } from "@playwright-labs/reporter-prometheus-remote-write";

reporter: [
  [
    "@playwright-labs/reporter-prometheus-remote-write",
    {
      serverUrl: "http://localhost:9090/api/v1/write",
    } satisfies PrometheusOptions,
  ],
];
```

### Mistake 3: Sending the whole environment with `env: process.env`

```typescript
// ❌ leaks CI tokens, registry credentials, and internal hosts into Prometheus
reporter: [
  [
    "@playwright-labs/reporter-prometheus-remote-write",
    {
      serverUrl: "http://localhost:9090/api/v1/write",
      env: process.env, // every variable becomes a label on the pw_env series
    },
  ],
];
```

**Why this is wrong**: The `env` object becomes label values on the constant-1 `pw_env` series. Prometheus is typically readable by the whole organization — `NPM_TOKEN`, `AWS_SECRET_ACCESS_KEY`, and database URLs would all be queryable. This is exactly why the option defaults to `{}`.

**How to fix**:

```typescript
// ✅ allowlist only non-secret build metadata
import os from "node:os";

reporter: [
  [
    "@playwright-labs/reporter-prometheus-remote-write",
    {
      serverUrl: "http://localhost:9090/api/v1/write",
      env: {
        user: os.userInfo().username,
        platform: os.platform(),
        productVersion: process.env.MY_PRODUCT_VERSION, // e.g. 2.4.8
      },
    },
  ],
];
```

### Mistake 4: Custom metric never collected

```typescript
import { test } from "@playwright/test";
import { Counter } from "@playwright-labs/reporter-prometheus-remote-write";

const urlCalls = new Counter({ name: "url_calls" }, 0);

test("counts URL calls", async ({ page }) => {
  await page.goto("https://example.com");
  urlCalls.inc();
  // ❌ no .collect() — the sample stays in the worker and is never pushed
});
```

**Why this is wrong**: Custom metrics travel from the worker to the reporter only when `.collect()` serializes the series to stdout. `inc()` alone mutates local state; `pw_url_calls` never appears in Prometheus.

**How to fix**:

```typescript
// ✅ flush in an afterAll hook — or use the `using` keyword for scoped flush
test.afterAll(() => {
  urlCalls.collect(); // → pw_url_calls appears in Prometheus
});
```

## Advanced Patterns

### Built-in metrics reference (default `pw_` prefix)

| Metric | Pushed at | What it shows |
| --- | --- | --- |
| `pw_tests_total_count`, `pw_tests_passed_count`, `pw_tests_failed_count`, `pw_tests_skipped_count`, `pw_tests_timed_out_count` | `onExit` | Run totals by outcome |
| `pw_tests_total_duration` | `onExit` | Wall time of the whole run (ms) |
| `pw_config`, `pw_project` | `onExit` (labeled at `onBegin`) | Constant-1 series carrying config labels (`workers`, `shard_current`, `shard_total`, …) and project labels (`projectName`, `timeout`, …) |
| `pw_test`, `pw_test_duration`, `pw_test_retry_count` | `onTestEnd` | Per-test result, duration (ms), retries — labels include `title`, `suite`, `location`, `actualStatus`, `workerIndex` |
| `pw_test_attachment_count`, `pw_test_attachment_size` | `onTestEnd` | Attachment count and size in bytes per test |
| `pw_test_annotation_count` | `onTestEnd` | Annotations with `type` / `description` labels |
| `pw_test_step_duration`, `pw_test_step`, `pw_test_step_error_count` | `onTestStepEnd` | Per-step duration and errors, including every `test.step` |
| `pw_test_step_total_count`, `pw_test_step_total_duration`, `pw_test_step_total_error` | `onTestEnd` / `onExit` | Step aggregates across the run |
| `pw_error_count`, `pw_test_errors` | `onError` | Errors with `message` / `snippet` labels |
| `pw_stdout`, `pw_stderr` | `onStdOut` / `onStdErr` | Output volume; reporter-internal lines carry `internal="true"` |
| `pw_node_memory_heap_used`, `pw_node_memory_rss`, `pw_node_memory_external`, `pw_node_cpu_user`, `pw_node_cpu_system`, `pw_node_os`, `pw_node_versions`, `pw_node_argv`, `pw_env` | updated on every hook, flushed at `onExit` | Node.js process stats of the Playwright main process — memory-leak and worker-load signal |

### Useful PromQL once data flows

```promql
# Pass rate of the latest run (%)
100 * pw_tests_passed_count / pw_tests_total_count

# Slowest tests by duration (ms)
topk(10, pw_test_duration)

# Total duration per suite
sum by (suite) (pw_test_duration)

# Step errors accumulated over the last hour
increase(pw_test_step_total_error[1h])

# Playwright main-process heap (MB)
pw_node_memory_heap_used / 1024 / 1024

# Retry hotspots — tests that needed a retry at all
pw_test_retry_count > 0
```

### Custom business metrics inside tests

```typescript
import { test } from "@playwright/test";
import { Counter, Gauge } from "@playwright-labs/reporter-prometheus-remote-write";

// Standalone counter shared by the whole spec file — lands as pw_e2e_page_visits
const pageVisits = new Counter({ name: "e2e_page_visits" }, 0);

test("tracks page visits and in-flight users", async ({ page }) => {
  pageVisits.inc();

  // ✅ `using` flushes via .collect() automatically on scope exit (TS 5.2+)
  {
    using activeUsers = new Gauge({ name: "e2e_active_users" });
    activeUsers.set(10);
    activeUsers.inc();
    activeUsers.dec(2); // → pw_e2e_active_users 9
  }

  await page.goto("https://example.com");
});

test.afterAll(() => {
  pageVisits.collect(); // standalone metrics still need an explicit flush
});
```

**When to use this pattern**: business-level counters (API calls triggered, items rendered) that the built-in result metrics cannot express. For per-test metrics prefer the `useCounterMetric` / `useGaugeMetric` fixtures from `@playwright-labs/fixture-prometheus` — they scope creation and flush to the test lifecycle.

### Local Prometheus + Grafana stack (docker-compose)

```yaml
# docker-compose.yml — minimal stack, mirrors examples/grafana-stack
services:
  prometheus:
    image: prom/prometheus:v3.3.0
    ports:
      - "9090:9090" # Prometheus UI
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    # NOTE: --web.enable-remote-write-receiver is CRITICAL — it is what turns
    # the push endpoint /api/v1/write on. Without it Prometheus answers 404.
    # (Prometheus 2.x used --enable-feature=remote-write-receiver.)
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--web.enable-remote-write-receiver"
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:9090/-/ready"]
      interval: 5s
      timeout: 5s
      retries: 10

  grafana:
    image: grafana/grafana:11.6.0
    ports:
      - "3000:3000" # Grafana UI — anonymous admin, no login
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
      - GF_AUTH_DISABLE_LOGIN_FORM=true
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
    depends_on:
      prometheus:
        condition: service_healthy
```

```yaml
# prometheus.yml — self-scrape only; all pw_* metrics arrive via remote write
global:
  scrape_interval: 5s

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets:
          - localhost:9090
```

The complete runnable version lives in `examples/grafana-stack` (tests, datasource provisioning, a `generate` project that pushes metrics, a `verify` project that asserts they landed, and a `demo` project with intentional fail/timeout/retry scenarios). From that directory: `pnpm install && pnpm test:e2e`, then explore `pw_tests_total_count` at http://localhost:9090 or in Grafana's Explore view at http://localhost:3000; `pnpm infra:down` stops the stack.

## Integration with Other Best Practices

- **Export Test Traces and Metrics to OpenTelemetry Backends with reporter-otel** (`advanced-otel-reporter`): pick this remote-write reporter when Prometheus is the only destination and you want direct push with zero collector infrastructure; pick reporter-otel when you also need traces or multiple backends. Both accept `prefix` and an `env` allowlist, so dashboard conventions carry over.
- **Debug Test Steps** (`debug-test-steps`): every `test.step` you add for readability also becomes a `pw_test_step_duration` series — step discipline pays off twice, in the trace viewer and in Grafana.
- **Parallel Test Sharding** (`parallel-test-sharding`): the `pw_config` series carries `shard_current` / `shard_total` labels, so sharded CI jobs are distinguishable in Prometheus instead of blending into one run.
- **`@playwright-labs/fixture-prometheus`**: use `useCounterMetric` / `useGaugeMetric` / `useGlobalCounter` / `useGlobalHistogram` fixtures instead of hand-managing `Counter` instances — global fixtures accumulate across tests in a worker and flush automatically at teardown.

Reference: [@playwright-labs/reporter-prometheus-remote-write](https://github.com/vitalics/playwright-labs/tree/main/packages/reporter-prometheus-remote-write)
