/**
 * Edge-case tests — intentionally produce FAIL, TIMEDOUT, and RETRY outcomes.
 *
 * Purpose: populate the failure / timeout / retry buckets in pw_tests_total and
 * pw_test_retries_total so the Grafana dashboards show realistic, non-trivial
 * data alongside the passing tests from sample.spec.ts.
 *
 * These tests run in the `demo` project, which is independent of the `generate`
 * project, so the `verify` project is not affected by the expected failures here.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * What to observe in Grafana (http://localhost:3000 → "Playwright OTel — Base"):
 *
 *   Test Summary row
 *     • "Failed" stat card increases.
 *     • "Pass Rate" drops below 100%.
 *
 *   Test Results row
 *     • "Tests by Result" time series: "fail" series appears alongside "pass".
 *     • "Pass / Fail Distribution" pie: fail slice is visible.
 *
 *   Duration row
 *     • "Test Duration Percentiles": the timeout test contributes a data point
 *       near 500 ms (the test's configured per-test timeout).
 *
 *   Browser & Project row
 *     • "Pass / Fail by Project" bar chart: "demo" bar shows fail/pass split.
 *     • "Project Summary Table": "demo" row shows Passed, Failed, Pass Rate.
 *
 * Prometheus queries to try (http://localhost:9090):
 *   pw_tests_total{test_result="fail"}
 *   pw_tests_total{test_status="timedOut"}
 *   pw_test_retries_total
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { test, expect } from "@playwright-labs/fixture-otel";

// ── Assertion failures ────────────────────────────────────────────────────────

test.describe("Edge cases — assertion failures", () => {
  test("greeting mismatch — wrong user name returned", async ({
    useCounter,
    useSpan,
  }) => {
    // Simulate a multi-step checkout flow where the final assertion fails.
    // The counter and span are flushed before the assertion so the OTel data
    // is captured even though the test result is "fail".
    const steps = useCounter("demo_checkout_steps", {
      description: "Demo: checkout flow step tracking",
      unit: "steps",
    });
    steps.add(1, { step: "add_to_cart" });
    steps.add(1, { step: "proceed_to_checkout" });
    steps.add(1, { step: "enter_payment" });

    const span = useSpan("demo.checkout.submit");
    span.setAttribute("cart.items", 3);
    span.setAttribute("payment.method", "credit_card");
    span.end();

    // Intentional failure: simulates a UI assertion where the page shows the
    // wrong user name after login.
    // Grafana: pw_tests_total{test_result="fail", test_status="failed"} ↑1
    expect(
      "Welcome back, Alice!",
      "greeting mismatch — page shows wrong user (intentional failure, see Grafana)",
    ).toBe("Welcome back, Bob!");
  });

  test("API response — unexpected status code", async ({ useHistogram }) => {
    // Simulate recording a response time before asserting the status code.
    const latency = useHistogram("demo_api_latency", {
      description: "Demo: API call latency",
      unit: "ms",
    });
    latency.record(142, { endpoint: "/api/orders", method: "POST" });

    // Intentional failure: simulates an API that returned 500 instead of 201.
    // Grafana: pw_tests_total{test_result="fail", test_status="failed"} ↑1
    expect(
      500,
      "unexpected HTTP status — POST /api/orders returned 500 (intentional failure)",
    ).toBe(201);
  });
});

// ── Timeout ───────────────────────────────────────────────────────────────────

test.describe("Edge cases — timeouts", () => {
  test("server health check — response never arrives", async () => {
    // Override the timeout for this test only (500 ms is much shorter than the
    // global 60 s).  The test then waits 30 s → Playwright cancels it.
    //
    // Grafana: pw_tests_total{test_status="timedOut", test_result="fail"} ↑1
    //          pw_test_duration_milliseconds ← data point near 500 ms
    test.setTimeout(500);

    // Simulates an unresponsive upstream service / infinite loading spinner.
    await new Promise<void>((resolve) => setTimeout(resolve, 30_000));
  });
});

// ── Retries ───────────────────────────────────────────────────────────────────

test.describe("Edge cases — retries", () => {
  // Run each test in this describe block with up to 1 retry.
  test.describe.configure({ retries: 1 });

  test("flaky API — fails on first attempt, passes on retry", async ({
    useCounter,
  }) => {
    const retry = test.info().retry; // 0 = first attempt, 1 = first retry

    const attempts = useCounter("demo_flaky_attempts", {
      description: "Demo: tracks which attempt succeeded",
    });
    attempts.add(1, { attempt: retry === 0 ? "first" : "retry" });

    if (retry === 0) {
      // Simulate a transient network / race condition on the first attempt.
      // Grafana: pw_test_retries_total ↑1 on the retry
      throw new Error(
        "Simulated transient failure (attempt 1) — see pw_test_retries_total in Grafana",
      );
    }

    // Second attempt succeeds — final test_result = "pass".
    expect(retry).toBe(1);
  });
});
