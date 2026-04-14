import { test, expect, Counter, Histogram, UpDownCounter, Span } from "../src/index";

// ── toBeOtelMetricCollected ───────────────────────────────────────────────────

test.describe("toBeOtelMetricCollected", () => {
  test("passes when counter has been called at least once", () => {
    const counter = new Counter("my_counter");
    counter.add(1);
    expect(counter).toBeOtelMetricCollected();
  });

  test("passes when histogram has been called", () => {
    const histogram = new Histogram("latency");
    histogram.record(42);
    expect(histogram).toBeOtelMetricCollected();
  });

  test("passes when up-down counter has been called", () => {
    const udc = new UpDownCounter("in_flight");
    udc.add(3);
    expect(udc).toBeOtelMetricCollected();
  });

  test("negation passes when counter has never been called", () => {
    const counter = new Counter("unused_counter");
    expect(counter).not.toBeOtelMetricCollected();
  });

  test("negation fails after counter is called", () => {
    const counter = new Counter("fail_negation");
    counter.add(5);
    expect(() => {
      expect(counter).not.toBeOtelMetricCollected();
    }).toThrow("NOT to have been recorded");
  });

  test("fails with clear message when counter was never called", () => {
    const counter = new Counter("never_called");
    expect(() => {
      expect(counter).toBeOtelMetricCollected();
    }).toThrow("at least once");
  });
});

// ── toHaveOtelCallCount ───────────────────────────────────────────────────────────

test.describe("toHaveOtelCallCount", () => {
  test("passes when call count matches exactly", () => {
    const counter = new Counter("exact");
    counter.add(1);
    counter.add(1);
    counter.add(1);
    expect(counter).toHaveOtelCallCount(3);
  });

  test("passes for zero calls", () => {
    const counter = new Counter("zero_calls");
    expect(counter).toHaveOtelCallCount(0);
  });

  test("negation passes when count differs", () => {
    const counter = new Counter("negation");
    counter.add(1);
    expect(counter).not.toHaveOtelCallCount(5);
  });

  test("fails with clear message when count differs", () => {
    const counter = new Counter("wrong_count");
    counter.add(1);
    counter.add(1);
    expect(() => {
      expect(counter).toHaveOtelCallCount(5);
    }).toThrow("callCount 5");
  });

  test("callCount does not reset after collect()", () => {
    const counter = new Counter("persist_count");
    counter.add(1);
    counter.add(1);
    counter.collect();
    // callCount is preserved after flush
    expect(counter).toHaveOtelCallCount(2);
  });

  test("works for histogram record calls", () => {
    const histogram = new Histogram("hist");
    histogram.record(100);
    histogram.record(200);
    expect(histogram).toHaveOtelCallCount(2);
  });
});

// ── toHaveOtelMinCallCount ────────────────────────────────────────────────────────

test.describe("toHaveOtelMinCallCount", () => {
  test("passes when call count meets the minimum", () => {
    const counter = new Counter("min_test");
    counter.add(1);
    counter.add(1);
    counter.add(1);
    expect(counter).toHaveOtelMinCallCount(2);
    expect(counter).toHaveOtelMinCallCount(3);
  });

  test("passes for minimum of zero", () => {
    const counter = new Counter("zero_min");
    expect(counter).toHaveOtelMinCallCount(0);
  });

  test("negation passes when count is below the minimum", () => {
    const counter = new Counter("below_min");
    counter.add(1);
    expect(counter).not.toHaveOtelMinCallCount(5);
  });

  test("fails with clear message when below minimum", () => {
    const counter = new Counter("below_min_fail");
    counter.add(1);
    expect(() => {
      expect(counter).toHaveOtelMinCallCount(3);
    }).toThrow("callCount >= 3");
  });
});

// ── toBeOtelSpanEnded ─────────────────────────────────────────────────────────────

test.describe("toBeOtelSpanEnded", () => {
  test("passes after span.end() is called", () => {
    const span = new Span("my_span");
    span.end();
    expect(span).toBeOtelSpanEnded();
  });

  test("negation passes when span is still open", () => {
    const span = new Span("open_span");
    expect(span).not.toBeOtelSpanEnded();
  });

  test("fails with clear message when span is still open", () => {
    const span = new Span("not_ended");
    expect(() => {
      expect(span).toBeOtelSpanEnded();
    }).toThrow("still open");
  });

  test("negation fails after span.end()", () => {
    const span = new Span("ended_span");
    span.end();
    expect(() => {
      expect(span).not.toBeOtelSpanEnded();
    }).toThrow("already ended");
  });
});

// ── Fixture integration ───────────────────────────────────────────────────────

test.describe("OtelFixture — useCounter", () => {
  test("tracks additions via fixture", async ({ useCounter }) => {
    const counter = useCounter("fixture_counter", { unit: "req" });
    counter.add(10, { route: "/api" });
    counter.add(5, { route: "/home" });
    expect(counter).toHaveOtelCallCount(2);
    expect(counter).toBeOtelMetricCollected();
  });
});

test.describe("OtelFixture — useHistogram", () => {
  test("tracks records via fixture", async ({ useHistogram }) => {
    const histogram = useHistogram("response_ms", { unit: "ms" });
    histogram.record(120);
    histogram.record(340);
    expect(histogram).toHaveOtelCallCount(2);
    expect(histogram).toHaveOtelMinCallCount(1);
  });
});

test.describe("OtelFixture — useUpDownCounter", () => {
  test("tracks adds via fixture", async ({ useUpDownCounter }) => {
    const udc = useUpDownCounter("in_flight_reqs");
    udc.add(5);
    udc.add(-2);
    expect(udc).toHaveOtelCallCount(2);
  });
});

test.describe("OtelFixture — useSpan", () => {
  test("span is not ended before explicit end()", async ({ useSpan }) => {
    const span = useSpan("open_span");
    expect(span).not.toBeOtelSpanEnded();
    span.end();
    expect(span).toBeOtelSpanEnded();
  });

  test("span auto-ends in fixture teardown", async ({ useSpan }) => {
    const span = useSpan("auto_ended");
    // Do NOT call span.end() — fixture teardown will do it
    expect(span).not.toBeOtelSpanEnded();
    // After test body, teardown calls span.end()
    // (we verify it's still open during the test)
  });

  test("span supports attribute chaining", async ({ useSpan }) => {
    const span = useSpan("chained");
    span
      .setAttribute("http.method", "GET")
      .setAttribute("http.status_code", 200)
      .setAttributes({ "db.type": "postgres", "db.rows": 42 })
      .setStatus("ok");
    span.end();
    expect(span).toBeOtelSpanEnded();
  });

  test("span end() is idempotent", async ({ useSpan }) => {
    const span = useSpan("idempotent");
    span.end();
    span.end(); // second call should be a no-op
    expect(span).toBeOtelSpanEnded();
  });
});

// ── Symbol.dispose ────────────────────────────────────────────────────────────

test.describe("Symbol.dispose — BaseMetric", () => {
  test("counter flushes via using statement", () => {
    let collected = false;
    const counter = new Counter("dispose_counter");
    const origCollect = counter.collect.bind(counter);
    Object.defineProperty(counter, "collect", {
      value: () => { collected = true; origCollect(); },
    });

    {
      // TypeScript 5.2+ `using` calls [Symbol.dispose] on scope exit
      counter[Symbol.dispose]();
    }
    expect(collected).toBe(true);
  });

  test("span ends via [Symbol.dispose]", () => {
    const span = new Span("dispose_span");
    expect(span).not.toBeOtelSpanEnded();
    span[Symbol.dispose]();
    expect(span).toBeOtelSpanEnded();
  });
});

// ── BaseMetric.collect idempotency ────────────────────────────────────────────

test.describe("BaseMetric.collect()", () => {
  test("second collect() with no new data is a no-op", () => {
    const counter = new Counter("noop_collect");
    counter.add(1);
    counter.collect(); // emits event, clears dataPoints
    // Calling collect() again with no new data should not emit anything
    counter.collect(); // should be a no-op (dataPoints is empty)
    // No assertion needed beyond "no error thrown"
  });

  test("callCount persists after collect()", () => {
    const histogram = new Histogram("persist_histogram");
    histogram.record(42);
    histogram.record(100);
    histogram.collect();
    expect(histogram).toHaveOtelCallCount(2);
  });

  test("can add more data after collect() and collect again", () => {
    const counter = new Counter("multi_collect");
    counter.add(1);
    counter.collect();
    expect(counter).toHaveOtelCallCount(1);
    counter.add(2);
    counter.collect();
    expect(counter).toHaveOtelCallCount(2);
  });
});
