# @playwright-labs/reporter-prometheus-remote-write

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

### Patch Changes

- Updated dependencies [23c39b6]
  - @playwright-labs/prometheus-core@1.2.0

## 1.1.0

### Minor Changes

- 2c8022d: Feature: auto-instrumented `expect.poll` / `expect().toPass()` metrics in both reporters.

  Playwright reports a poll as an `expect`-category step whose children are the individual poll attempts — so occurrence, attempt counts, total duration, and outcome are all available to the reporter with zero test-code changes.

  New metrics (same names in both reporters, `pw_` prefix):
  - `expect_poll_total` (counter, `outcome=pass|timeout`) — how many polls ran and how they ended
  - `expect_poll_attempts` — attempts per poll (child steps when reported; 1 for `toPass`)
  - `expect_poll_duration` — total polling time per assertion (ms)

  `reporter-core` exports the shared detectors used by both reporters:

  ```ts
  import {
    isExpectPollStep,
    getExpectPollInfo,
  } from "@playwright-labs/reporter-core";

  getExpectPollInfo(step); // { attempts: 3, outcome: "pass" } | null
  ```

- 2f582b3: Feature: otel-compatible unified metric names for the auto-collected metrics.

  The reporter now emits the same metric names and label semantics that `@playwright-labs/reporter-otel` uses, next to the legacy series (kept for backward compatibility, to be removed in the next major):
  - `pw_tests_total{test_status,test_result,test_suite}` — one counter with labels, matching the OTel metric exactly
  - `pw_test_retries_total`, `pw_test_error_count_total`, `pw_test_step_count_total` — named to match what the OTel Collector's Prometheus exporter produces from the OTel counterparts
  - `pw_process_memory_*`, `pw_os_memory_free`, `pw_process_cpu_user/system` — aliases of the existing `pw_node_*` gauges under the OTel-style names (note: the OTel Collector additionally appends `_bytes` / `_microseconds` suffixes)
  - `pw_run_duration` — wall-clock run duration (gauge), mirroring the OTel histogram

  The grafana-stack example's Base dashboard now queries the shared names (`pw_tests_total`, `pw_test_retries_total`, `pw_test_step_count_total`, `pw_process_*`), so its key panels work against either reporter's data.

### Patch Changes

- Updated dependencies [2c8022d]
  - @playwright-labs/reporter-core@1.1.0

## 1.0.3

### Patch Changes

- e5fb985: First release of `@playwright-labs/reporter-core` — the unified base for all `@playwright-labs/reporter-*` packages.
  - `BaseReporter` — accumulates `TestCases` (`[test, result][]`) in `onTestEnd`, keeps per-status `counts`, stores `config`, resolves `Template` options (`T | ((result, testCases) => T | Promise<T>)`, the same `(result, testCases)` contract that reporter-email/reporter-slack templates use), `printsToStdio() === false`.
  - All reporter packages now extend `BaseReporter` instead of re-implementing accumulation (internal refactor — `NodemailerTestCases`/`SlackTestCases` remain as aliases of `TestCases`; no behavior changes).
  - `reporter-desktop-native-notification`: new `message` option — static string or a `(result, testCases)` template, overriding the built-in counts summary.

  ```ts
  import { BaseReporter, type Template } from "@playwright-labs/reporter-core";

  export default class MyReporter extends BaseReporter {
    override onTestEnd(test, result) {
      super.onTestEnd(test, result); // keep the accumulation working
      // …your per-test logic
    }

    async onEnd(result) {
      const text = await this.resolveTemplate(this.options.text, result);
      // …send
    }
  }
  ```

- Updated dependencies [e5fb985]
  - @playwright-labs/reporter-core@1.0.0

## 1.0.2

### Patch Changes

- fef3bff: Docs: fix README inaccuracies across packages.
  - SQL: the `pull` CLI is `@playwright-labs/sql-core`'s, not `fixture-sql`'s — all invocations corrected to `pnpm sql-core pull --adapter … --url … [--out …]` (with a note that pnpm only links bins of direct dependencies); `sql-core` README now documents the CLI; generated-file attribution fixed.
  - `fixture-abort`: fix wrong import package name; document the real fixture names `signal` and `useSignalWithTimeout` (was `abortSignal` / `useAbortSignalWithTimeout` — aligned README, JSDoc, and the validation error message).
  - `fixture-env`: add missing `createEnv` imports (subpath-only export), fix the zod example, remove a non-working `use: { env }` config block.
  - `fixture-faker`: fix a copy-pasted allure import. `fixture-ghost-cursor`: fix the test-composition example (`mergeTests`). `decorators`: fix two dead links.
  - `reporter-otel` / `reporter-email`: point example references to the real `examples/otel-stack` and `examples/reporter-email` directories; fix `FullResult`-based callback docs and tuple destructuring in email template examples.
  - `reporter-prometheus-remote-write`: README metric table now matches the actual emitted metric names; the package barrel now also re-exports `Histogram` and `DEFAULT_BUCKETS` from `prometheus-core`, as documented.

## 1.0.1

### Patch Changes

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

- Updated dependencies [88c0c58]
  - @playwright-labs/prometheus-core@1.1.0

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

### Patch Changes

- Updated dependencies [10ddc01]
  - @playwright-labs/prometheus-core@1.0.0
