import { test, expect } from "@playwright/test";
import React from "react";
import { render } from "@react-email/render";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import { PlaywrightReportShadcnButtonEmail } from "../src/templates/shadcn/base-button";

const mockResult: FullResult = { status: "failed", duration: 7200, startTime: new Date() };

function tc(title: string): TestCase {
  return { title, parent: { title: "Suite" } } as unknown as TestCase;
}
function tr(status: TestResult["status"], duration = 100): TestResult {
  return { status, duration } as TestResult;
}

const cases: [TestCase, TestResult][] = [
  [tc("Login"),    tr("passed",  300)],
  [tc("Checkout"), tr("failed", 1200)],
];

test.describe("PlaywrightReportShadcnButtonEmail — structure", () => {
  test("renders title and status", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnButtonEmail, {
      result: mockResult,
      testCases: [],
    }));
    expect(html).toContain("Playwright Test Report");
    expect(html).toContain("FAILED");
    expect(html).toContain("7.2s");
  });

  test("renders no buttons when urls are omitted", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnButtonEmail, {
      result: mockResult,
      testCases: cases,
    }));
    expect(html).not.toContain("View Full Report");
    expect(html).not.toContain("View");
  });
});

test.describe("PlaywrightReportShadcnButtonEmail — buttons", () => {
  test("renders View Full Report button when reportUrl provided", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnButtonEmail, {
      result: mockResult,
      testCases: cases,
      reportUrl: "https://ci.example.com/report",
    }));
    expect(html).toContain("View Full Report");
    expect(html).toContain("https://ci.example.com/report");
  });

  test("renders View Failures button when failuresUrl and failures exist", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnButtonEmail, {
      result: mockResult,
      testCases: cases,
      failuresUrl: "https://ci.example.com/failures",
    }));
    expect(html).toContain("View 1 Failure");
    expect(html).toContain("https://ci.example.com/failures");
  });

  test("pluralises failures label correctly", async () => {
    const multiFailCases: [TestCase, TestResult][] = [
      [tc("A"), tr("failed")],
      [tc("B"), tr("failed")],
    ];
    const html = await render(React.createElement(PlaywrightReportShadcnButtonEmail, {
      result: mockResult,
      testCases: multiFailCases,
      failuresUrl: "https://ci.example.com/failures",
    }));
    expect(html).toContain("View 2 Failures");
  });

  test("hides failures button when there are no failures", async () => {
    const allPassed: [TestCase, TestResult][] = [[tc("A"), tr("passed")]];
    const html = await render(React.createElement(PlaywrightReportShadcnButtonEmail, {
      result: { ...mockResult, status: "passed" },
      testCases: allPassed,
      failuresUrl: "https://ci.example.com/failures",
    }));
    expect(html).not.toContain("View");
  });

  test("renders both buttons when both urls provided and failures exist", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnButtonEmail, {
      result: mockResult,
      testCases: cases,
      reportUrl: "https://ci.example.com/report",
      failuresUrl: "https://ci.example.com/failures",
    }));
    expect(html).toContain("View Full Report");
    expect(html).toContain("View 1 Failure");
  });
});
