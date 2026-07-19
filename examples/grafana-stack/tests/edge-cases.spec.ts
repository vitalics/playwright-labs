/**
 * Edge-case tests — intentionally produce FAIL, TIMEDOUT, and RETRY outcomes.
 *
 * Purpose: populate pw_tests_failed_count, pw_tests_timed_out_count and
 * pw_test_retry_count so the Grafana dashboards show realistic, non-trivial
 * data alongside the passing tests from sample.spec.ts.
 *
 * These tests run in the `demo` project, which is independent of the
 * `generate` project, so the `verify` project is not affected by the
 * intentional failures here.
 *
 * The failing tests are marked with test.fail(): Playwright still runs and
 * reports them — the reporter sees result.status "failed" / "timedOut" and
 * pushes the corresponding metrics — but the expected failures do not turn
 * the overall run red. The timeout test uses a retry instead (attempt 1
 * times out, attempt 2 passes → "flaky"), because test.fail() cannot
 * tolerate a hard test timeout.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * What to observe in Grafana (http://localhost:3000 → Explore → Prometheus):
 *
 *   pw_tests_failed_count     — increases by 2 (the assertion failures below)
 *   pw_tests_timed_out_count  — increases by 1 (the timeout test)
 *   pw_test_retry_count       — the flaky test's retry attempt
 *   pw_tests_total_count      — all tests, including this project
 *
 * Or query Prometheus directly (http://localhost:9090):
 *   pw_tests_failed_count
 *   pw_tests_timed_out_count
 *   pw_test_retry_count
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { test, expect } from "@playwright-labs/fixture-prometheus";

// ── Assertion failures ────────────────────────────────────────────────────────

test.describe("Edge cases — assertion failures", () => {
  test("greeting mismatch — wrong user name returned", async ({
    useCounterMetric,
  }) => {
    // Intentional failure, marked as expected — the run stays green while the
    // reporter still records result.status "failed" → pw_tests_failed_count ↑1
    test.fail();

    // Simulate a multi-step checkout flow where the final assertion fails.
    // The counter is flushed before the assertion so the metric is captured
    // even though the test result is "failed".
    const steps = useCounterMetric("demo_checkout_steps", { flow: "checkout" });
    steps.inc(); // add_to_cart
    steps.inc(); // proceed_to_checkout
    steps.inc(); // enter_payment
    steps.collect(); // → pw_demo_checkout_steps{flow="checkout"} 3

    // Intentional failure: simulates a UI assertion where the page shows the
    // wrong user name after login.
    // Prometheus: pw_tests_failed_count ↑1
    expect(
      "Welcome back, Alice!",
      "greeting mismatch — page shows wrong user (intentional failure, see Prometheus)",
    ).toBe("Welcome back, Bob!");
  });

  test("API response — unexpected status code", async ({ useGaugeMetric }) => {
    // Intentional failure, marked as expected → pw_tests_failed_count ↑1
    test.fail();

    // Simulate recording a response time before asserting the status code.
    const latency = useGaugeMetric("demo_api_latency", {
      endpoint: "/api/orders",
      method: "POST",
    });
    latency.set(142).collect(); // → pw_demo_api_latency 142

    // Intentional failure: simulates an API that returned 500 instead of 201.
    // Prometheus: pw_tests_failed_count ↑1
    expect(
      500,
      "unexpected HTTP status — POST /api/orders returned 500 (intentional failure)",
    ).toBe(201);
  });
});

// ── Timeout ───────────────────────────────────────────────────────────────────

test.describe("Edge cases — timeouts", () => {
  // Attempt 1 hits the 500 ms test timeout (result.status "timedOut"), the
  // retry passes instantly. Final result is "flaky" — the run stays green
  // while the reporter still records the timedOut attempt.
  // (test.fail() cannot be used here: it only tolerates status "failed",
  // a hard test timeout is reported as "timedOut" and stays red.)
  test.describe.configure({ retries: 1 });

  test("server health check — response never arrives", async () => {
    const retry = test.info().retry; // 0 = first attempt, 1 = retry

    if (retry === 0) {
      // Override the timeout for this attempt only (500 ms is much shorter
      // than the global 60 s). The test then waits 30 s → Playwright cancels
      // it with result.status "timedOut".
      //
      // Prometheus: pw_tests_timed_out_count ↑1
      //             pw_test_duration ← data point near 500 ms
      test.setTimeout(500);
      // Simulates an unresponsive upstream service / infinite loading spinner.
      await new Promise<void>((resolve) => setTimeout(resolve, 30_000));
      return;
    }

    // Retry: the service responds instantly → the run stays green.
    expect(retry).toBe(1);
  });
});

// ── Retries ───────────────────────────────────────────────────────────────────

test.describe("Edge cases — retries", () => {
  // Run each test in this describe block with up to 1 retry.
  test.describe.configure({ retries: 1 });

  test("flaky API — fails on first attempt, passes on retry", async ({
    useCounterMetric,
  }) => {
    const retry = test.info().retry; // 0 = first attempt, 1 = first retry

    const attempts = useCounterMetric("demo_flaky_attempts", {
      attempt: retry === 0 ? "first" : "retry",
    });
    attempts.inc().collect(); // → pw_demo_flaky_attempts{attempt="first"|"retry"} 1

    if (retry === 0) {
      // Simulate a transient network / race condition on the first attempt.
      // Prometheus: pw_test_retry_count ↑1 on the retry
      throw new Error(
        "Simulated transient failure (attempt 1) — see pw_test_retry_count in Prometheus",
      );
    }

    // Second attempt succeeds — final result = "passed".
    expect(retry).toBe(1);
  });
});
