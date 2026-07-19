import { test, expect } from "@playwright/test";
import { Event } from "@playwright-labs/prometheus-core";
import type { Timeseries } from "prometheus-remote-write";

import PrometheusReporter, { type PrometheusOptions } from "../src/reporter";

import type {
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  TestStep,
  TestError,
} from "@playwright/test/reporter";

const SERVER_URL = "http://localhost:9090/api/v1/write";

// ── Test doubles ──────────────────────────────────────────────────────────────

/** Reporter subclass that captures outgoing series instead of pushing them. */
class TestReporter extends PrometheusReporter {
  readonly sent: Timeseries[][] = [];

  protected override async send(series: Timeseries | Timeseries[]) {
    this.sent.push(Array.isArray(series) ? series : [series]);
  }

  get sentFlat(): Timeseries[] {
    return this.sent.flat();
  }
}

// ── Fixtures for Playwright reporter types ────────────────────────────────────

function makeConfig(overrides: {
  projects?: Array<{
    name: string;
    outputDir: string;
    repeatEach: number;
    snapshotDir: string;
    testDir: string;
    timeout: number;
  }>;
} = {}): FullConfig {
  return {
    version: "1.0.0",
    configFile: "/tmp/playwright.config.ts",
    workers: 1,
    fullyParallel: false,
    shard: null,
    rootDir: "/tmp",
    projects: overrides.projects ?? [],
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
    titlePath: () => ["", "my suite", "my test", "my test"],
  } as unknown as TestCase;
}

function makeResult(overrides: {
  status?: string;
  duration?: number;
  steps?: TestStep[];
  attachments?: TestResult["attachments"];
}): TestResult {
  return {
    startTime: new Date("2024-01-01T00:00:00Z"),
    duration: overrides.duration ?? 100,
    status: overrides.status ?? "passed",
    retry: 0,
    workerIndex: 0,
    parallelIndex: 0,
    attachments: overrides.attachments ?? [],
    steps: overrides.steps ?? [],
    error: undefined,
  } as unknown as TestResult;
}

function makeStep(overrides: {
  title?: string;
  category?: string;
  duration?: number;
  error?: { message: string };
}): TestStep {
  return {
    category: overrides.category ?? "test.step",
    title: overrides.title ?? "my step",
    startTime: new Date("2024-01-01T00:00:00Z"),
    duration: overrides.duration ?? 42,
    steps: [],
    location: { file: "/tmp/test.spec.ts", line: 5, column: 0 },
    titlePath: () => ["", "my suite", "my test", overrides.title ?? "my step"],
    error: overrides.error,
  } as unknown as TestStep;
}

function findSeries(
  reporter: TestReporter,
  name: string,
): Timeseries | undefined {
  return reporter.sentFlat.find((s) => s.labels.__name__ === name);
}

// ── Reporter — constructor ────────────────────────────────────────────────────

test.describe("PrometheusReporter — constructor", () => {
  test("throws TypeError when serverUrl is missing", () => {
    expect(() => new PrometheusReporter({} as PrometheusOptions)).toThrow(
      TypeError,
    );
  });

  test("throws TypeError when serverUrl is not a valid URL", () => {
    expect(
      () => new PrometheusReporter({ serverUrl: "not-a-url" }),
    ).toThrow(TypeError);
  });

  test("accepts a string serverUrl", () => {
    expect(() => new TestReporter({ serverUrl: SERVER_URL })).not.toThrow();
  });

  test("accepts a URL instance as serverUrl", () => {
    expect(
      () => new TestReporter({ serverUrl: new URL(SERVER_URL) }),
    ).not.toThrow();
  });
});

// ── Reporter — metric naming ──────────────────────────────────────────────────

test.describe("PrometheusReporter — metric naming", () => {
  test("all sent series use the default pw_ prefix", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());
    const test_ = makeTest({});
    await reporter.onTestEnd(test_, makeResult({}));
    await reporter.onExit();

    expect(reporter.sentFlat.length).toBeGreaterThan(0);
    for (const series of reporter.sentFlat) {
      expect(series.labels.__name__).toMatch(/^pw_/);
    }
  });

  test("custom prefix is applied to all sent series", async () => {
    const reporter = new TestReporter({
      serverUrl: SERVER_URL,
      prefix: "custom_",
    });
    reporter.onBegin(makeConfig(), makeSuite());
    const test_ = makeTest({});
    await reporter.onTestEnd(test_, makeResult({}));
    await reporter.onExit();

    expect(reporter.sentFlat.length).toBeGreaterThan(0);
    for (const series of reporter.sentFlat) {
      expect(series.labels.__name__).toMatch(/^custom_/);
    }
  });
});

// ── Reporter — onTestEnd totals ───────────────────────────────────────────────

test.describe("PrometheusReporter — onTestEnd", () => {
  test("a passed test increments totals", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());
    const test_ = makeTest({ title: "my passing test" });
    await reporter.onTestEnd(test_, makeResult({ status: "passed" }));
    await reporter.onExit();

    expect(
      findSeries(reporter, "pw_tests_total_count")?.samples.at(-1)?.value,
    ).toBe(1);
    expect(
      findSeries(reporter, "pw_tests_passed_count")?.samples.at(-1)?.value,
    ).toBe(1);

    const duration = findSeries(reporter, "pw_test_duration");
    expect(duration).toBeDefined();
    expect(duration?.labels.title).toBe("my passing test");
  });

  test("a failed test increments pw_tests_failed_count", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());
    const test_ = makeTest({});
    await reporter.onTestEnd(test_, makeResult({ status: "failed" }));
    await reporter.onExit();

    expect(
      findSeries(reporter, "pw_tests_failed_count")?.samples.at(-1)?.value,
    ).toBe(1);
    expect(
      findSeries(reporter, "pw_tests_passed_count")?.samples.at(-1)?.value,
    ).toBe(0);
  });

  test("a skipped test increments pw_tests_skipped_count", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());
    const test_ = makeTest({});
    await reporter.onTestEnd(test_, makeResult({ status: "skipped" }));
    await reporter.onExit();

    expect(
      findSeries(reporter, "pw_tests_skipped_count")?.samples.at(-1)?.value,
    ).toBe(1);
  });

  test("a timed out test increments pw_tests_timed_out_count", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());
    const test_ = makeTest({});
    await reporter.onTestEnd(test_, makeResult({ status: "timedOut" }));
    await reporter.onExit();

    expect(
      findSeries(reporter, "pw_tests_timed_out_count")?.samples.at(-1)?.value,
    ).toBe(1);
  });
});

// ── Reporter — attachments ────────────────────────────────────────────────────

test.describe("PrometheusReporter — attachments", () => {
  test("attachment with body produces a pw_test_attachment_size series", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());
    const test_ = makeTest({});
    const result = makeResult({
      attachments: [
        {
          name: "screenshot",
          contentType: "image/png",
          path: "/tmp/screenshot.png",
          body: Buffer.from("hello"),
        },
      ],
    });
    await reporter.onTestEnd(test_, result);

    const sizeSeries = findSeries(reporter, "pw_test_attachment_size");
    expect(sizeSeries).toBeDefined();
    expect(sizeSeries?.labels.testId).toBe("test-1");
    expect(sizeSeries?.samples.at(-1)?.value).toBe(5);
  });

  test("attachment with body produces a pw_test_attachment_count series", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());
    const test_ = makeTest({});
    const result = makeResult({
      attachments: [
        {
          name: "screenshot",
          contentType: "image/png",
          path: "/tmp/screenshot.png",
          body: Buffer.from("hello"),
        },
      ],
    });
    await reporter.onTestEnd(test_, result);

    const countSeries = findSeries(reporter, "pw_test_attachment_count");
    expect(countSeries).toBeDefined();
    expect(countSeries?.labels.attachmentName).toBe("screenshot");
    expect(countSeries?.samples.at(-1)?.value).toBe(1);
  });
});

// ── Reporter — annotations ────────────────────────────────────────────────────

test.describe("PrometheusReporter — annotations", () => {
  test("annotations produce a pw_test_annotation_count series with type/description labels", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());
    const test_ = makeTest({
      annotations: [{ type: "issue", description: "JIRA-123" }],
    });
    await reporter.onTestEnd(test_, makeResult({}));

    const annotation = findSeries(reporter, "pw_test_annotation_count");
    expect(annotation).toBeDefined();
    expect(annotation?.labels.type).toBe("issue");
    expect(annotation?.labels.description).toBe("JIRA-123");
  });
});

// ── Reporter — onStepEnd ──────────────────────────────────────────────────────

test.describe("PrometheusReporter — onStepEnd", () => {
  test("sends pw_test_step_duration and pw_test_step immediately", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());

    const test_ = makeTest({});
    await reporter.onStepEnd(test_, makeResult({}), makeStep({}));

    // Series are pushed in onStepEnd itself — no onExit needed.
    const names = reporter.sentFlat.map((s) => s.labels.__name__);
    expect(names).toHaveLength(3);
    expect(names).toContain("pw_test_step_duration");
    expect(names).toContain("pw_test_step");

    const stepSeries = findSeries(reporter, "pw_test_step");
    expect(stepSeries?.labels.category).toBe("test.step");
    expect(stepSeries?.labels.testTitle).toBe("my test");
  });

  test("a step with error produces error labels on pw_test_step_error_count", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());

    const test_ = makeTest({});
    await reporter.onStepEnd(
      test_,
      makeResult({}),
      makeStep({ error: { message: "boom" } }),
    );

    const errorSeries = findSeries(reporter, "pw_test_step_error_count");
    expect(errorSeries).toBeDefined();
    expect(errorSeries?.labels.errorMessage).toBe("boom");
    expect(errorSeries?.labels.errorSnippet).toBe("<unknown snippet>");
  });
});

// ── Reporter — onError ────────────────────────────────────────────────────────

test.describe("PrometheusReporter — onError", () => {
  test("onError does not throw and onExit still completes", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());

    reporter.onError({
      message: "boom",
      location: { file: "/tmp/test.spec.ts", line: 1, column: 0 },
    } as TestError);
    await reporter.onExit();

    expect(reporter.sentFlat.length).toBeGreaterThan(0);
  });

  test("sends a pw_error_count series after onError and onExit", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());

    reporter.onError({
      message: "boom",
      location: { file: "/tmp/test.spec.ts", line: 1, column: 0 },
    } as TestError);
    await reporter.onExit();

    const errorSeries = findSeries(reporter, "pw_error_count");
    expect(errorSeries).toBeDefined();
    expect(errorSeries?.labels.message).toBe("boom");
    expect(errorSeries?.samples.at(-1)?.value).toBe(1);
  });
});

// ── Reporter — onStdOut ───────────────────────────────────────────────────────

test.describe("PrometheusReporter — onStdOut", () => {
  test("forwards an Event JSON payload as a prefixed series immediately", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    const event = new Event({
      labels: { __name__: "my_metric", foo: "bar" },
      samples: [{ value: 1, timestamp: Date.now() }],
    });

    await reporter.onStdOut(JSON.stringify(event), undefined, undefined);

    expect(reporter.sentFlat).toHaveLength(1);
    expect(reporter.sentFlat[0].labels.__name__).toBe("pw_my_metric");
    expect(reporter.sentFlat[0].labels.foo).toBe("bar");
  });

  test("plain non-JSON text sends nothing immediately", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });

    await reporter.onStdOut("just some logs", undefined, undefined);

    expect(reporter.sentFlat).toHaveLength(0);
  });
});

// ── Reporter — onBegin ────────────────────────────────────────────────────────

test.describe("PrometheusReporter — onBegin", () => {
  test("sends pw_config and one pw_project series per project on exit", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    const config = makeConfig({
      projects: [
        {
          name: "chromium",
          outputDir: "/tmp/test-results",
          repeatEach: 1,
          snapshotDir: "/tmp/snapshots",
          testDir: "/tmp/tests",
          timeout: 30000,
        },
      ],
    });
    reporter.onBegin(config, makeSuite());
    await reporter.onExit();

    expect(findSeries(reporter, "pw_config")).toBeDefined();

    const projects = reporter.sentFlat.filter(
      (s) => s.labels.__name__ === "pw_project",
    );
    expect(projects).toHaveLength(1);
    expect(projects[0].labels.projectName).toBe("chromium");
  });
});

// ── Reporter — printsToStdio ──────────────────────────────────────────────────

test.describe("PrometheusReporter — printsToStdio", () => {
  test("returns false", () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    expect(reporter.printsToStdio()).toBe(false);
  });
});
