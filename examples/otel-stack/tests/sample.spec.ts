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

  test("useTraceparent links test span and all worker spans in one trace", async ({
    useTraceparent,
  }) => {
    // A single W3C traceparent is generated for this test.
    // The reporter places its test span inside that trace, and every span
    // emitted from the worker (via withSpan / useSpan) is reported as a child
    // of that test span — so all spans share the same traceId in Jaeger.
    const { traceId, traceparent } = useTraceparent();

    // Simulate a multi-step checkout flow where each step would normally call
    // a downstream service.  In a real setup with startWorkerSdk() and
    // auto-instrumented HTTP clients, the traceparent header would be injected
    // automatically into every outgoing request.
    await test.step("validate cart", () =>
      withSpan("e2e.traceparent.cart.validate", (span) => {
        span.setAttribute("cart.items", 3);
        span.setAttribute("cart.total_usd", 89.97);
      }),
    );

    await test.step("charge payment", () =>
      withSpan("e2e.traceparent.payment.charge", (span) => {
        span.setAttribute("payment.method", "credit_card");
        span.setAttribute("payment.amount_usd", 89.97);
      }),
    );

    await test.step("send confirmation email", () =>
      withSpan("e2e.traceparent.email.send", (span) => {
        span.setAttribute("email.recipient", "user@example.com");
        span.setAttribute("email.template", "order_confirmation");
      }),
    );

    // All three worker spans + the test span itself share this traceId.
    // Open the link below in Jaeger after the run to see them together.
    console.log(`  useTraceparent demo trace → http://localhost:16686/trace/${traceId}`);
    console.log(`  W3C traceparent header    → ${traceparent}`);

    expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });
});


test.describe("OTel reporter — global metrics (shared across tests)", () => {
  // Global fixtures return ONE shared instance per worker: values accumulate
  // across tests and the metrics are flushed automatically at every test
  // teardown — no manual collect() needed.

  test("global counter accumulates URL calls (1st call)", async ({
    useGlobalCounter,
  }) => {
    const urlCalls = useGlobalCounter("e2e_global_url_calls");
    urlCalls.add(1, { url: "playwright.dev" });
    expect(urlCalls.callCount).toBe(1);
  });

  test("global counter accumulates URL calls (2nd call)", async ({
    useGlobalCounter,
  }) => {
    // Same instance as in the previous test — callCount does not reset.
    const urlCalls = useGlobalCounter("e2e_global_url_calls");
    expect(urlCalls.callCount).toBe(1);

    urlCalls.add(1, { url: "playwright.dev" });
    expect(urlCalls.callCount).toBe(2);
  });

  test("global histogram records step durations (1st)", async ({
    useGlobalHistogram,
  }) => {
    const stepDuration = useGlobalHistogram("e2e_global_step_ms", {
      unit: "ms",
    });
    stepDuration.record(120, { step: "search" });
  });

  test("global histogram records step durations (2nd)", async ({
    useGlobalHistogram,
  }) => {
    const stepDuration = useGlobalHistogram("e2e_global_step_ms");
    expect(stepDuration.callCount).toBe(1); // same instance from the 1st test

    stepDuration.record(240, { step: "checkout" });
    expect(stepDuration.callCount).toBe(2);
  });
});
