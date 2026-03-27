import { test, expect } from "@playwright/test";
import React from "react";
import { render } from "@react-email/render";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import { PlaywrightReportShadcnEmail } from "../src/templates/shadcn/base";
import EmailReporter, { type NodemailerReporterOptions } from "../src/reporter";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockResult: FullResult = {
  status: "passed",
  duration: 4200,
  startTime: new Date(),
};

function makeTestCase(title: string, suite?: string): TestCase {
  return { title, parent: { title: suite ?? "Suite" } } as unknown as TestCase;
}

function makeTestResult(
  status: TestResult["status"],
  duration = 100,
): TestResult {
  return { status, duration } as TestResult;
}

class StubReporter extends EmailReporter {
  readonly calls: string[] = [];
  override async sendEmail(
    subject: string,
  ): Promise<SMTPTransport.SentMessageInfo> {
    this.calls.push(subject);
    return { messageId: "stub" } as SMTPTransport.SentMessageInfo;
  }
}

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------
test.describe("PlaywrightReportShadcnEmail — structure", () => {
  test("renders without test cases", async () => {
    const html = await render(
      React.createElement(PlaywrightReportShadcnEmail, {
        result: mockResult,
        testCases: [],
      }),
    );

    expect(html).toContain("Playwright Test Report");
    expect(html).toContain("4.2s");
    expect(html).toContain("0 tests");
  });

  test("renders status badge", async () => {
    const html = await render(
      React.createElement(PlaywrightReportShadcnEmail, {
        result: mockResult,
        testCases: [],
      }),
    );
    expect(html).toContain("PASSED");
  });

  test("failed status renders accent in red", async () => {
    const html = await render(
      React.createElement(PlaywrightReportShadcnEmail, {
        result: { ...mockResult, status: "failed" },
        testCases: [],
      }),
    );
    // Red accent dot colour
    expect(html).toContain("#e11d48");
    expect(html).toContain("FAILED");
  });

  test("shows test count in metadata line", async () => {
    const testCases: [TestCase, TestResult][] = [
      [makeTestCase("A"), makeTestResult("passed")],
      [makeTestCase("B"), makeTestResult("passed")],
      [makeTestCase("C"), makeTestResult("failed")],
    ];
    const html = await render(
      React.createElement(PlaywrightReportShadcnEmail, {
        result: { ...mockResult, status: "failed" },
        testCases,
      }),
    );
    expect(html).toContain("3 tests");
  });
});

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
test.describe("PlaywrightReportShadcnEmail — stats", () => {
  test("counts passed / failed / skipped", async () => {
    const testCases: [TestCase, TestResult][] = [
      [makeTestCase("A"), makeTestResult("passed")],
      [makeTestCase("B"), makeTestResult("passed")],
      [makeTestCase("C"), makeTestResult("failed")],
      [makeTestCase("D"), makeTestResult("skipped")],
    ];
    const html = await render(
      React.createElement(PlaywrightReportShadcnEmail, {
        result: { ...mockResult, status: "failed" },
        testCases,
      }),
    );
    expect(html).toContain("PASSED");
    expect(html).toContain("FAILED");
    expect(html).toContain("SKIPPED");
    expect(html).toContain(">2<");
  });

  test("shows correct duration", async () => {
    const html = await render(
      React.createElement(PlaywrightReportShadcnEmail, {
        result: { ...mockResult, duration: 45000 },
        testCases: [],
      }),
    );
    expect(html).toContain("45.0s");
  });
});

// ---------------------------------------------------------------------------
// Test list
// ---------------------------------------------------------------------------
test.describe("PlaywrightReportShadcnEmail — test list", () => {
  test("renders titles, suite names and durations", async () => {
    const testCases: [TestCase, TestResult][] = [
      [makeTestCase("Dashboard loads", "Performance"), makeTestResult("passed", 890)],
      [makeTestCase("Form validation", "Forms"), makeTestResult("failed", 2100)],
    ];
    const html = await render(
      React.createElement(PlaywrightReportShadcnEmail, {
        result: { ...mockResult, status: "failed" },
        testCases,
      }),
    );
    expect(html).toContain("Dashboard loads");
    expect(html).toContain("Form validation");
    expect(html).toContain("Performance");
    expect(html).toContain("Forms");
    expect(html).toContain("890ms");
    expect(html).toContain("2100ms");
  });

  test("renders section heading with count", async () => {
    const testCases: [TestCase, TestResult][] = Array.from(
      { length: 4 },
      (_, i) => [makeTestCase(`Test ${i}`), makeTestResult("passed")],
    );
    const html = await render(
      React.createElement(PlaywrightReportShadcnEmail, {
        result: mockResult,
        testCases,
      }),
    );
    expect(html).toContain("Tests · 4");
  });

  test("status dot colour for skipped is slate", async () => {
    const testCases: [TestCase, TestResult][] = [
      [makeTestCase("Skipped test"), makeTestResult("skipped", 0)],
    ];
    const html = await render(
      React.createElement(PlaywrightReportShadcnEmail, {
        result: mockResult,
        testCases,
      }),
    );
    // Slate dot colour for skipped
    expect(html).toContain("#94a3b8");
  });
});

// ---------------------------------------------------------------------------
// Via reporter
// ---------------------------------------------------------------------------
test.describe("PlaywrightReportShadcnEmail — via reporter", () => {
  test("resolves html via reporter.resolveHtml", async () => {
    const reporter = new StubReporter({
      from: "from@test.com",
      to: "to@test.com",
      subject: "Report",
      send: "always",
      html: (result, testCases) =>
        React.createElement(PlaywrightReportShadcnEmail, { result, testCases }),
    } as NodemailerReporterOptions);

    const html = await reporter.resolveHtml(mockResult);
    expect(html).toContain("Playwright Test Report");
    expect(html).toContain("PASSED");
  });

  test("reporter calls sendEmail with rendered template", async () => {
    const reporter = new StubReporter({
      from: "from@test.com",
      to: "to@test.com",
      subject: "Report",
      send: "always",
      html: (result, testCases) =>
        React.createElement(PlaywrightReportShadcnEmail, { result, testCases }),
    } as NodemailerReporterOptions);

    await reporter.onEnd(mockResult);
    expect(reporter.calls).toHaveLength(1);
  });
});
