import { test, expect } from "@playwright/test";
import { Event } from "@playwright-labs/prometheus-core";
import type { Timeseries } from "prometheus-remote-write";

import PrometheusReporter, { type PrometheusOptions } from "../src/reporter";

import type {
  FullConfig,
  FullResult,
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
  children?: TestStep[];
}): TestStep {
  return {
    category: overrides.category ?? "test.step",
    title: overrides.title ?? "my step",
    startTime: new Date("2024-01-01T00:00:00Z"),
    duration: overrides.duration ?? 42,
    steps: overrides.children ?? [],
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
    expect(names).toHaveLength(4);
    expect(names).toContain("pw_test_step_duration");
    expect(names).toContain("pw_test_step");
    // otel-compatible alias is flushed in the same batch
    expect(names).toContain("pw_test_step_count_total");

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

  test("forwards two newline-separated events from a single chunk", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    const event1 = new Event({
      labels: { __name__: "metric_one" },
      samples: [{ value: 1, timestamp: Date.now() }],
    });
    const event2 = new Event({
      labels: { __name__: "metric_two" },
      samples: [{ value: 2, timestamp: Date.now() }],
    });

    await reporter.onStdOut(
      `${JSON.stringify(event1)}\n${JSON.stringify(event2)}\n`,
      undefined,
      undefined,
    );

    expect(reporter.sentFlat).toHaveLength(2);
    expect(reporter.sentFlat[0].labels.__name__).toBe("pw_metric_one");
    expect(reporter.sentFlat[1].labels.__name__).toBe("pw_metric_two");
  });

  test("forwards an event split across two chunks only after the second chunk", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    const event = new Event({
      labels: { __name__: "my_metric", foo: "bar" },
      samples: [{ value: 1, timestamp: Date.now() }],
    });
    const text = JSON.stringify(event);
    const mid = Math.floor(text.length / 2);

    await reporter.onStdOut(text.slice(0, mid), undefined, undefined);
    expect(reporter.sentFlat).toHaveLength(0);

    await reporter.onStdOut(text.slice(mid), undefined, undefined);
    expect(reporter.sentFlat).toHaveLength(1);
    expect(reporter.sentFlat[0].labels.__name__).toBe("pw_my_metric");
  });

  test("plain text lines increment pw_stdout with internal=false", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });

    await reporter.onStdOut("just some logs\nmore logs\n", undefined, undefined);
    await reporter.onExit();

    const stdout = findSeries(reporter, "pw_stdout");
    expect(stdout).toBeDefined();
    expect(stdout?.labels.internal).toBe("false");
    expect(stdout?.samples.at(-1)?.value).toBe(2);
  });

  test("flushes a buffered non-JSON remainder on onExit", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });

    await reporter.onStdOut("unterminated plain text", undefined, undefined);
    expect(reporter.sentFlat).toHaveLength(0);

    await reporter.onExit();

    const stdout = findSeries(reporter, "pw_stdout");
    expect(stdout).toBeDefined();
    expect(stdout?.labels.internal).toBe("false");
    expect(stdout?.labels.text).toBe("unterminated plain text");
    expect(stdout?.samples.at(-1)?.value).toBe(1);
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


// ── Reporter — expect.poll metrics ────────────────────────────────────────────

test.describe("PrometheusReporter — expect.poll metrics", () => {
  function makePollStep(overrides: {
    attempts?: number;
    duration?: number;
    error?: { message: string };
    title?: string;
  }): TestStep {
    const attempts = overrides.attempts ?? 3;
    return makeStep({
      title: overrides.title ?? "counter",
      category: "expect",
      duration: overrides.duration ?? 350,
      error: overrides.error,
      children: Array.from({ length: attempts }, (_, i) =>
        makeStep({
          title: overrides.title ?? "counter",
          category: "expect",
          duration: 1,
          ...(i + 1 < attempts ? { error: { message: "not yet" } } : {}),
        }),
      ),
    });
  }

  test("a successful poll produces pass/attempts/duration series", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());

    await reporter.onStepEnd(
      makeTest({}),
      makeResult({}),
      makePollStep({ attempts: 3, duration: 350 }),
    );

    const total = findSeries(reporter, "pw_expect_poll_total");
    expect(total?.labels.outcome).toBe("pass");
    expect(total?.samples.at(-1)?.value).toBe(1);

    const attempts = findSeries(reporter, "pw_expect_poll_attempts");
    expect(attempts?.labels.outcome).toBe("pass");
    expect(attempts?.samples.at(-1)?.value).toBe(3);

    const duration = findSeries(reporter, "pw_expect_poll_duration");
    expect(duration?.samples.at(-1)?.value).toBe(350);
  });

  test("a timed-out poll is labeled outcome=timeout", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());

    await reporter.onStepEnd(
      makeTest({}),
      makeResult({}),
      makePollStep({ attempts: 2, error: { message: "poll timed out" } }),
    );

    const total = findSeries(reporter, "pw_expect_poll_total");
    expect(total?.labels.outcome).toBe("timeout");
  });

  test("a toPass step is detected as a poll with one attempt", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());

    await reporter.onStepEnd(
      makeTest({}),
      makeResult({}),
      makeStep({ title: 'Expect "toPass"', category: "expect", duration: 12 }),
    );

    const attempts = findSeries(reporter, "pw_expect_poll_attempts");
    expect(attempts?.samples.at(-1)?.value).toBe(1);
  });

  test("plain steps produce no expect_poll series", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());

    await reporter.onStepEnd(
      makeTest({}),
      makeResult({}),
      makeStep({ title: "click button", category: "pw:api" }),
    );

    expect(reporter.sentFlat.some((s) => s.labels.__name__?.startsWith("pw_expect_poll"))).toBe(false);
  });
});


// ── Reporter — unified (otel-compatible) aliases ─────────────────────────────

test.describe("PrometheusReporter — unified otel-compatible aliases", () => {
  test("onTestEnd emits pw_tests_total with otel label semantics", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());

    await reporter.onTestEnd(makeTest({}), makeResult({ status: "passed" }));

    const series = findSeries(reporter, "pw_tests_total");
    expect(series).toBeDefined();
    expect(series?.labels["test_status"]).toBe("passed");
    expect(series?.labels["test_result"]).toBe("pass");
    expect(series?.labels["test_suite"]).toBe("my suite");
    expect(series?.samples.at(-1)?.value).toBe(1);
  });

  test("a failed test is labeled test.result=fail", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());

    await reporter.onTestEnd(makeTest({}), makeResult({ status: "failed" }));

    const series = findSeries(reporter, "pw_tests_total");
    expect(series?.labels["test_result"]).toBe("fail");
  });

  test("different suites produce separate pw_tests_total series", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());

    const t1 = makeTest({});
    await reporter.onTestEnd(t1, makeResult({}));
    const t2 = makeTest({});
    (t2 as { parent: { title: string } }).parent = {
      title: "other suite",
    } as never;
    await reporter.onTestEnd(t2, makeResult({}));

    const suites = reporter.sentFlat
      .filter((s) => s.labels.__name__ === "pw_tests_total")
      .map((s) => s.labels["test_suite"]);
    expect(suites).toContain("my suite");
    expect(suites).toContain("other suite");
  });

  test("retry emits pw_test_retries_total with the retry count", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());

    const result = makeResult({});
    (result as { retry: number }).retry = 2;
    await reporter.onTestEnd(makeTest({}), result);

    const series = findSeries(reporter, "pw_test_retries_total");
    expect(series).toBeDefined();
    expect(series?.labels["test_suite"]).toBe("my suite");
    expect(series?.samples.at(-1)?.value).toBe(2);
  });

  test("onStepEnd emits pw_test_step_count_total with category and suite", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());

    await reporter.onStepEnd(
      makeTest({}),
      makeResult({}),
      makeStep({ category: "expect", title: "check" }),
    );

    const series = findSeries(reporter, "pw_test_step_count_total");
    expect(series).toBeDefined();
    expect(series?.labels["test_step_category"]).toBe("expect");
    expect(series?.labels["test_suite"]).toBe("my suite");
  });

  test("onError emits pw_test_error_count_total with otel labels on onExit", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());

    reporter.onError({
      message: "boom",
      location: { file: "/tmp/test.spec.ts", line: 1, column: 0 },
    } as TestError);
    await reporter.onExit();

    const series = findSeries(reporter, "pw_test_error_count_total");
    expect(series).toBeDefined();
    expect(series?.labels["error_message"]).toBe("boom");
    expect(series?.labels["error_location"]).toBeDefined();
    expect(series?.samples.at(-1)?.value).toBe(1);
  });

  test("onEnd + onExit flush pw_run_duration and process_* aliases", async () => {
    const reporter = new TestReporter({ serverUrl: SERVER_URL });
    reporter.onBegin(makeConfig(), makeSuite());

    reporter.onEnd({ status: "passed", duration: 12_345 } as unknown as FullResult);
    await reporter.onExit();

    const run = findSeries(reporter, "pw_run_duration");
    expect(run?.samples.at(-1)?.value).toBe(12_345);

    expect(findSeries(reporter, "pw_process_memory_heap_used")).toBeDefined();
    expect(findSeries(reporter, "pw_process_memory_rss")).toBeDefined();
    expect(findSeries(reporter, "pw_os_memory_free")).toBeDefined();
    expect(findSeries(reporter, "pw_process_cpu_user")).toBeDefined();
  });
});
