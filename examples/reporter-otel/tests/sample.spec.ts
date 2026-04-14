/**
 * Sample tests that generate OTel data.
 *
 * These tests run in the `generate` project and feed spans + metrics into the
 * local OTel Collector → Jaeger (traces) and Prometheus (metrics).
 * The `verify` project then asserts that the data arrived correctly.
 */
import { test, expect, withSpan } from "@playwright-labs/fixture-otel";

test.describe("OTel reporter — sample data generation", () => {
  test("counter tracks recorded values", async ({ useCounter }) => {
    const requests = useCounter("e2e_api_requests", {
      description: "E2E test: simulated API requests",
      unit: "requests",
    });

    requests.add(1, { endpoint: "/users", method: "GET" });
    requests.add(1, { endpoint: "/orders", method: "GET" });
    requests.add(1, { endpoint: "/orders", method: "POST" });

    expect(requests).toHaveOtelCallCount(3);
    expect(requests).toBeOtelMetricCollected();
  });

  test("histogram tracks distribution of values", async ({ useHistogram }) => {
    const duration = useHistogram("e2e_page_load_ms", {
      description: "E2E test: simulated page load times",
      unit: "ms",
    });

    duration.record(120, { route: "/home" });
    duration.record(340, { route: "/dashboard" });
    duration.record(85, { route: "/login" });

    expect(duration).toHaveOtelMinCallCount(1);
  });

  test("up-down counter tracks in-flight operations", async ({
    useUpDownCounter,
  }) => {
    const inFlight = useUpDownCounter("e2e_requests_in_flight", {
      description: "E2E test: in-flight requests",
    });

    inFlight.add(3);   // 3 requests started
    inFlight.add(-1);  // 1 completed

    expect(inFlight).toHaveOtelCallCount(2);
  });

  test("useSpan creates a child span under the test span", async ({
    useSpan,
  }) => {
    const span = useSpan("e2e.checkout.flow");
    span.setAttribute("cart.items", 5);
    span.setAttribute("payment.method", "credit_card");
    span.end();

    expect(span).toBeOtelSpanEnded();
  });

  test("using keyword auto-ends span when scope exits", async ({ useSpan }) => {
    {
      using span = useSpan("e2e.search.query");
      span.setAttribute("query.term", "playwright");
      span.setAttribute("results.count", 42);
    } // span.end() called automatically
  });

  test("span can report errors", async ({ useSpan }) => {
    const span = useSpan("e2e.failed.operation");
    span.setAttribute("error.type", "TimeoutError");
    span.setStatus("error", "Connection timed out after 5000ms");
    span.end();

    expect(span).toBeOtelSpanEnded();
  });

  test("annotations forwarded as span attributes", async ({}) => {
    test.info().annotations.push(
      { type: "pw_otel.feature", description: "checkout" },
      { type: "pw_otel.team", description: "platform" },
    );
    // The reporter converts these into span attributes automatically
  });

  test("counter with Symbol.dispose flushes on scope exit", async ({
    useCounter,
  }) => {
    {
      using counter = useCounter("e2e_symbol_dispose_counter");
      counter.add(10);
      counter.add(20);
      expect(counter).toHaveOtelCallCount(2);
    } // counter[Symbol.dispose]() → counter.collect() called here
  });

  test("withSpan pairs naturally with test.step", async () => {
    // Each test.step appears in the Playwright Trace Viewer timeline;
    // each withSpan appears as a child span in Jaeger / Tempo.
    await test.step("search products", () =>
      withSpan("e2e.search.products", (span) => {
        span.setAttribute("search.query", "playwright");
        span.setAttribute("search.results", 12);
      }),
    );

    await test.step("add to cart", () =>
      withSpan("e2e.cart.add", (span) => {
        span.setAttribute("product.id", "abc-123");
        span.setAttribute("product.price", 29.99);
      }),
    );

    await test.step("checkout", () =>
      withSpan("e2e.checkout.submit", async (span) => {
        span.setAttribute("cart.items", 1);
        span.setAttribute("payment.method", "credit_card");
        span.setStatus("ok");
      }),
    );
  });

  test("withSpan standalone — return value propagation", async () => {
    const total = await withSpan("e2e.db.aggregate", async (span) => {
      span.setAttribute("db.table", "orders");
      span.setAttribute("db.operation", "sum");
      // Simulates a DB query returning a value
      return 1337;
    });

    expect(total).toBe(1337);
  });
});
