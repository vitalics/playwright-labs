import { defineConfig } from "@playwright/test";

export default defineConfig({
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  timeout: 60_000,
  retries: 0,
  workers: 1,

  reporter: [
    ["list"],
    [
      "@playwright-labs/reporter-otel",
      {
        host: "localhost",
        port: 4318,
        // Short export interval so metrics are available in the verify project
        exportIntervalMillis: 5_000,
        resourceAttributes: {
          "e2e.run": String(Date.now()),
        },
      },
    ],
  ],

  projects: [
    // ── 1. Generate OTel data ─────────────────────────────────────────────────
    // All tests pass — produces the "pass" baseline in pw_tests_total.
    {
      name: "generate",
      testMatch: "tests/sample.spec.ts",
      use: {
        browserName: "chromium",
        headless: true,
        viewport: { width: 1280, height: 720 },
        locale: "en-US",
      },
    },

    // ── 2. Verify OTel data arrived ───────────────────────────────────────────
    // Queries Jaeger / OTel Collector / Prometheus / Grafana to confirm that
    // the data from the `generate` project was exported correctly.
    // Runs after `generate` via the project dependency.
    {
      name: "verify",
      testMatch: "tests/verify.spec.ts",
      dependencies: ["generate"],
    },

    // ── 3. Edge-case scenarios ────────────────────────────────────────────────
    // These tests intentionally fail or time out so the Grafana dashboards show
    // realistic data: fail counts, timeout status, retry metrics.
    //
    // Independent of `generate` and `verify` — failures here do not block
    // the verification step.
    //
    // Open Grafana (http://localhost:3000) after the run to observe:
    //   • pw_tests_total{test_result="fail"}      — assertion failures
    //   • pw_tests_total{test_status="timedOut"}  — timeout test
    //   • pw_test_retries_total                   — flaky-test retry
    {
      name: "demo",
      testMatch: "tests/edge-cases.spec.ts",
      use: {
        browserName: "chromium",
        headless: true,
        viewport: { width: 1280, height: 720 },
        locale: "en-US",
      },
    },
  ],
});
