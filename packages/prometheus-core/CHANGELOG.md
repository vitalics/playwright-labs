# @playwright-labs/prometheus-core

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
