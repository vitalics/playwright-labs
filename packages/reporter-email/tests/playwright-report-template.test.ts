import { test, expect } from "@playwright/test";
import React from "react";
import { render } from "@react-email/render";
import type { FullResult } from "@playwright/test/reporter";
import type { TestCase, TestResult } from "@playwright/test/reporter";
import { PlaywrightReportEmail } from "../src/templates/base";
import EmailReporter, { type NodemailerReporterOptions } from "../src/reporter";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockResult: FullResult = {
  status: "failed",
  duration: 5200,
  startTime: new Date(),
};

function makeTestCase(title: string): TestCase {
  return { title, parent: { title: "Suite" } } as unknown as TestCase;
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
// PlaywrightReportEmail — structure
// ---------------------------------------------------------------------------
test.describe("PlaywrightReportEmail — structure", () => {
  test("renders without test cases", async () => {
    const html = await render(
      React.createElement(PlaywrightReportEmail, {
        result: mockResult,
        testCases: [],
      }),
    );

    expect(html).toContain("Playwright Test Report");
    expect(html).toContain("FAILED");
    expect(html).toContain("5.2s");
    expect(html).toContain("Tests (0)");
  });

  test("shows correct duration in seconds", async () => {
    const html = await render(
      React.createElement(PlaywrightReportEmail, {
        result: { ...mockResult, duration: 90000 },
        testCases: [],
      }),
    );
    expect(html).toContain("90.0s");
  });

  test("renders Preview text with status and counts", async () => {
    const testCases: [TestCase, TestResult][] = [
      [makeTestCase("Login test"), makeTestResult("passed")],
      [makeTestCase("Checkout test"), makeTestResult("failed")],
    ];
    const html = await render(
      React.createElement(PlaywrightReportEmail, {
        result: mockResult,
        testCases,
      }),
    );
    // Preview meta-text is part of the rendered output
    expect(html).toContain("failed");
    expect(html).toContain("1 passed");
    expect(html).toContain("1 failed");
  });
});

// ---------------------------------------------------------------------------
// PlaywrightReportEmail — stats
// ---------------------------------------------------------------------------
test.describe("PlaywrightReportEmail — stats", () => {
  test("counts passed, failed, skipped correctly", async () => {
    const testCases: [TestCase, TestResult][] = [
      [makeTestCase("A"), makeTestResult("passed")],
      [makeTestCase("B"), makeTestResult("passed")],
      [makeTestCase("C"), makeTestResult("failed")],
      [makeTestCase("D"), makeTestResult("skipped")],
    ];
    const html = await render(
      React.createElement(PlaywrightReportEmail, {
        result: { ...mockResult, status: "failed" },
        testCases,
      }),
    );

    // Stat numbers appear in the HTML
    expect(html).toContain(">2<"); // passed count
    expect(html).toContain(">1<"); // failed count
    // skipped count
    expect(html).toContain("PASSED");
    expect(html).toContain("FAILED");
    expect(html).toContain("SKIPPED");
  });

  test("all zeros when no test cases", async () => {
    const html = await render(
      React.createElement(PlaywrightReportEmail, {
        result: { ...mockResult, status: "passed" },
        testCases: [],
      }),
    );
    expect(html).toContain("Tests (0)");
  });
});

// ---------------------------------------------------------------------------
// PlaywrightReportEmail — test list
// ---------------------------------------------------------------------------
test.describe("PlaywrightReportEmail — test list", () => {
  test("renders each test case title and status", async () => {
    const testCases: [TestCase, TestResult][] = [
      [makeTestCase("Login flow"), makeTestResult("passed", 250)],
      [makeTestCase("Payment flow"), makeTestResult("failed", 1800)],
    ];
    const html = await render(
      React.createElement(PlaywrightReportEmail, {
        result: mockResult,
        testCases,
      }),
    );

    expect(html).toContain("Login flow");
    expect(html).toContain("Payment flow");
    expect(html).toContain("PASSED");
    expect(html).toContain("FAILED");
    expect(html).toContain("250ms");
    expect(html).toContain("1800ms");
  });

  test("renders suite name (parent title)", async () => {
    const testCase = {
      title: "My test",
      parent: { title: "My suite" },
    } as unknown as TestCase;
    const html = await render(
      React.createElement(PlaywrightReportEmail, {
        result: mockResult,
        testCases: [[testCase, makeTestResult("passed")]],
      }),
    );

    expect(html).toContain("My test");
    expect(html).toContain("My suite");
  });

  test("shows correct count in heading", async () => {
    const testCases: [TestCase, TestResult][] = Array.from({ length: 5 }, (_, i) => [
      makeTestCase(`Test ${i}`),
      makeTestResult("passed"),
    ]);
    const html = await render(
      React.createElement(PlaywrightReportEmail, {
        result: { ...mockResult, status: "passed" },
        testCases,
      }),
    );
    expect(html).toContain("Tests (5)");
  });
});

// ---------------------------------------------------------------------------
// PlaywrightReportEmail — via reporter html option
// ---------------------------------------------------------------------------
test.describe("PlaywrightReportEmail — via reporter", () => {
  test("reporter resolves template via @react-email/render", async () => {
    const reporter = new StubReporter({
      from: "from@test.com",
      to: "to@test.com",
      subject: "Report",
      send: "always",
      html: (result, testCases) =>
        React.createElement(PlaywrightReportEmail, { result, testCases }),
    } as NodemailerReporterOptions);

    const html = await reporter.resolveHtml(mockResult);
    expect(html).toContain("Playwright Test Report");
    expect(html).toContain("FAILED");
    expect(html).toContain("Tests (0)");
  });

  test("reporter sends email with rendered template html", async () => {
    const reporter = new StubReporter({
      from: "from@test.com",
      to: "to@test.com",
      subject: "Report",
      send: "always",
      html: (result, testCases) =>
        React.createElement(PlaywrightReportEmail, { result, testCases }),
    } as NodemailerReporterOptions);

    await reporter.onEnd(mockResult);
    expect(reporter.calls).toHaveLength(1);
  });
});
