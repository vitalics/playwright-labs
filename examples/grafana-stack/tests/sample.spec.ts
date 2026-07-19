/**
 * Sample tests that generate Prometheus metrics.
 *
 * These tests run in the `generate` project and push metrics into the local
 * Prometheus (remote-write receiver) via the reporter. The `verify` project
 * then asserts that the data arrived correctly.
 *
 * Two ways to emit custom metrics are demonstrated:
 *   1. A standalone `Counter` from `@playwright-labs/prometheus-core` —
 *      created at module level and shared by the whole file.
 *   2. The `useCounterMetric` / `useGaugeMetric` fixtures from
 *      `@playwright-labs/fixture-prometheus` — created per test.
 *
 * Both flush via `.collect()`, which writes the series as JSON to stdout;
 * the reporter picks it up in `onStdOut` and remote-writes it to Prometheus.
 * Every metric name is prefixed with `pw_` by the reporter, so
 * `e2e_page_visits` lands in Prometheus as `pw_e2e_page_visits`.
 *
 * The example is self-contained — no external network calls. The `url` label
 * on the standalone counter only records which site the visit *would* have
 * targeted (mirrors the original remote-write reporter example).
 */
import { Counter } from "@playwright-labs/prometheus-core";
import { test, expect } from "@playwright-labs/fixture-prometheus";

/**
 * Standalone counter — lives outside any test, shared by the whole spec file.
 * `new Counter({ name, ...labels }, initialValue)`; `.inc().collect()` appends
 * a sample and flushes the series via stdout.
 */
const pageVisits = new Counter(
  {
    name: "e2e_page_visits",
    url: "playwright.dev",
  },
  0,
);

test.describe("Prometheus reporter — sample data generation", () => {
  test("standalone Counter tracks page visits (1st visit)", async ({ page }) => {
    await page.goto("about:blank"); // no external network in this example
    pageVisits.inc().collect(); // → pw_e2e_page_visits{url="playwright.dev"} 1

    await expect(page).toHaveURL("about:blank");
  });

  test("standalone Counter tracks page visits (2nd visit)", async ({ page }) => {
    await page.goto("about:blank");
    pageVisits.inc().collect(); // → pw_e2e_page_visits{url="playwright.dev"} 2

    await expect(page).toHaveURL("about:blank");
  });

  test("useCounterMetric tracks simulated API calls", async ({
    useCounterMetric,
  }) => {
    const users = useCounterMetric("e2e_api_requests", {
      endpoint: "/users",
      method: "GET",
    });
    users.inc();
    users.inc();
    users.collect(); // → pw_e2e_api_requests{endpoint="/users",method="GET"} 2

    // A second label set of the same metric name → a separate series.
    const orders = useCounterMetric("e2e_api_requests", {
      endpoint: "/orders",
      method: "POST",
    });
    orders.inc();
    orders.collect(); // → pw_e2e_api_requests{endpoint="/orders",method="POST"} 1
  });

  test("useGaugeMetric tracks in-flight users", async ({ useGaugeMetric }) => {
    const activeUsers = useGaugeMetric("e2e_active_users", {
      region: "us-east",
    });

    activeUsers.set(10); // 10 users online
    activeUsers.inc(); // 1 logged in
    activeUsers.dec(2); // 2 logged out
    activeUsers.collect(); // → pw_e2e_active_users{region="us-east"} 9
  });

  test("counter with Symbol.dispose flushes on scope exit", async ({
    useCounterMetric,
  }) => {
    {
      using counter = useCounterMetric("e2e_dispose_counter");
      counter.inc(10);
      counter.inc(20);
    } // counter[Symbol.dispose]() → counter.collect() called here
    // → pw_e2e_dispose_counter 30
  });

  test("attachments are reported as metrics", async ({}) => {
    // The reporter turns attachments into pw_test_attachment_* series.
    await test.info().attach("checkout-summary.json", {
      contentType: "application/json",
      body: JSON.stringify({ cartItems: 3, totalUsd: 89.97 }),
    });
  });

  test("annotations are reported as metrics", async ({}) => {
    // The reporter turns annotations into pw_test_annotation_count series.
    test.info().annotations.push(
      { type: "e2e.feature", description: "checkout" },
      { type: "e2e.team", description: "platform" },
    );
  });

  test("test.step durations are reported as metrics", async () => {
    // Each test.step produces a pw_test_step_duration series.
    await test.step("search products", async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    await test.step("add to cart", async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    await test.step("checkout", async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  });
});
