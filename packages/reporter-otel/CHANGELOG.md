# @playwright-labs/reporter-otel

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
