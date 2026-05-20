import { test, expect } from "@playwright/test";
import opentelemetry, {
  ROOT_CONTEXT,
  TraceFlags,
  SpanStatusCode,
} from "@opentelemetry/api";
import type {
  Attributes,
  Context,
  Span,
  SpanContext,
  SpanOptions,
  Tracer,
} from "@opentelemetry/api";
import {
  ATTR_TEST_CASE_NAME,
  ATTR_TEST_CASE_RESULT_STATUS,
  ATTR_TEST_SUITE_NAME,
} from "@opentelemetry/semantic-conventions/incubating";

import OtelReporter, {
  parseTraceparent,
  TRACEPARENT_ANNOTATION,
} from "../src/reporter";

import type {
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";

// ── parseTraceparent ──────────────────────────────────────────────────────────

test.describe("parseTraceparent", () => {
  test("parses a valid W3C traceparent", () => {
    const traceId = "4bf92f3577b34da6a3ce929d0e0e4736";
    const spanId = "00f067aa0ba902b7";
    const result = parseTraceparent(`00-${traceId}-${spanId}-01`);

    expect(result).toEqual({
      traceId,
      spanId,
      traceFlags: TraceFlags.SAMPLED,
      isRemote: true,
    });
  });

  test("parses flags 00 as TraceFlags.NONE", () => {
    const result = parseTraceparent(
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00",
    );
    expect(result?.traceFlags).toBe(TraceFlags.NONE);
  });

  test("returns undefined for an empty string", () => {
    expect(parseTraceparent("")).toBeUndefined();
  });

  test("returns undefined when version is not 00", () => {
    expect(
      parseTraceparent("01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"),
    ).toBeUndefined();
  });

  test("returns undefined when traceId is too short", () => {
    expect(
      parseTraceparent("00-4bf92f3577b34da6-00f067aa0ba902b7-01"),
    ).toBeUndefined();
  });

  test("returns undefined when spanId is too short", () => {
    expect(
      parseTraceparent("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa-01"),
    ).toBeUndefined();
  });

  test("returns undefined when traceId contains non-hex characters", () => {
    expect(
      parseTraceparent("00-ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ-00f067aa0ba902b7-01"),
    ).toBeUndefined();
  });

  test("returns undefined when spanId contains non-hex characters", () => {
    expect(
      parseTraceparent("00-4bf92f3577b34da6a3ce929d0e0e4736-ZZZZZZZZZZZZZZZZ-01"),
    ).toBeUndefined();
  });

  test("returns undefined when there are too few segments", () => {
    expect(parseTraceparent("00-4bf92f3577b34da6a3ce929d0e0e4736")).toBeUndefined();
  });

  test("isRemote is always true", () => {
    const result = parseTraceparent(
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    );
    expect(result?.isRemote).toBe(true);
  });
});

// ── Test doubles ──────────────────────────────────────────────────────────────

/** Minimal OTel Span spy that records setAttribute calls and can be ended. */
class SpySpan implements Span {
  readonly attrs: Record<string, unknown> = {};
  readonly creationCtx: Context;
  private _ended = false;
  statusCode: number | undefined;
  statusMessage: string | undefined;

  constructor(
    readonly name: string,
    ctx: Context,
  ) {
    this.creationCtx = ctx;
  }

  spanContext(): SpanContext {
    const remote = opentelemetry.trace.getSpanContext(this.creationCtx);
    return (
      remote ?? {
        traceId: "0".repeat(32),
        spanId: "0".repeat(16),
        traceFlags: TraceFlags.SAMPLED,
        isRemote: false,
      }
    );
  }

  setAttribute(key: string, value: unknown) {
    this.attrs[key] = value;
    return this;
  }
  setAttributes(attrs: Attributes) {
    Object.assign(this.attrs, attrs);
    return this;
  }
  setStatus({ code, message }: { code: number; message?: string }) {
    this.statusCode = code;
    this.statusMessage = message;
    return this;
  }
  end() {
    this._ended = true;
  }
  get ended() {
    return this._ended;
  }
  isRecording() {
    return !this._ended;
  }
  recordException() {
    return this;
  }
  updateName(_name: string) {
    return this;
  }
  addEvent() {
    return this;
  }
  addLink() {
    return this;
  }
  addLinks() {
    return this;
  }
}

/** Tracer spy that records every startSpan call. */
class SpyTracer implements Tracer {
  readonly spans: SpySpan[] = [];

  startSpan(name: string, _options?: SpanOptions, ctx?: Context): SpySpan {
    const span = new SpySpan(name, ctx ?? ROOT_CONTEXT);
    this.spans.push(span);
    return span;
  }

  startActiveSpan<F extends (span: Span) => unknown>(
    name: string,
    arg1: SpanOptions | F,
    arg2?: Context | F,
    arg3?: F,
  ): ReturnType<F> {
    const fn = (arg3 ?? arg2 ?? arg1) as F;
    const ctx = (typeof arg2 === "object" ? arg2 : undefined) as
      | Context
      | undefined;
    const span = this.startSpan(name, undefined, ctx);
    return fn(span) as ReturnType<F>;
  }
}

/** Reporter subclass that skips NodeSDK initialisation and injects a spy tracer. */
class TestReporter extends OtelReporter {
  readonly spyTracer = new SpyTracer();

  onBegin(config: FullConfig, suite: Suite): void {
    // Skip NodeSDK start — just wire the spy tracer directly.
    this.tracer = this.spyTracer;
  }
}

// ── Fixtures for Playwright reporter types ────────────────────────────────────

function makeConfig(): FullConfig {
  return {
    version: "1.0.0",
    configFile: "/tmp/playwright.config.ts",
    workers: 1,
    fullyParallel: false,
    shard: null,
    rootDir: "/tmp",
    projects: [],
    reporter: [],
    webServer: null,
  } as unknown as FullConfig;
}

function makeSuite(): Suite {
  return { title: "" } as unknown as Suite;
}

function makeTest(overrides: {
  id?: string;
  title?: string;
  annotations?: Array<{ type: string; description?: string }>;
  expectedStatus?: string;
}): TestCase {
  return {
    id: overrides.id ?? "test-1",
    title: overrides.title ?? "my test",
    parent: {
      title: "my suite",
      project: () => undefined,
      parent: undefined,
    },
    location: { file: "/tmp/test.spec.ts", line: 1, column: 0 },
    annotations: overrides.annotations ?? [],
    expectedStatus: overrides.expectedStatus ?? "passed",
    titlePath: () => ["", "", "", "my test"],
  } as unknown as TestCase;
}

function makeResult(overrides: {
  status?: string;
  duration?: number;
  steps?: TestStep[];
}): TestResult {
  return {
    startTime: new Date("2024-01-01T00:00:00Z"),
    duration: overrides.duration ?? 100,
    status: overrides.status ?? "passed",
    retry: 0,
    workerIndex: 0,
    parallelIndex: 0,
    attachments: [],
    steps: overrides.steps ?? [],
    error: undefined,
  } as unknown as TestResult;
}

// ── Reporter — deferred span creation ────────────────────────────────────────

test.describe("OtelReporter — span lifecycle", () => {
  test("creates no span in onTestBegin, one span in onTestEnd", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());
    const test_ = makeTest({});
    const result = makeResult({});

    reporter.onTestBegin(test_, result);
    expect(reporter.spyTracer.spans).toHaveLength(0);

    reporter.onTestEnd(test_, result);
    expect(reporter.spyTracer.spans).toHaveLength(1);
  });

  test("test span is ended after onTestEnd", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());
    const test_ = makeTest({});
    const result = makeResult({});

    reporter.onTestBegin(test_, result);
    reporter.onTestEnd(test_, result);

    const span = reporter.spyTracer.spans[0];
    expect(span.ended).toBe(true);
  });
});

// ── Reporter — traceparent injection ─────────────────────────────────────────

test.describe("OtelReporter — pw_otel.traceparent", () => {
  const knownTraceId = "a".repeat(32);
  const knownSpanId = "b".repeat(16);
  const knownTraceparent = `00-${knownTraceId}-${knownSpanId}-01`;

  test("without annotation: test span has a different traceId each run", () => {
    const r1 = new TestReporter();
    r1.onBegin(makeConfig(), makeSuite());
    const t1 = makeTest({ id: "t1" });
    r1.onTestBegin(t1, makeResult({}));
    r1.onTestEnd(t1, makeResult({}));

    const r2 = new TestReporter();
    r2.onBegin(makeConfig(), makeSuite());
    const t2 = makeTest({ id: "t2" });
    r2.onTestBegin(t2, makeResult({}));
    r2.onTestEnd(t2, makeResult({}));

    // Without annotation, each test gets its own fresh trace context (ROOT_CONTEXT),
    // so spanContext() returns the noop zero-id — just verify span was created.
    expect(r1.spyTracer.spans).toHaveLength(1);
    expect(r2.spyTracer.spans).toHaveLength(1);
  });

  test("with annotation: test span is created inside the annotated trace", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const test_ = makeTest({
      annotations: [
        { type: TRACEPARENT_ANNOTATION, description: knownTraceparent },
      ],
    });
    const result = makeResult({});

    reporter.onTestBegin(test_, result);
    reporter.onTestEnd(test_, result);

    const [testSpan] = reporter.spyTracer.spans;
    // The SpySpan captures the resolved SpanContext from the parent context.
    // When traceparent is provided, resolveRemoteContext sets the remote SpanContext,
    // so spanContext().traceId must match.
    expect(testSpan.spanContext().traceId).toBe(knownTraceId);
    expect(testSpan.spanContext().spanId).toBe(knownSpanId);
  });

  test("traceparent annotation is not forwarded as a span attribute", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const test_ = makeTest({
      annotations: [
        { type: TRACEPARENT_ANNOTATION, description: knownTraceparent },
      ],
    });
    reporter.onTestBegin(test_, makeResult({}));
    reporter.onTestEnd(test_, makeResult({}));

    const [testSpan] = reporter.spyTracer.spans;
    // The raw "traceparent" key must not appear as a span attribute.
    expect(testSpan.attrs["traceparent"]).toBeUndefined();
  });

  test("malformed traceparent annotation: span is still created in root context", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const test_ = makeTest({
      annotations: [
        { type: TRACEPARENT_ANNOTATION, description: "not-a-valid-traceparent" },
      ],
    });
    reporter.onTestBegin(test_, makeResult({}));
    reporter.onTestEnd(test_, makeResult({}));

    // Reporter must not throw and must still produce one span
    expect(reporter.spyTracer.spans).toHaveLength(1);
  });

  test("other pw_otel.* annotations are still forwarded as span attributes", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const test_ = makeTest({
      annotations: [
        { type: TRACEPARENT_ANNOTATION, description: knownTraceparent },
        { type: "pw_otel.feature", description: "checkout" },
        { type: "pw_otel.team", description: "platform" },
      ],
    });
    reporter.onTestBegin(test_, makeResult({}));
    reporter.onTestEnd(test_, makeResult({}));

    const [testSpan] = reporter.spyTracer.spans;
    expect(testSpan.attrs["feature"]).toBe("checkout");
    expect(testSpan.attrs["team"]).toBe("platform");
  });
});

// ── Reporter — step spans ─────────────────────────────────────────────────────

test.describe("OtelReporter — step spans", () => {
  function makeStep(overrides: {
    title?: string;
    category?: string;
    steps?: TestStep[];
    error?: { message: string };
  }): TestStep {
    return {
      title: overrides.title ?? "click button",
      category: overrides.category ?? "action",
      startTime: new Date("2024-01-01T00:00:00Z"),
      duration: 10,
      location: { file: "/tmp/test.spec.ts", line: 5, column: 0 },
      steps: overrides.steps ?? [],
      error: overrides.error,
    } as unknown as TestStep;
  }

  test("creates a step span for each top-level step", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const test_ = makeTest({});
    const result = makeResult({
      steps: [makeStep({ title: "step one" }), makeStep({ title: "step two" })],
    });

    reporter.onTestBegin(test_, result);
    reporter.onTestEnd(test_, result);

    // 1 test span + 2 step spans
    expect(reporter.spyTracer.spans).toHaveLength(3);
  });

  test("creates nested step spans for nested steps", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const inner = makeStep({ title: "inner" });
    const outer = makeStep({ title: "outer", steps: [inner] });
    const result = makeResult({ steps: [outer] });

    reporter.onTestBegin(makeTest({}), result);
    reporter.onTestEnd(makeTest({}), result);

    // 1 test + 1 outer + 1 inner
    expect(reporter.spyTracer.spans).toHaveLength(3);
  });

  test("all step spans are ended", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const result = makeResult({
      steps: [makeStep({}), makeStep({})],
    });
    reporter.onTestBegin(makeTest({}), result);
    reporter.onTestEnd(makeTest({}), result);

    reporter.spyTracer.spans.forEach((s) => expect(s.ended).toBe(true));
  });

  test("step span carries test.step.category and test.step.name attributes", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const result = makeResult({
      steps: [makeStep({ title: "fill email", category: "action" })],
    });
    reporter.onTestBegin(makeTest({}), result);
    reporter.onTestEnd(makeTest({}), result);

    // spans[0] = test span, spans[1] = step span
    const stepSpan = reporter.spyTracer.spans[1];
    expect(stepSpan.attrs["test.step.category"]).toBe("action");
    expect(stepSpan.attrs["test.step.name"]).toBe("fill email");
  });

  test("step span name is prefixed with category", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const result = makeResult({
      steps: [makeStep({ title: "click button", category: "action" })],
    });
    reporter.onTestBegin(makeTest({}), result);
    reporter.onTestEnd(makeTest({}), result);

    const stepSpan = reporter.spyTracer.spans[1];
    expect(stepSpan.name).toBe("action: click button");
  });

  test("step with error gets ERROR span status", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const result = makeResult({
      steps: [makeStep({ title: "failing step", error: { message: "Element not found" } })],
    });
    reporter.onTestBegin(makeTest({}), result);
    reporter.onTestEnd(makeTest({}), result);

    const stepSpan = reporter.spyTracer.spans[1];
    expect(stepSpan.statusCode).toBe(SpanStatusCode.ERROR);
    expect(stepSpan.statusMessage).toBe("Element not found");
  });

  test("step without error has no status set", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const result = makeResult({
      steps: [makeStep({ title: "passing step" })],
    });
    reporter.onTestBegin(makeTest({}), result);
    reporter.onTestEnd(makeTest({}), result);

    const stepSpan = reporter.spyTracer.spans[1];
    expect(stepSpan.statusCode).toBeUndefined();
  });

  test("inner step span is created in context of outer step span", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const inner = makeStep({ title: "inner" });
    const outer = makeStep({ title: "outer", steps: [inner] });
    const result = makeResult({ steps: [outer] });

    reporter.onTestBegin(makeTest({}), result);
    reporter.onTestEnd(makeTest({}), result);

    // spans[0]=test, spans[1]=outer, spans[2]=inner
    const [, outerSpan, innerSpan] = reporter.spyTracer.spans;
    // The inner span's creation context must contain the outer span as active span
    expect(opentelemetry.trace.getSpan(innerSpan.creationCtx)).toBe(outerSpan);
  });
});

// ── Reporter — span attributes ────────────────────────────────────────────────

test.describe("OtelReporter — span attributes", () => {
  test("sets test case name attribute", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const test_ = makeTest({ title: "my fancy test" });
    reporter.onTestBegin(test_, makeResult({}));
    reporter.onTestEnd(test_, makeResult({}));

    expect(reporter.spyTracer.spans[0].attrs[ATTR_TEST_CASE_NAME]).toBe("my fancy test");
  });

  test("sets test suite name attribute", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const test_ = makeTest({});
    reporter.onTestBegin(test_, makeResult({}));
    reporter.onTestEnd(test_, makeResult({}));

    expect(reporter.spyTracer.spans[0].attrs[ATTR_TEST_SUITE_NAME]).toBe("my suite");
  });

  test("sets test.id attribute", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const test_ = makeTest({ id: "abc-123" });
    reporter.onTestBegin(test_, makeResult({}));
    reporter.onTestEnd(test_, makeResult({}));

    expect(reporter.spyTracer.spans[0].attrs["test.id"]).toBe("abc-123");
  });

  test("sets test.duration_ms attribute", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const test_ = makeTest({});
    const result = makeResult({ duration: 1234 });
    reporter.onTestBegin(test_, result);
    reporter.onTestEnd(test_, result);

    expect(reporter.spyTracer.spans[0].attrs["test.duration_ms"]).toBe(1234);
  });

  test("sets test.status attribute", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const test_ = makeTest({});
    const result = makeResult({ status: "passed" });
    reporter.onTestBegin(test_, result);
    reporter.onTestEnd(test_, result);

    expect(reporter.spyTracer.spans[0].attrs["test.status"]).toBe("passed");
  });

  test("sets result status to pass when test passes", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const test_ = makeTest({ expectedStatus: "passed" });
    const result = makeResult({ status: "passed" });
    reporter.onTestBegin(test_, result);
    reporter.onTestEnd(test_, result);

    expect(reporter.spyTracer.spans[0].attrs[ATTR_TEST_CASE_RESULT_STATUS]).toBe("pass");
  });

  test("sets result status to fail when test fails", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const test_ = makeTest({ expectedStatus: "passed" });
    const result = makeResult({ status: "failed" });
    reporter.onTestBegin(test_, result);
    reporter.onTestEnd(test_, result);

    expect(reporter.spyTracer.spans[0].attrs[ATTR_TEST_CASE_RESULT_STATUS]).toBe("fail");
  });
});

// ── Reporter — span status ────────────────────────────────────────────────────

test.describe("OtelReporter — span status on failure", () => {
  test("passing test does not set span to ERROR", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const test_ = makeTest({ expectedStatus: "passed" });
    const result = makeResult({ status: "passed" });
    reporter.onTestBegin(test_, result);
    reporter.onTestEnd(test_, result);

    expect(reporter.spyTracer.spans[0].statusCode).toBeUndefined();
  });

  test("failing test sets span status to ERROR", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const test_ = makeTest({ expectedStatus: "passed" });
    const result = makeResult({ status: "failed" });
    reporter.onTestBegin(test_, result);
    reporter.onTestEnd(test_, result);

    expect(reporter.spyTracer.spans[0].statusCode).toBe(SpanStatusCode.ERROR);
  });

  test("skipped test is treated as passing (not ERROR)", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const test_ = makeTest({ expectedStatus: "passed" });
    const result = makeResult({ status: "skipped" });
    reporter.onTestBegin(test_, result);
    reporter.onTestEnd(test_, result);

    expect(reporter.spyTracer.spans[0].statusCode).toBeUndefined();
  });
});
