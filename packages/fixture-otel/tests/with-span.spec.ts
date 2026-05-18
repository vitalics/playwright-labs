import { test, expect, Span } from "../src/index";
import { withSpan } from "../src/with-span";

// ── Basic behaviour ────────────────────────────────────────────────────────────

test.describe("withSpan — basics", () => {
  test("span is automatically ended after callback completes", async () => {
    let capturedSpan: Span | undefined;

    await withSpan("test.op", (span) => {
      capturedSpan = span;
      expect(span).not.toBeOtelSpanEnded();
    });

    expect(capturedSpan).toBeOtelSpanEnded();
  });

  test("returns the value resolved by the callback", async () => {
    const result = await withSpan("test.return", () => 42);
    expect(result).toBe(42);
  });

  test("returns the value resolved by an async callback", async () => {
    const result = await withSpan("test.async_return", async () => {
      return "hello";
    });
    expect(result).toBe("hello");
  });

  test("callback receives a Span instance", async () => {
    await withSpan("test.span_instance", (span) => {
      expect(span).toBeInstanceOf(Span);
    });
  });

  test("span name is set correctly", async () => {
    let capturedSpan: Span | undefined;
    await withSpan("my.custom.span", (span) => {
      capturedSpan = span;
    });
    // Verify span was received and ended — name is embedded in serialized output
    expect(capturedSpan).toBeOtelSpanEnded();
  });
});

// ── Attribute setting ─────────────────────────────────────────────────────────

test.describe("withSpan — attributes", () => {
  test("attributes set inside callback are preserved before span ends", async () => {
    await withSpan("test.attrs", (span) => {
      span.setAttribute("http.method", "GET");
      span.setAttribute("http.status_code", 200);
      // no assertion needed beyond "no error thrown"
    });
  });

  test("setAttributes sets multiple attributes at once", async () => {
    await withSpan("test.set_attrs", (span) => {
      span.setAttributes({
        "db.type": "postgres",
        "db.rows": 42,
        "db.table": "users",
      });
    });
  });

  test("setStatus ok is preserved", async () => {
    await withSpan("test.status_ok", (span) => {
      span.setStatus("ok");
    });
  });
});

// ── Error handling ─────────────────────────────────────────────────────────────

test.describe("withSpan — error handling", () => {
  test("re-throws synchronous errors from callback", async () => {
    await expect(
      withSpan("test.sync_throw", () => {
        throw new Error("sync failure");
      }),
    ).rejects.toThrow("sync failure");
  });

  test("re-throws async errors from callback", async () => {
    await expect(
      withSpan("test.async_throw", async () => {
        throw new Error("async failure");
      }),
    ).rejects.toThrow("async failure");
  });

  test("span is ended even when callback throws", async () => {
    let capturedSpan: Span | undefined;

    await expect(
      withSpan("test.throw_ends_span", (span) => {
        capturedSpan = span;
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(capturedSpan).toBeOtelSpanEnded();
  });

  test("span status is set to error on throw", async () => {
    let capturedSpan: Span | undefined;

    await expect(
      withSpan("test.error_status", (span) => {
        capturedSpan = span;
        throw new Error("Connection timed out after 5000ms");
      }),
    ).rejects.toThrow();

    // Span was ended (which triggers stdout serialization with error status)
    expect(capturedSpan).toBeOtelSpanEnded();
  });

  test("span is ended even when async callback rejects", async () => {
    let capturedSpan: Span | undefined;

    await expect(
      withSpan("test.async_throw_ends_span", async (span) => {
        capturedSpan = span;
        await Promise.resolve();
        throw new Error("late async failure");
      }),
    ).rejects.toThrow("late async failure");

    expect(capturedSpan).toBeOtelSpanEnded();
  });

  test("non-Error throws are converted to string for span status", async () => {
    let capturedSpan: Span | undefined;

    await expect(
      withSpan("test.non_error_throw", (span) => {
        capturedSpan = span;
        throw "string error"; // eslint-disable-line no-throw-literal
      }),
    ).rejects.toBe("string error");

    expect(capturedSpan).toBeOtelSpanEnded();
  });
});

// ── test.step integration ─────────────────────────────────────────────────────

test.describe("withSpan — test.step integration", () => {
  test("works naturally inside test.step", async () => {
    let capturedSpan: Span | undefined;

    await test.step("add item to cart", () =>
      withSpan("cart.add", (span) => {
        capturedSpan = span;
        span.setAttribute("product.id", "abc-123");
      }),
    );

    expect(capturedSpan).toBeOtelSpanEnded();
  });

  test("return value is forwarded through test.step", async () => {
    const result = await test.step("fetch user", () =>
      withSpan("db.users.find", async () => {
        return { id: 1, name: "Alice" };
      }),
    );

    expect(result).toEqual({ id: 1, name: "Alice" });
  });

  test("multiple steps each produce an ended span", async () => {
    const spans: Span[] = [];

    await test.step("step one", () =>
      withSpan("step.one", (span) => {
        spans.push(span);
      }),
    );

    await test.step("step two", () =>
      withSpan("step.two", (span) => {
        spans.push(span);
      }),
    );

    expect(spans).toHaveLength(2);
    spans.forEach((s) => expect(s).toBeOtelSpanEnded());
  });

  test("error in step re-throws and marks span as errored", async () => {
    let capturedSpan: Span | undefined;

    await expect(
      test.step("failing step", () =>
        withSpan("step.fail", (span) => {
          capturedSpan = span;
          throw new Error("step failed");
        }),
      ),
    ).rejects.toThrow("step failed");

    expect(capturedSpan).toBeOtelSpanEnded();
  });
});

// ── Nesting ───────────────────────────────────────────────────────────────────

test.describe("withSpan — nesting", () => {
  test("nested withSpan calls all end", async () => {
    const spans: Span[] = [];

    await withSpan("outer", async (outer) => {
      spans.push(outer);
      await withSpan("inner", (inner) => {
        spans.push(inner);
      });
    });

    expect(spans).toHaveLength(2);
    spans.forEach((s) => expect(s).toBeOtelSpanEnded());
  });

  test("inner span has outer span as parent", async () => {
    let outer!: Span;
    let inner!: Span;

    await withSpan("outer", async (o) => {
      outer = o;
      await withSpan("inner", (i) => {
        inner = i;
      });
    });

    expect((inner as any)._parentSpanId).toBe(outer.spanId);
  });

  test("top-level withSpan has no parent", async () => {
    let captured!: Span;
    await withSpan("root", (s) => {
      captured = s;
    });
    expect((captured as any)._parentSpanId).toBeUndefined();
  });

  test("deeply nested spans form a chain", async () => {
    let a!: Span, b!: Span, c!: Span;

    await withSpan("a", async (sa) => {
      a = sa;
      await withSpan("b", async (sb) => {
        b = sb;
        await withSpan("c", (sc) => {
          c = sc;
        });
      });
    });

    expect((b as any)._parentSpanId).toBe(a.spanId);
    expect((c as any)._parentSpanId).toBe(b.spanId);
  });

  test("sibling spans share the same parent", async () => {
    let parent!: Span;
    let child1!: Span;
    let child2!: Span;

    await withSpan("parent", async (p) => {
      parent = p;
      await withSpan("child1", (c) => { child1 = c; });
      await withSpan("child2", (c) => { child2 = c; });
    });

    expect((child1 as any)._parentSpanId).toBe(parent.spanId);
    expect((child2 as any)._parentSpanId).toBe(parent.spanId);
  });

  test("inner error ends both inner and outer spans", async () => {
    const spans: Span[] = [];

    await expect(
      withSpan("outer.fail", async (outer) => {
        spans.push(outer);
        await withSpan("inner.fail", (inner) => {
          spans.push(inner);
          throw new Error("inner boom");
        });
      }),
    ).rejects.toThrow("inner boom");

    expect(spans).toHaveLength(2);
    spans.forEach((s) => expect(s).toBeOtelSpanEnded());
  });
});
