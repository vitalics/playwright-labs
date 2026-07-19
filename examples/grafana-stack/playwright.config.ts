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
      "@playwright-labs/reporter-prometheus-remote-write",
      {
        // Prometheus remote-write endpoint — requires Prometheus to run with
        // --enable-feature=remote-write-receiver (see docker-compose.yml).
        serverUrl: "http://localhost:9090/api/v1/write",
      },
    ],
  ],

  projects: [
    // ── 1. Generate Prometheus data ───────────────────────────────────────────
    // All tests pass — produces the "pass" baseline in pw_tests_passed_count.
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

    // ── 2. Verify Prometheus data arrived ─────────────────────────────────────
    // Queries the Prometheus HTTP API to confirm that the metrics from the
    // `generate` project were pushed correctly via remote write.
    // Runs after `generate` via the project dependency.
    {
      name: "verify",
      testMatch: "tests/verify.spec.ts",
      dependencies: ["generate"],
    },

    // ── 3. Edge-case scenarios ────────────────────────────────────────────────
    // These tests intentionally fail or time out so the Grafana dashboards show
    // realistic data: fail counts, timeout status, retry metrics. They are
    // marked with test.fail() so the overall run stays green.
    //
    // Independent of `generate` and `verify` — the verification step does not
    // depend on this project.
    //
    // Open Grafana (http://localhost:3000) after the run to observe:
    //   • pw_tests_failed_count     — assertion failures
    //   • pw_tests_timed_out_count  — timeout test
    //   • pw_test_retry_count       — flaky-test retry
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
