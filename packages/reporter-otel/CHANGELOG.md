# @playwright-labs/reporter-otel

## 1.2.2

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

## 1.2.1

### Patch Changes

- fef3bff: Docs: fix README inaccuracies across packages.
  - SQL: the `pull` CLI is `@playwright-labs/sql-core`'s, not `fixture-sql`'s — all invocations corrected to `pnpm sql-core pull --adapter … --url … [--out …]` (with a note that pnpm only links bins of direct dependencies); `sql-core` README now documents the CLI; generated-file attribution fixed.
  - `fixture-abort`: fix wrong import package name; document the real fixture names `signal` and `useSignalWithTimeout` (was `abortSignal` / `useAbortSignalWithTimeout` — aligned README, JSDoc, and the validation error message).
  - `fixture-env`: add missing `createEnv` imports (subpath-only export), fix the zod example, remove a non-working `use: { env }` config block.
  - `fixture-faker`: fix a copy-pasted allure import. `fixture-ghost-cursor`: fix the test-composition example (`mergeTests`). `decorators`: fix two dead links.
  - `reporter-otel` / `reporter-email`: point example references to the real `examples/otel-stack` and `examples/reporter-email` directories; fix `FullResult`-based callback docs and tuple destructuring in email template examples.
  - `reporter-prometheus-remote-write`: README metric table now matches the actual emitted metric names; the package barrel now also re-exports `Histogram` and `DEFAULT_BUCKETS` from `prometheus-core`, as documented.

## 1.2.0

### Minor Changes

- 73cfa0f: Feature: broader auto-instrumentation — parity with the Prometheus remote-write reporter.

  New built-in metrics (no code changes required in tests):
  - `pw_test_step_count` (counter, attrs `test.step.category`, `test.suite`, project/browser) and `pw_test_step_duration` (histogram, ms) — recorded for every Playwright step, nested steps included.
  - `pw_test_annotation_count` (counter, attrs `annotation.type`, `test.suite`) — one series per annotation.
  - `pw_run_duration` (histogram, ms) — wall-clock duration of the whole run, recorded at `onEnd`.

  New resource attributes on every signal (traces + metrics):
  - `process.runtime.name` now reflects the actual runtime — `nodejs`, `bun`, or `deno` (detected via `process.versions`; previously hardcoded to `nodejs`), with `process.runtime.version` holding the detected runtime's own version.
  - `process.runtime.versions.*` — full runtime component versions (`process.runtime.versions.node`, `.v8`, `.openssl`, …; `.bun` under Bun, `.deno` under Deno). Also exported for reuse: `resolveRuntime()`.

  Reminder of what was already auto-collected: `pw_tests_total` (per status/result/suite/project), `pw_test_duration`, `pw_test_retries`, `pw_test_attachment_count` / `pw_test_attachment_size`, `pw_test_error_count`, Node.js memory/CPU gauges, OS/host/playwright-config resource attributes, and opt-in `env.<key>` attributes via the `env` option.

## 1.1.1

### Patch Changes

- 0235886: Security: bump `@opentelemetry/sdk-node` and OTLP exporters from `^0.214.0` to `^0.217.0` to fix [GHSA-q7rr-3cgh-j5r3](https://github.com/advisories/GHSA-q7rr-3cgh-j5r3) — malformed HTTP request causes Prometheus exporter process crash.

  Also updated workspace-level overrides:
  - `protobufjs` → `7.5.8` (GHSA-685m-2w69-288q and others: code injection, DoS)
  - `next` → `16.2.6` (multiple CVEs: middleware bypass, DoS, SSRF)
  - `fast-uri` → `3.1.2` (GHSA-q3j6-qgpj-74h6, GHSA-v39h-62p7-jpjc: path traversal, host confusion)
  - `postcss` → `8.5.10`
  - `ws` → `8.20.1`

- Updated dependencies [0235886]
  - @playwright-labs/otel-core@1.1.1

## 1.1.0

### Minor Changes

- b32d9ba: Feature: add traceparent context tracking (#49)

  ### `@playwright-labs/reporter-otel`
  - **Deferred span creation**: the test span is now created in `onTestEnd` instead of
    `onTestBegin`, so the `pw_otel.traceparent` annotation set by the fixture is
    available before the span context is resolved. Span `startTime` is preserved.
  - **Traceparent injection**: when a `pw_otel.traceparent` annotation is present, the
    test span is created as a child of that remote context, placing it in the same trace
    as all instrumented outgoing requests from the test.
  - **Step spans deferred**: step spans are created recursively from `result.steps` in
    `onTestEnd` so they share the same trace context as the test span.
  - Exported `parseTraceparent(value)` helper — parses a W3C traceparent string into an
    OTel `SpanContext`; returns `undefined` for invalid input.

  ### `@playwright-labs/otel-core`
  - Added `TRACEPARENT_ANNOTATION` constant (`"pw_otel.traceparent"`) — the shared key
    used by the fixture to annotate a test and read by the reporter to resolve the trace context.
  - Added `startWorkerSdk(options?)` — initialises a singleton `NodeSDK` in the worker
    process with an OTLP trace exporter pointing at the reporter's local HTTP server
    (`PLAYWRIGHT_OTEL_BASE_URL`). Subsequent calls are no-ops; returns immediately when
    the reporter is not running.

- a80f334: Feature: add tracking for parent span ids during the test before sending metrics in OTEL (related #49)

### Patch Changes

- Updated dependencies [a80f334]
- Updated dependencies [b32d9ba]
  - @playwright-labs/otel-core@1.1.0

## 1.0.1

### Patch Changes

- Updated dependencies [0ed8282]
  - @playwright-labs/otel-core@1.0.1

## 1.0.0

### Major Changes

- 7d6ee21: Introduce `@playwright-labs/reporter-otel` — an OpenTelemetry reporter for Playwright that sends traces and metrics to any OTLP-compatible backend (Jaeger, Grafana Tempo, Prometheus via OTel Collector, Datadog, and more).

  Every test becomes a root span; every Playwright step becomes a child span. Built-in metrics cover test results, durations, retries, attachments, errors, and Node.js process health (heap, RSS, CPU). Browser and project metadata (name, channel, headless, viewport, locale) are captured as span and metric attributes.

  Basic usage:

  ```ts
  // playwright.config.ts
  import { defineConfig } from "@playwright/test";

  export default defineConfig({
    reporter: [
      ["@playwright-labs/reporter-otel", { host: "localhost", port: 4318 }],
    ],
  });
  ```

### Patch Changes

- Updated dependencies [7d6ee21]
  - @playwright-labs/otel-core@1.0.0
