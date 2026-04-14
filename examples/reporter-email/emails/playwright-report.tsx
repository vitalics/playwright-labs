/**
 * Preview file for `pnpm email:preview` (`email dev --dir emails`).
 *
 * Run:
 *   pnpm email:preview
 *   open http://localhost:3000
 *
 * This file is NOT a Playwright test. It feeds the React Email dev server
 * with realistic mock data so you can inspect the template in a browser
 * before wiring it to your real reporter config.
 */
import React from "react";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import PlaywrightReportEmail from "@playwright-labs/reporter-email/templates/base";

const result = {
  status: "failed",
  duration: 14_320,
  startTime: new Date(),
} satisfies FullResult;

function tc(title: string, suite: string): TestCase {
  return { title, parent: { title: suite } } as unknown as TestCase;
}

function tr(status: TestResult["status"], duration: number): TestResult {
  return { status, duration } as TestResult;
}

const testCases: [TestCase, TestResult][] = [
  [tc("Login with valid credentials",   "Auth"),          tr("passed",  342)],
  [tc("Login with invalid credentials", "Auth"),          tr("passed",  289)],
  [tc("Logout",                         "Auth"),          tr("passed",  190)],
  [tc("Add item to cart",               "Shopping Cart"), tr("failed", 5102)],
  [tc("Remove item from cart",          "Shopping Cart"), tr("failed", 4320)],
  [tc("View product details",           "Product"),       tr("passed",  421)],
  [tc("Filter by category",             "Product"),       tr("passed",  374)],
  [tc("Search by keyword",              "Search"),        tr("skipped",   0)],
];

/** Default export is required by the React Email dev server. */
export default function PlaywrightReportPreview() {
  return (
    <PlaywrightReportEmail result={result} testCases={testCases} />
  );
}
