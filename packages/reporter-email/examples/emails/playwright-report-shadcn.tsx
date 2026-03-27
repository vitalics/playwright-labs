/**
 * Preview file for `pnpm email:preview`.
 * Demonstrates the shadcn/ui-inspired template with realistic mock data.
 */
import React from "react";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import { PlaywrightReportShadcnEmail } from "@playwright-labs/reporter-email/templates";

const result = {
  status: "passed",
  duration: 9_840,
  startTime: new Date(),
} satisfies FullResult;

function tc(title: string, suite: string): TestCase {
  return { title, parent: { title: suite } } as unknown as TestCase;
}
function tr(status: TestResult["status"], duration: number): TestResult {
  return { status, duration } as TestResult;
}

const testCases: [TestCase, TestResult][] = [
  [tc("Dashboard loads within 2s",     "Performance"),  tr("passed",  874)],
  [tc("Navigation links are correct",  "Navigation"),   tr("passed",  312)],
  [tc("Form validates required fields","Forms"),        tr("passed",  503)],
  [tc("File upload works",             "Forms"),        tr("passed", 1204)],
  [tc("Dark mode toggle persists",     "UI"),           tr("passed",  229)],
  [tc("Responsive layout on mobile",   "UI"),           tr("skipped",   0)],
  [tc("Export to CSV",                 "Data"),         tr("passed",  670)],
  [tc("Pagination works correctly",    "Data"),         tr("passed",  388)],
];

export default function PlaywrightReportShadcnPreview() {
  return (
    <PlaywrightReportShadcnEmail result={result} testCases={testCases} />
  );
}
