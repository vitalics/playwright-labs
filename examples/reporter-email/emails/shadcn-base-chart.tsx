/**
 * Preview file for `pnpm email:preview`.
 * Demonstrates the shadcn chart template — shows a pass-rate bar above the stats.
 */
import React from "react";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import { PlaywrightReportShadcnChartEmail } from "@playwright-labs/reporter-email/templates/shadcn";

const result = {
  status: "failed",
  duration: 18_430,
  startTime: new Date(),
} satisfies FullResult;

function tc(title: string, suite: string): TestCase {
  return { title, parent: { title: suite } } as unknown as TestCase;
}
function tr(status: TestResult["status"], duration: number): TestResult {
  return { status, duration } as TestResult;
}

const testCases: [TestCase, TestResult][] = [
  [tc("Homepage renders in < 1s",        "Performance"),  tr("passed",   742)],
  [tc("API responds under 200ms",        "Performance"),  tr("passed",   188)],
  [tc("Login with valid credentials",    "Auth"),         tr("passed",   503)],
  [tc("Login with invalid credentials",  "Auth"),         tr("passed",   210)],
  [tc("OAuth Google flow",               "Auth"),         tr("failed",  3120)],
  [tc("Password reset email sent",       "Auth"),         tr("failed",  1840)],
  [tc("Dashboard chart renders",         "UI"),           tr("passed",   629)],
  [tc("Mobile menu toggle",              "UI"),           tr("skipped",    0)],
  [tc("Data export as CSV",              "Data"),         tr("passed",   980)],
  [tc("Pagination — last page",          "Data"),         tr("failed",  2250)],
];

export default function ShadcnChartPreview() {
  return (
    <PlaywrightReportShadcnChartEmail result={result} testCases={testCases} />
  );
}
