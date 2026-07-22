# @playwright-labs/prometheus-core

## 1.2.0

### Minor Changes

- 23c39b6: Silence the `prometheus-remote-writer` transport lines in console output.

  Metric events emitted inside a test now travel from workers to the reporter
  via `testInfo.attachments` instead of stdout, so terminal reporters (`list`,
  `line`, `dot`) no longer echo raw single-line JSON events.
  - **`@playwright-labs/prometheus-core`** — `Event` gains a pluggable writer
    (`Event.setWriter`), an attachment decoder (`Event.fromAttachment`) and the
    `PROM_ATTACHMENT_NAME` constant; `Metric.collect()` now emits through
    `Event.emit()`. Without an installed writer, `emit()` still falls back to
    single-line JSON on stdout, so events emitted outside a test context keep
    working.
  - **`@playwright-labs/fixture-prometheus`** — an internal auto fixture
    installs the attachment writer for the duration of every test; all public
    fixtures depend on it so teardown flushes stay on the silent channel.
  - **`@playwright-labs/reporter-prometheus-remote-write`** — decodes transport
    attachments in `onTestEnd` and forwards them to the remote-write endpoint
    (the `onStdOut` path is kept for backward compatibility); transport
    attachments are excluded from `pw_test_attachment_*` series and the
    `attachmentsCount` label.

## 1.1.0

### Minor Changes

- 88c0c58: Feature: Prometheus `Histogram` and global metric fixtures — `useGlobalCounter` and `useGlobalHistogram`.

  **`@playwright-labs/prometheus-core`** — new `Histogram` class: a real Prometheus histogram implemented as a composition of counters — cumulative `${name}_bucket{le="…"}` series (including `le="+Inf"`), `${name}_sum` and `${name}_count`. Bucket bounds are configurable and default to the classic Prometheus buckets (`DEFAULT_BUCKETS`).

  ```ts
  import { Histogram } from "@playwright-labs/prometheus-core";

  const stepDuration = new Histogram({
    name: "step_duration",
    buckets: [50, 100, 200, 500],
  });
  stepDuration.observe(120);
  stepDuration.collect(); // flushes bucket/sum/count series to the reporter
  ```

  Worker→reporter stdout events are now newline-delimited.

  **`@playwright-labs/fixture-prometheus`** — new global fixtures. Unlike the per-test `useCounterMetric` / `useGaugeMetric`, they return a **shared instance per worker process**: every test that asks for the same metric name gets the same object, values accumulate across the whole run, and the metrics are flushed automatically at every test teardown. Requesting the same name with a different kind throws an error.

  ```ts
  import { test } from "@playwright-labs/fixture-prometheus";

  test("first", async ({ page, useGlobalCounter }) => {
    const urlCalls = useGlobalCounter("url_calls", { url: "playwright.dev" });
    urlCalls.inc();
  });

  test("second", async ({ useGlobalCounter }) => {
    useGlobalCounter("url_calls").inc(); // same instance → url_calls = 2
  });

  test("durations", async ({ useGlobalHistogram }) => {
    const stepMs = useGlobalHistogram("step_duration", {
      buckets: [50, 100, 200, 500],
    });
    stepMs.observe(120);
  });
  ```

  **`@playwright-labs/reporter-prometheus-remote-write`** — fix: `onStdOut` now parses newline-delimited events with a chunk buffer. Previously, several events arriving in a single stdout chunk (which happens with every histogram flush) could not be split and were silently lost.

## 1.0.0

### Major Changes

- 10ddc01: First release of the Prometheus Remote Write stack for Playwright — a migration of [`playwright-prometheus-remote-write-reporter`](https://github.com/vitalics/playwright-prometheus-remote-write-reporter) into the playwright-labs monorepo, split into three packages with the same layout as `otel-core` / `reporter-otel` / `fixture-otel`.

  **Reporter** (`@playwright-labs/reporter-prometheus-remote-write`) — pushes test metrics to any Prometheus remote-write endpoint in real time: per-test duration/status/retry/attachment/annotation/step series, run-level totals, and Node.js process stats (heap, RSS, CPU).

  ```ts
  // playwright.config.ts
  import { defineConfig } from "@playwright/test";

  export default defineConfig({
    reporter: [
      [
        "@playwright-labs/reporter-prometheus-remote-write",
        { serverUrl: "http://localhost:9090/api/v1/write" },
      ],
    ],
  });
  ```

  **Fixtures** (`@playwright-labs/fixture-prometheus`) — custom metrics from inside tests via the `useCounterMetric` / `useGaugeMetric` fixtures. Metrics travel over the worker's stdout and are picked up by the reporter.

  ```ts
  import { test } from "@playwright-labs/fixture-prometheus";

  test("track API calls", async ({
    page,
    useCounterMetric,
    useGaugeMetric,
  }) => {
    const requests = useCounterMetric("api_requests", { endpoint: "/users" });
    const inFlight = useGaugeMetric("http_in_flight");

    inFlight.inc();
    await page.goto("/users");
    requests.inc();
    inFlight.dec();

    requests.collect(); // flush to the reporter via stdout
    inFlight.collect();
  });
  ```

  **Core** (`@playwright-labs/prometheus-core`) — shared primitives (`Counter`, `Gauge`, `Metric`) plus the stdout `Event` bridge, for cases where the fixtures are not used.

  Fixes applied on top of the original package:
  - `pw_test_attachment_count` and `pw_error_count` are now actually pushed — they were incremented but never included in a send batch.
  - Prometheus 3.x compatibility: samples are drained (only not-yet-pushed samples are sent) and sample timestamps are strictly increasing. The original resent the full sample history on every push, which Prometheus 3.x rejects with `out of order sample`, and collapsed several samples sharing the same millisecond.
  - Annotations and attachments are exported as per-item series — the original overwrote labels on a shared counter, so only the last annotation/attachment of a test was visible.
  - Prometheus 3.x requires the remote-write receiver flag `--web.enable-remote-write-receiver` (formerly `--enable-feature=remote-write-receiver`) — see the runnable example in [`examples/grafana-stack`](https://github.com/vitalics/playwright-labs/tree/main/examples/grafana-stack) (Prometheus + Grafana via docker compose).
