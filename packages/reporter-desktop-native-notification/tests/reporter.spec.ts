import { test, expect } from "@playwright/test";

import DesktopNotificationReporter, {
  type NotificationPayload,
} from "../src/reporter";

import type {
  FullConfig,
  FullResult,
  Suite,
  TestCase,
  TestResult,
  TestError,
} from "@playwright/test/reporter";

// ── Test doubles ──────────────────────────────────────────────────────────────

/** Reporter subclass that captures notifications instead of sending them. */
class TestReporter extends DesktopNotificationReporter {
  readonly notifications: NotificationPayload[] = [];

  protected override async notify(payload: NotificationPayload) {
    this.notifications.push(payload);
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

function makeTest(overrides: { id?: string; title?: string } = {}): TestCase {
  return {
    id: overrides.id ?? "test-1",
    title: overrides.title ?? "my test",
  } as unknown as TestCase;
}

function makeResult(overrides: { status?: string } = {}): TestResult {
  return {
    startTime: new Date("2024-01-01T00:00:00Z"),
    duration: 100,
    status: overrides.status ?? "passed",
  } as unknown as TestResult;
}

function makeFullResult(
  overrides: { status?: string; duration?: number } = {},
): FullResult {
  return {
    status: overrides.status ?? "passed",
    duration: overrides.duration ?? 45_300,
    startTime: new Date("2024-01-01T00:00:00Z"),
  } as unknown as FullResult;
}

/** Runs a full onBegin → onTestEnd × n → onEnd cycle. */
async function runToCompletion(
  reporter: TestReporter,
  statuses: string[],
  fullResult: { status?: string; duration?: number } = {},
): Promise<void> {
  reporter.onBegin(makeConfig(), makeSuite());
  const test_ = makeTest();
  for (const status of statuses) {
    await reporter.onTestEnd(test_, makeResult({ status }));
  }
  await reporter.onEnd(makeFullResult(fullResult));
}

// ── CI environment isolation ──────────────────────────────────────────────────
// The reporter is silent when process.env.CI is set, so every test starts
// from a clean slate and the original value is restored afterwards.

let originalCi: string | undefined;

test.beforeEach(() => {
  originalCi = process.env.CI;
  delete process.env.CI;
});

test.afterEach(() => {
  if (originalCi === undefined) {
    delete process.env.CI;
  } else {
    process.env.CI = originalCi;
  }
});

// ── Reporter — onEnd summary ──────────────────────────────────────────────────

test.describe("DesktopNotificationReporter — onEnd summary", () => {
  test("sends exactly one notification with the derived title, counts and duration", async () => {
    const reporter = new TestReporter();
    await runToCompletion(reporter, ["passed", "passed"], {
      status: "passed",
      duration: 45_300,
    });

    expect(reporter.notifications).toHaveLength(1);
    const [notification] = reporter.notifications;
    expect(notification.title).toBe("Playwright — Passed");
    expect(notification.message).toContain("✓ 2 passed");
    expect(notification.message).toContain("45.3s");
  });

  test("derives the title from a failed run status", async () => {
    const reporter = new TestReporter();
    await runToCompletion(reporter, ["failed"], { status: "failed" });

    expect(reporter.notifications[0].title).toBe("Playwright — Failed");
  });

  test("counts failed, skipped, timed out and interrupted tests", async () => {
    const reporter = new TestReporter();
    await runToCompletion(
      reporter,
      ["passed", "passed", "failed", "skipped", "timedOut", "interrupted"],
      { status: "failed" },
    );

    const { message } = reporter.notifications[0];
    expect(message).toContain("✓ 2 passed");
    expect(message).toContain("✗ 1 failed");
    expect(message).toContain("⊘ 1 skipped");
    expect(message).toContain("⏱ 1 timed out");
    expect(message).toContain("⚠ 1 interrupted");
  });

  test("always shows the passed count, even when it is zero", async () => {
    const reporter = new TestReporter();
    await runToCompletion(reporter, ["failed", "failed"], {
      status: "failed",
    });

    const { message } = reporter.notifications[0];
    expect(message).toContain("✓ 0 passed");
    expect(message).toContain("✗ 2 failed");
  });

  test("falls back to 'No tests run' when no test results were reported", async () => {
    const reporter = new TestReporter();
    await runToCompletion(reporter, [], { status: "passed", duration: 1_234 });

    expect(reporter.notifications[0].message).toBe("No tests run in 1.2s");
  });
});

// ── Reporter — notifyOn option ────────────────────────────────────────────────

test.describe("DesktopNotificationReporter — notifyOn option", () => {
  test('"failure" notifies for a failed run but not for a passed one', async () => {
    const failed = new TestReporter({ notifyOn: "failure" });
    await runToCompletion(failed, ["failed"], { status: "failed" });
    expect(failed.notifications).toHaveLength(1);

    const passed = new TestReporter({ notifyOn: "failure" });
    await runToCompletion(passed, ["passed"], { status: "passed" });
    expect(passed.notifications).toHaveLength(0);
  });

  test('"success" notifies for a passed run but not for a failed one', async () => {
    const passed = new TestReporter({ notifyOn: "success" });
    await runToCompletion(passed, ["passed"], { status: "passed" });
    expect(passed.notifications).toHaveLength(1);

    const failed = new TestReporter({ notifyOn: "success" });
    await runToCompletion(failed, ["failed"], { status: "failed" });
    expect(failed.notifications).toHaveLength(0);
  });
});

// ── Reporter — options ────────────────────────────────────────────────────────

test.describe("DesktopNotificationReporter — options", () => {
  test("a custom title wins over the derived one", async () => {
    const reporter = new TestReporter({ title: "E2E run finished" });
    await runToCompletion(reporter, ["passed"], { status: "passed" });

    expect(reporter.notifications[0].title).toBe("E2E run finished");
  });

  test("sound, wait, timeout and icon pass through into the payload", async () => {
    const reporter = new TestReporter({
      sound: true,
      wait: true,
      timeout: 30,
      icon: "/tmp/icon.png",
    });
    await runToCompletion(reporter, ["passed"]);

    const [notification] = reporter.notifications;
    expect(notification.sound).toBe(true);
    expect(notification.wait).toBe(true);
    expect(notification.timeout).toBe(30);
    expect(notification.icon).toBe("/tmp/icon.png");
  });

  test("defaults are sound=false, wait=false, timeout=10 and no icon", async () => {
    const reporter = new TestReporter();
    await runToCompletion(reporter, ["passed"]);

    const [notification] = reporter.notifications;
    expect(notification.sound).toBe(false);
    expect(notification.wait).toBe(false);
    expect(notification.timeout).toBe(10);
    expect(notification.icon).toBeUndefined();
  });
});

// ── Reporter — CI gate ────────────────────────────────────────────────────────

test.describe("DesktopNotificationReporter — CI gate", () => {
  test("sends nothing when process.env.CI is set and the ci option is false", async () => {
    process.env.CI = "true";
    const reporter = new TestReporter();
    await runToCompletion(reporter, ["passed"]);

    expect(reporter.notifications).toHaveLength(0);
  });

  test("notifies in CI when the ci option is true", async () => {
    process.env.CI = "true";
    const reporter = new TestReporter({ ci: true });
    await runToCompletion(reporter, ["passed"]);

    expect(reporter.notifications).toHaveLength(1);
  });
});

// ── Reporter — onError ────────────────────────────────────────────────────────

test.describe("DesktopNotificationReporter — onError", () => {
  test("fires an immediate 'Playwright — Error' notification when notifyOnError is true", async () => {
    const reporter = new TestReporter({ notifyOnError: true });
    reporter.onBegin(makeConfig(), makeSuite());

    await reporter.onError({ message: "boom" } as TestError);

    expect(reporter.notifications).toHaveLength(1);
    expect(reporter.notifications[0].title).toBe("Playwright — Error");
    expect(reporter.notifications[0].message).toBe("boom");
  });

  test("truncates error messages longer than 200 characters", async () => {
    const reporter = new TestReporter({ notifyOnError: true });
    const longMessage = "x".repeat(500);

    await reporter.onError({ message: longMessage } as TestError);

    expect(reporter.notifications[0].message).toHaveLength(200);
    expect(reporter.notifications[0].message).toBe(longMessage.slice(0, 200));
  });

  test("is silent by default", async () => {
    const reporter = new TestReporter();

    await reporter.onError({ message: "boom" } as TestError);

    expect(reporter.notifications).toHaveLength(0);
  });

  test("respects the CI gate", async () => {
    process.env.CI = "true";
    const reporter = new TestReporter({ notifyOnError: true });

    await reporter.onError({ message: "boom" } as TestError);

    expect(reporter.notifications).toHaveLength(0);
  });
});

// ── Reporter — printsToStdio ──────────────────────────────────────────────────

test.describe("DesktopNotificationReporter — printsToStdio", () => {
  test("returns false", () => {
    const reporter = new TestReporter();
    expect(reporter.printsToStdio()).toBe(false);
  });
});


// ── Reporter — message template ───────────────────────────────────────────────

test.describe("DesktopNotificationReporter — message template", () => {
  test("static string is used as-is", async () => {
    const reporter = new TestReporter({ message: "custom body" });

    await runToCompletion(reporter, ["passed"]);

    expect(reporter.notifications).toHaveLength(1);
    expect(reporter.notifications[0].message).toBe("custom body");
  });

  test("template function receives (result, testCases)", async () => {
    const reporter = new TestReporter({
      message: (result, testCases) =>
        `${result.status}: ${testCases
          .filter(([, r]) => r.status === "failed")
          .map(([t]) => t.title)
          .join(", ")}`,
    });

    reporter.onBegin(makeConfig(), makeSuite());
    const t1 = makeTest({ title: "good" });
    const t2 = makeTest({ title: "bad" });
    await reporter.onTestEnd(t1, makeResult({ status: "passed" }));
    await reporter.onTestEnd(t2, makeResult({ status: "failed" }));
    await reporter.onEnd(makeFullResult({ status: "failed" }));

    expect(reporter.notifications).toHaveLength(1);
    expect(reporter.notifications[0].message).toBe("failed: bad");
  });

  test("promise-returning template is awaited", async () => {
    const reporter = new TestReporter({
      message: async (result) => `async ${result.status}`,
    });

    await runToCompletion(reporter, ["passed"]);

    expect(reporter.notifications[0].message).toBe("async passed");
  });

  test("default counts summary is used when message is not set", async () => {
    const reporter = new TestReporter({});

    await runToCompletion(reporter, ["passed", "failed"]);

    expect(reporter.notifications[0].message).toBe(
      "✓ 1 passed, ✗ 1 failed in 45.3s",
    );
  });
});
