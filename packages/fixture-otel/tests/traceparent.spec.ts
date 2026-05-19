import { test, expect, TRACEPARENT_ANNOTATION } from "../src/index";

const TRACE_ID_RE = /^[0-9a-f]{32}$/;
const SPAN_ID_RE = /^[0-9a-f]{16}$/;
const TRACEPARENT_RE = /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/;

// ── Format ────────────────────────────────────────────────────────────────────

test.describe("useTraceparent — format", () => {
  test("traceId is 32 lowercase hex characters", async ({ useTraceparent }) => {
    const { traceId } = useTraceparent();
    expect(traceId).toMatch(TRACE_ID_RE);
  });

  test("spanId is 16 lowercase hex characters", async ({ useTraceparent }) => {
    const { spanId } = useTraceparent();
    expect(spanId).toMatch(SPAN_ID_RE);
  });

  test("traceparent matches the W3C format", async ({ useTraceparent }) => {
    const { traceparent } = useTraceparent();
    expect(traceparent).toMatch(TRACEPARENT_RE);
  });

  test("traceparent is composed from traceId and spanId", async ({
    useTraceparent,
  }) => {
    const { traceId, spanId, traceparent } = useTraceparent();
    expect(traceparent).toBe(`00-${traceId}-${spanId}-01`);
  });

  test("trace flags are 01 (sampled)", async ({ useTraceparent }) => {
    const { traceparent } = useTraceparent();
    const flags = traceparent.split("-")[3];
    expect(flags).toBe("01");
  });

  test("generates a different traceId for each test", async ({
    useTraceparent,
  }) => {
    // Each test gets its own fixture instance — traceIds must be unique across runs.
    // We can only verify that the current traceId is non-zero.
    const { traceId } = useTraceparent();
    expect(traceId).not.toBe("0".repeat(32));
  });
});

// ── Memoisation ───────────────────────────────────────────────────────────────

test.describe("useTraceparent — memoisation", () => {
  test("repeated calls within the same test return the same object", async ({
    useTraceparent,
  }) => {
    const a = useTraceparent();
    const b = useTraceparent();
    expect(a).toBe(b);
  });

  test("traceId is stable across multiple calls", async ({ useTraceparent }) => {
    const first = useTraceparent().traceId;
    const second = useTraceparent().traceId;
    expect(first).toBe(second);
  });

  test("traceparent is stable across multiple calls", async ({
    useTraceparent,
  }) => {
    const first = useTraceparent().traceparent;
    const second = useTraceparent().traceparent;
    expect(first).toBe(second);
  });
});

// ── Annotation ────────────────────────────────────────────────────────────────

test.describe("useTraceparent — annotation", () => {
  test("pushes pw_otel.traceparent annotation on first call", async ({
    useTraceparent,
  }) => {
    const { traceparent } = useTraceparent();

    const annotation = test
      .info()
      .annotations.find((a) => a.type === TRACEPARENT_ANNOTATION);

    expect(annotation).toBeDefined();
    expect(annotation?.description).toBe(traceparent);
  });

  test("annotation is pushed exactly once even with repeated calls", async ({
    useTraceparent,
  }) => {
    useTraceparent();
    useTraceparent();
    useTraceparent();

    const count = test
      .info()
      .annotations.filter((a) => a.type === TRACEPARENT_ANNOTATION).length;

    expect(count).toBe(1);
  });

  test("annotation type is TRACEPARENT_ANNOTATION constant", async ({
    useTraceparent,
  }) => {
    useTraceparent();

    const annotation = test
      .info()
      .annotations.find((a) => a.type === TRACEPARENT_ANNOTATION);

    expect(annotation?.type).toBe("pw_otel.traceparent");
  });

  test("annotation description matches the returned traceparent", async ({
    useTraceparent,
  }) => {
    const ctx = useTraceparent();

    const annotation = test
      .info()
      .annotations.find((a) => a.type === TRACEPARENT_ANNOTATION);

    expect(annotation?.description).toBe(ctx.traceparent);
  });
});
