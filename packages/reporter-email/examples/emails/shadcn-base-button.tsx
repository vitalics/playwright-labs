/**
 * Preview file for `pnpm email:preview`.
 * Demonstrates the shadcn button template — CTA buttons linking to the CI report.
 */
import React from "react";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import { PlaywrightReportShadcnButtonEmail } from "@playwright-labs/reporter-email/templates/shadcn";

const result = {
  status: "failed",
  duration: 24_510,
  startTime: new Date(),
} satisfies FullResult;

function tc(title: string, suite: string): TestCase {
  return { title, parent: { title: suite } } as unknown as TestCase;
}
function tr(status: TestResult["status"], duration: number): TestResult {
  return { status, duration } as TestResult;
}

const testCases: [TestCase, TestResult][] = [
  [tc("User registration flow",         "Auth"),         tr("passed",   830)],
  [tc("Email verification",             "Auth"),         tr("passed",   412)],
  [tc("Payment with valid card",        "Checkout"),     tr("failed",  4200)],
  [tc("Payment with expired card",      "Checkout"),     tr("failed",  3810)],
  [tc("Coupon code applies discount",   "Checkout"),     tr("passed",   670)],
  [tc("Order confirmation email sent",  "Checkout"),     tr("failed",  2100)],
  [tc("Product search returns results", "Catalogue"),    tr("passed",   290)],
  [tc("Filter by category",             "Catalogue"),    tr("skipped",    0)],
];

export default function ShadcnButtonPreview() {
  return (
    <PlaywrightReportShadcnButtonEmail
      result={result}
      testCases={testCases}
      reportUrl="https://ci.example.com/builds/42/report"
      failuresUrl="https://ci.example.com/builds/42/failures"
    />
  );
}
