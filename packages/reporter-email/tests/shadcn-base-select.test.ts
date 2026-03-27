import { test, expect } from "@playwright/test";
import React from "react";
import { render } from "@react-email/render";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import { PlaywrightReportShadcnSelectEmail } from "../src/templates/shadcn/base-select";

const mockResult: FullResult = { status: "failed", duration: 9000, startTime: new Date() };

function tc(title: string, suite = "Suite"): TestCase {
  return { title, parent: { title: suite } } as unknown as TestCase;
}
function tr(status: TestResult["status"], duration = 100): TestResult {
  return { status, duration } as TestResult;
}

const mixedCases: [TestCase, TestResult][] = [
  [tc("Login"),    tr("passed",  200)],
  [tc("Logout"),   tr("passed",  150)],
  [tc("Checkout"), tr("failed",  800)],
  [tc("Profile"),  tr("failed",  600)],
  [tc("Settings"), tr("skipped",   0)],
];

test.describe("PlaywrightReportShadcnSelectEmail — no filter", () => {
  test("shows all tests when statusFilter is omitted", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnSelectEmail, {
      result: mockResult,
      testCases: mixedCases,
    }));
    expect(html).toContain("Login");
    expect(html).toContain("Checkout");
    expect(html).toContain("Settings");
    expect(html).toContain("Tests · 5");
    expect(html).not.toContain("Showing");
  });

  test("shows all tests when statusFilter is empty array", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnSelectEmail, {
      result: mockResult,
      testCases: mixedCases,
      statusFilter: [],
    }));
    expect(html).toContain("Tests · 5");
    expect(html).not.toContain("Showing");
  });
});

test.describe("PlaywrightReportShadcnSelectEmail — with filter", () => {
  test("filters to failed only", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnSelectEmail, {
      result: mockResult,
      testCases: mixedCases,
      statusFilter: ["failed"],
    }));
    expect(html).toContain("Checkout");
    expect(html).toContain("Profile");
    expect(html).not.toContain(">Login<");
    expect(html).not.toContain(">Settings<");
    expect(html).toContain("Tests · 2");
    expect(html).toContain("Showing 2 of 5 tests");
    // Select trigger shows active filter value
    expect(html).toContain("Status filter");
    expect(html).toContain(">failed<");
  });

  test("filters to passed only", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnSelectEmail, {
      result: mockResult,
      testCases: mixedCases,
      statusFilter: ["passed"],
    }));
    expect(html).toContain("Login");
    expect(html).toContain("Logout");
    expect(html).not.toContain(">Checkout<");
    expect(html).toContain("Tests · 2");
  });

  test("filters to multiple statuses", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnSelectEmail, {
      result: mockResult,
      testCases: mixedCases,
      statusFilter: ["failed", "skipped"],
    }));
    expect(html).toContain("Checkout");
    expect(html).toContain("Settings");
    expect(html).toContain("Tests · 3");
    // Select trigger shows comma-separated active statuses
    expect(html).toContain("failed, skipped");
  });

  test("shows empty state when filter matches nothing", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnSelectEmail, {
      result: mockResult,
      testCases: mixedCases,
      statusFilter: ["timedOut"],
    }));
    expect(html).toContain("Tests · 0");
    expect(html).toContain("No tests match the selected filter.");
  });

  test("full totals in stats always reflect all tests", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnSelectEmail, {
      result: mockResult,
      testCases: mixedCases,
      statusFilter: ["failed"],
    }));
    // Stats row should show total passed=2, failed=2, skipped=1
    expect(html).toContain(">2<");
    expect(html).toContain(">1<");
  });
});
