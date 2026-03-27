import { test, expect } from "@playwright/test";
import React from "react";
import { render } from "@react-email/render";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import { PlaywrightReportTailwindEmail } from "../src/templates/tailwind-base";
import EmailReporter, { type NodemailerReporterOptions } from "../src/reporter";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockResult: FullResult = {
  status: "failed",
  duration: 8500,
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
test.describe("PlaywrightReportTailwindEmail — structure", () => {
  test("renders without test cases", async () => {
    const html = await render(
      React.createElement(PlaywrightReportTailwindEmail, {
        result: mockResult,
        testCases: [],
      }),
    );

    expect(html).toContain("Playwright Test Report");
    expect(html).toContain("FAILED");
    expect(html).toContain("8.5s");
    expect(html).toContain("Tests (0)");
  });

  test("renders Preview with counts", async () => {
    const testCases: [TestCase, TestResult][] = [
      [makeTestCase("Login"), makeTestResult("passed")],
      [makeTestCase("Checkout"), makeTestResult("failed")],
    ];
    const html = await render(
      React.createElement(PlaywrightReportTailwindEmail, {
        result: mockResult,
        testCases,
      }),
    );
    expect(html).toContain("1 passed");
    expect(html).toContain("1 failed");
  });

  test("includes Tailwind-generated styles", async () => {
    const html = await render(
      React.createElement(PlaywrightReportTailwindEmail, {
        result: mockResult,
        testCases: [],
      }),
    );
    // Tailwind component inlines styles in <head> or on elements
    expect(html.length).toBeGreaterThan(500);
  });
});

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
test.describe("PlaywrightReportTailwindEmail — stats", () => {
  test("counts passed / failed / skipped", async () => {
    const testCases: [TestCase, TestResult][] = [
      [makeTestCase("A"), makeTestResult("passed")],
      [makeTestCase("B"), makeTestResult("passed")],
      [makeTestCase("C"), makeTestResult("failed")],
      [makeTestCase("D"), makeTestResult("skipped")],
    ];
    const html = await render(
      React.createElement(PlaywrightReportTailwindEmail, {
        result: mockResult,
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
      React.createElement(PlaywrightReportTailwindEmail, {
        result: { ...mockResult, duration: 62000 },
        testCases: [],
      }),
    );
    expect(html).toContain("62.0s");
  });
});

// ---------------------------------------------------------------------------
// Test list
// ---------------------------------------------------------------------------
test.describe("PlaywrightReportTailwindEmail — test list", () => {
  test("renders test titles and statuses", async () => {
    const testCases: [TestCase, TestResult][] = [
      [makeTestCase("Login flow", "Auth"), makeTestResult("passed", 250)],
      [makeTestCase("Checkout", "Cart"), makeTestResult("failed", 1200)],
    ];
    const html = await render(
      React.createElement(PlaywrightReportTailwindEmail, {
        result: mockResult,
        testCases,
      }),
    );
    expect(html).toContain("Login flow");
    expect(html).toContain("Checkout");
    expect(html).toContain("Auth");
    expect(html).toContain("Cart");
    expect(html).toContain("250ms");
    expect(html).toContain("1200ms");
  });

  test("shows correct test count in heading", async () => {
    const testCases: [TestCase, TestResult][] = Array.from(
      { length: 6 },
      (_, i) => [makeTestCase(`Test ${i}`), makeTestResult("passed")],
    );
    const html = await render(
      React.createElement(PlaywrightReportTailwindEmail, {
        result: { ...mockResult, status: "passed" },
        testCases,
      }),
    );
    expect(html).toContain("Tests (6)");
  });
});

// ---------------------------------------------------------------------------
// Via reporter
// ---------------------------------------------------------------------------
test.describe("PlaywrightReportTailwindEmail — via reporter", () => {
  test("resolves html via reporter.resolveHtml", async () => {
    const reporter = new StubReporter({
      from: "from@test.com",
      to: "to@test.com",
      subject: "Report",
      send: "always",
      html: (result, testCases) =>
        React.createElement(PlaywrightReportTailwindEmail, {
          result,
          testCases,
        }),
    } as NodemailerReporterOptions);

    const html = await reporter.resolveHtml(mockResult);
    expect(html).toContain("Playwright Test Report");
    expect(html).toContain("FAILED");
  });

  test("reporter calls sendEmail with rendered template", async () => {
    const reporter = new StubReporter({
      from: "from@test.com",
      to: "to@test.com",
      subject: "Report",
      send: "always",
      html: (result, testCases) =>
        React.createElement(PlaywrightReportTailwindEmail, {
          result,
          testCases,
        }),
    } as NodemailerReporterOptions);

    await reporter.onEnd(mockResult);
    expect(reporter.calls).toHaveLength(1);
  });
});
