/**
 * Preview file for `pnpm email:preview`.
 * Demonstrates the Tailwind-styled template with realistic mock data.
 */
import React from "react";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import { PlaywrightReportTailwindEmail } from "@playwright-labs/reporter-email/templates";

const result = {
  status: "failed",
  duration: 18_760,
  startTime: new Date(),
} satisfies FullResult;

function tc(title: string, suite: string): TestCase {
  return { title, parent: { title: suite } } as unknown as TestCase;
}
function tr(status: TestResult["status"], duration: number): TestResult {
  return { status, duration } as TestResult;
}

const testCases: [TestCase, TestResult][] = [
  [tc("User can sign up",            "Auth"),    tr("passed",  412)],
  [tc("User can log in",             "Auth"),    tr("passed",  298)],
  [tc("Token refresh works",         "Auth"),    tr("failed", 3201)],
  [tc("Add product to cart",         "Cart"),    tr("passed",  544)],
  [tc("Remove product from cart",    "Cart"),    tr("failed", 4820)],
  [tc("Checkout with credit card",   "Payment"), tr("skipped",   0)],
  [tc("Checkout with PayPal",        "Payment"), tr("skipped",   0)],
  [tc("Search returns results",      "Search"),  tr("passed",  310)],
];

export default function PlaywrightReportTailwindPreview() {
  return (
    <PlaywrightReportTailwindEmail result={result} testCases={testCases} />
  );
}
