import { test, expect } from "@playwright/test";
import React from "react";
import { render } from "@react-email/render";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import { PlaywrightReportShadcnChartEmail } from "../src/templates/shadcn/base-chart";

const mockResult: FullResult = { status: "passed", duration: 5000, startTime: new Date() };

function tc(title: string): TestCase {
  return { title, parent: { title: "Suite" } } as unknown as TestCase;
}
function tr(status: TestResult["status"], duration = 100): TestResult {
  return { status, duration } as TestResult;
}

test.describe("PlaywrightReportShadcnChartEmail — structure", () => {
  test("renders header and title", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnChartEmail, {
      result: mockResult,
      testCases: [],
    }));
    expect(html).toContain("Playwright Test Report");
    expect(html).toContain("5.0s");
    expect(html).toContain("PASSED");
  });

  test("renders Pass rate heading", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnChartEmail, {
      result: mockResult,
      testCases: [],
    }));
    expect(html).toContain("Pass rate");
  });

  test("chart shows correct percentages for all-passed run", async () => {
    const cases: [TestCase, TestResult][] = [
      [tc("A"), tr("passed")],
      [tc("B"), tr("passed")],
      [tc("C"), tr("passed")],
      [tc("D"), tr("passed")],
    ];
    const html = await render(React.createElement(PlaywrightReportShadcnChartEmail, {
      result: mockResult,
      testCases: cases,
    }));
    expect(html).toContain("100% passed");
    expect(html).toContain("0% failed");
  });

  test("chart shows partial percentages for mixed run", async () => {
    const cases: [TestCase, TestResult][] = [
      [tc("A"), tr("passed")],
      [tc("B"), tr("passed")],
      [tc("C"), tr("failed")],
      [tc("D"), tr("skipped")],
    ];
    const html = await render(React.createElement(PlaywrightReportShadcnChartEmail, {
      result: { ...mockResult, status: "failed" },
      testCases: cases,
    }));
    expect(html).toContain("50% passed");
    expect(html).toContain("25% failed");
    expect(html).toContain("25% skipped");
  });

  test("handles zero tests gracefully (no div-by-zero)", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnChartEmail, {
      result: mockResult,
      testCases: [],
    }));
    expect(html).toContain("0% passed");
  });
});

test.describe("PlaywrightReportShadcnChartEmail — stats", () => {
  test("counts passed / failed / skipped", async () => {
    const cases: [TestCase, TestResult][] = [
      [tc("A"), tr("passed")],
      [tc("B"), tr("failed")],
      [tc("C"), tr("skipped")],
    ];
    const html = await render(React.createElement(PlaywrightReportShadcnChartEmail, {
      result: { ...mockResult, status: "failed" },
      testCases: cases,
    }));
    expect(html).toContain("PASSED");
    expect(html).toContain("FAILED");
    expect(html).toContain("SKIPPED");
  });
});
