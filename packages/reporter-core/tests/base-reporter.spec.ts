import { test, expect } from "@playwright/test";
import type {
  FullConfig,
  FullResult,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

import {
  BaseReporter,
  type TestCases,
  type StatusCounts,
} from "../src/index";

/** Concrete subclass exposing the protected state for assertions. */
class TestReporter extends BaseReporter {
  get collected(): TestCases {
    return this.testCases;
  }
  get statusCounts(): StatusCounts {
    return this.counts;
  }
  get resolvedConfig(): FullConfig | undefined {
    return this.config;
  }
  resolve<T>(value: Parameters<BaseReporter["resolveTemplate"]>[0], result: FullResult) {
    return this.resolveTemplate<T>(value, result);
  }
}

function makeConfig(): FullConfig {
  return { version: "1.0.0", workers: 1 } as unknown as FullConfig;
}

function makeSuite(): Suite {
  return { title: "" } as unknown as Suite;
}

function makeTest(overrides: { id?: string; title?: string } = {}): TestCase {
  return {
    id: overrides.id ?? "test-1",
    title: overrides.title ?? "my test",
  } as unknown as TestCase;
}

function makeResult(status: TestResult["status"]): TestResult {
  return {
    status,
    startTime: new Date("2024-01-01T00:00:00Z"),
    duration: 100,
  } as unknown as TestResult;
}

function makeFullResult(status: FullResult["status"] = "passed"): FullResult {
  return { status, duration: 45_300 } as unknown as FullResult;
}

test.describe("BaseReporter — accumulation", () => {
  test("collects test cases with results in execution order", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const t1 = makeTest({ id: "t1", title: "first" });
    const t2 = makeTest({ id: "t2", title: "second" });
    reporter.onTestEnd(t1, makeResult("passed"));
    reporter.onTestEnd(t2, makeResult("failed"));

    expect(reporter.collected).toHaveLength(2);
    expect(reporter.collected[0][0]).toBe(t1);
    expect(reporter.collected[0][1].status).toBe("passed");
    expect(reporter.collected[1][0]).toBe(t2);
    expect(reporter.collected[1][1].status).toBe("failed");
  });

  test("counts every status", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());

    const t = makeTest({});
    reporter.onTestEnd(t, makeResult("passed"));
    reporter.onTestEnd(t, makeResult("passed"));
    reporter.onTestEnd(t, makeResult("failed"));
    reporter.onTestEnd(t, makeResult("timedOut"));
    reporter.onTestEnd(t, makeResult("skipped"));
    reporter.onTestEnd(t, makeResult("interrupted"));

    expect(reporter.statusCounts).toEqual({
      passed: 2,
      failed: 1,
      timedOut: 1,
      skipped: 1,
      interrupted: 1,
    });
  });

  test("onBegin stores config and resets previous state", () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());
    reporter.onTestEnd(makeTest({}), makeResult("failed"));
    expect(reporter.statusCounts.failed).toBe(1);

    const config = makeConfig();
    reporter.onBegin(config, makeSuite());

    expect(reporter.resolvedConfig).toBe(config);
    expect(reporter.collected).toHaveLength(0);
    expect(reporter.statusCounts.failed).toBe(0);
  });
});

test.describe("BaseReporter — resolveTemplate", () => {
  test("returns static values as-is", async () => {
    const reporter = new TestReporter();
    await expect(reporter.resolve<string>("hello", makeFullResult())).resolves.toBe("hello");
  });

  test("returns undefined for undefined", async () => {
    const reporter = new TestReporter();
    await expect(reporter.resolve(undefined, makeFullResult())).resolves.toBeUndefined();
  });

  test("calls template functions with (result, testCases)", async () => {
    const reporter = new TestReporter();
    reporter.onBegin(makeConfig(), makeSuite());
    reporter.onTestEnd(makeTest({ title: "a" }), makeResult("passed"));
    reporter.onTestEnd(makeTest({ title: "b" }), makeResult("failed"));

    const result = makeFullResult("failed");
    const resolved = await reporter.resolve<string>(
      (r, testCases) =>
        `${r.status}: ${testCases.map(([t]) => t.title).join(",")}`,
      result,
    );

    expect(resolved).toBe("failed: a,b");
  });

  test("awaits promise-returning templates", async () => {
    const reporter = new TestReporter();
    const resolved = await reporter.resolve<string>(
      async (r) => `async ${r.status}`,
      makeFullResult(),
    );
    expect(resolved).toBe("async passed");
  });
});

test.describe("BaseReporter — printsToStdio", () => {
  test("returns false", () => {
    expect(new TestReporter().printsToStdio()).toBe(false);
  });
});
