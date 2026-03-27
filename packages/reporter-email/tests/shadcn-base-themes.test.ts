import { test, expect } from "@playwright/test";
import React from "react";
import { render } from "@react-email/render";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import { PlaywrightReportShadcnThemesEmail } from "../src/templates/shadcn/base-themes";

const mockResult: FullResult = { status: "passed", duration: 3100, startTime: new Date() };

function tc(title: string): TestCase {
  return { title, parent: { title: "Suite" } } as unknown as TestCase;
}
function tr(status: TestResult["status"], duration = 100): TestResult {
  return { status, duration } as TestResult;
}

test.describe("PlaywrightReportShadcnThemesEmail — default theme", () => {
  test("renders with slate theme by default", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnThemesEmail, {
      result: mockResult,
      testCases: [],
    }));
    expect(html).toContain("Playwright Test Report");
    expect(html).toContain("PASSED");
    // slate accent bar colour
    expect(html).toContain("#334155");
  });

  test("renders duration and test count", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnThemesEmail, {
      result: mockResult,
      testCases: [],
    }));
    expect(html).toContain("3.1s");
    expect(html).toContain("0 tests");
  });
});

test.describe("PlaywrightReportShadcnThemesEmail — theme colours", () => {
  test("rose theme uses rose accent", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnThemesEmail, {
      result: mockResult,
      testCases: [],
      theme: "rose",
    }));
    expect(html).toContain("#e11d48"); // rose accent
  });

  test("blue theme uses blue accent", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnThemesEmail, {
      result: mockResult,
      testCases: [],
      theme: "blue",
    }));
    expect(html).toContain("#2563eb");
  });

  test("green theme uses green accent", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnThemesEmail, {
      result: mockResult,
      testCases: [],
      theme: "green",
    }));
    expect(html).toContain("#16a34a");
  });

  test("orange theme uses orange accent", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnThemesEmail, {
      result: mockResult,
      testCases: [],
      theme: "orange",
    }));
    expect(html).toContain("#ea580c");
  });

  test("zinc theme uses zinc accent", async () => {
    const html = await render(React.createElement(PlaywrightReportShadcnThemesEmail, {
      result: mockResult,
      testCases: [],
      theme: "zinc",
    }));
    expect(html).toContain("#52525b");
  });
});

test.describe("PlaywrightReportShadcnThemesEmail — test list", () => {
  test("renders test titles regardless of theme", async () => {
    const cases: [TestCase, TestResult][] = [
      [tc("Login flow"), tr("passed", 420)],
      [tc("API test"),   tr("failed", 810)],
    ];
    const html = await render(React.createElement(PlaywrightReportShadcnThemesEmail, {
      result: { ...mockResult, status: "failed" },
      testCases: cases,
      theme: "blue",
    }));
    expect(html).toContain("Login flow");
    expect(html).toContain("API test");
    expect(html).toContain("420ms");
    expect(html).toContain("810ms");
  });
});
