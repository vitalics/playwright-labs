import { test, expect } from "@playwright/test";
import type {
  FullConfig,
  FullResult,
  Suite,
  TestCase,
  TestError,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";
import InlineReporter from "../src/reporter";
import type { InlineReporterOptions } from "../src/reporter";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockConfig = { rootDir: "/repo" } as unknown as FullConfig;
const mockSuite = { title: "root" } as unknown as Suite;

function makeTestCase(title: string): TestCase {
  return { id: `id-${title}`, title } as unknown as TestCase;
}

function makeTestResult(status: TestResult["status"] = "passed"): TestResult {
  return { status, duration: 100 } as unknown as TestResult;
}

const mockStep = { title: "step" } as unknown as TestStep;
const mockError = { message: "boom" } as unknown as TestError;
const passedRun: FullResult = {
  status: "passed",
  startTime: new Date(),
  duration: 5000,
};

// ---------------------------------------------------------------------------
// hook wiring
// ---------------------------------------------------------------------------

test.describe("hook wiring", () => {
  test("every option callback fires with the hook arguments", async () => {
    const calls: string[] = [];
    const reporter = new InlineReporter({
      onBegin: (config, suite) => {
        calls.push(`begin:${(config as any).rootDir}:${(suite as any).title}`);
      },
      onTestBegin: (t) => void calls.push(`test.begin:${t.title}`),
      onStepBegin: (_t, _r, s) => void calls.push(`step.begin:${s.title}`),
      onStepEnd: (_t, _r, s) => void calls.push(`step.end:${s.title}`),
      onStdOut: (chunk) => void calls.push(`stdOut:${chunk}`),
      onStdErr: (chunk) => void calls.push(`stdErr:${chunk}`),
      onTestEnd: (t) => void calls.push(`test.end:${t.title}`),
      onError: (e) => void calls.push(`error:${e.message}`),
      onEnd: (r) => void calls.push(`end:${r.status}`),
      onExit: () => void calls.push("exit"),
    });

    reporter.onBegin(mockConfig, mockSuite);
    reporter.onTestBegin(makeTestCase("a"), makeTestResult());
    reporter.onStepBegin(makeTestCase("a"), makeTestResult(), mockStep);
    reporter.onStepEnd(makeTestCase("a"), makeTestResult(), mockStep);
    reporter.onStdOut("out", undefined, undefined);
    reporter.onStdErr("err", undefined, undefined);
    reporter.onTestEnd(makeTestCase("a"), makeTestResult());
    reporter.onError(mockError);
    await reporter.onEnd(passedRun);
    await reporter.onExit();

    expect(calls).toEqual([
      "begin:/repo:root",
      "test.begin:a",
      "step.begin:step",
      "step.end:step",
      "stdOut:out",
      "stdErr:err",
      "test.end:a",
      "error:boom",
      "end:passed",
      "exit",
    ]);
  });

  test("works without any options", async () => {
    const reporter = new InlineReporter();
    reporter.onBegin(mockConfig, mockSuite);
    reporter.onTestBegin(makeTestCase("a"), makeTestResult());
    reporter.onStepBegin(makeTestCase("a"), makeTestResult(), mockStep);
    reporter.onStepEnd(makeTestCase("a"), makeTestResult(), mockStep);
    reporter.onStdOut("out", undefined, undefined);
    reporter.onStdErr("err", undefined, undefined);
    reporter.onTestEnd(makeTestCase("a"), makeTestResult());
    reporter.onError(mockError);
    await reporter.onEnd(passedRun);
    await reporter.onExit();
  });
});

// ---------------------------------------------------------------------------
// onEnd return value
// ---------------------------------------------------------------------------

test.describe("onEnd", () => {
  test("returned status override is propagated to Playwright", async () => {
    const reporter = new InlineReporter({
      onEnd: () => ({ status: "failed" as const }),
    });

    const returned = await reporter.onEnd(passedRun);
    expect(returned).toEqual({ status: "failed" });
  });

  test("async onEnd is awaited", async () => {
    let finished = false;
    const reporter = new InlineReporter({
      onEnd: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        finished = true;
      },
    });

    await reporter.onEnd(passedRun);
    expect(finished).toBe(true);
  });

  test("onEnd callback is called exactly once", async () => {
    let count = 0;
    const reporter = new InlineReporter({ onEnd: () => void count++ });
    await reporter.onEnd(passedRun);
    expect(count).toBe(1);
  });

  test("returns undefined without onEnd option", async () => {
    const reporter = new InlineReporter();
    expect(await reporter.onEnd(passedRun)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// onExit
// ---------------------------------------------------------------------------

test.describe("onExit", () => {
  test("async onExit is awaited", async () => {
    let finished = false;
    const reporter = new InlineReporter({
      onExit: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        finished = true;
      },
    });

    await reporter.onExit();
    expect(finished).toBe(true);
  });

  test("onExit callback is called exactly once", async () => {
    let count = 0;
    const reporter = new InlineReporter({ onExit: () => void count++ });
    await reporter.onExit();
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// printsToStdio
// ---------------------------------------------------------------------------

test.describe("printsToStdio", () => {
  test("defaults to false", () => {
    expect(new InlineReporter().printsToStdio()).toBe(false);
  });

  test("respects the option", () => {
    expect(
      new InlineReporter({ printsToStdio: () => true }).printsToStdio(),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// emitter escape hatch
// ---------------------------------------------------------------------------

test.describe("event emitter", () => {
  test("external listeners receive events alongside option callbacks", async () => {
    const seen: string[] = [];
    const reporter = new InlineReporter({
      onTestEnd: () => void seen.push("option"),
    });
    reporter.on("test.end", () => void seen.push("listener"));

    reporter.onTestEnd(makeTestCase("a"), makeTestResult());
    expect(seen).toEqual(["option", "listener"]);
  });
});

// ---------------------------------------------------------------------------
// options type sanity
// ---------------------------------------------------------------------------

test("accepts a partial options object", () => {
  const options: InlineReporterOptions = { onBegin: () => {} };
  expect(() => new InlineReporter(options)).not.toThrow();
});
