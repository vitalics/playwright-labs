/**
 * Preview file for `pnpm email:preview`.
 * Demonstrates all available themes for the shadcn themes template.
 * Change `PREVIEW_THEME` below to switch themes in the dev server.
 *
 * Available themes: "slate" | "zinc" | "rose" | "blue" | "green" | "orange"
 */
import React from "react";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import { PlaywrightReportShadcnThemesEmail, type ShadcnTheme } from "@playwright-labs/reporter-email/templates/shadcn";

const PREVIEW_THEME: ShadcnTheme = "blue";

const result = {
  status: "passed",
  duration: 11_220,
  startTime: new Date(),
} satisfies FullResult;

function tc(title: string, suite: string): TestCase {
  return { title, parent: { title: suite } } as unknown as TestCase;
}
function tr(status: TestResult["status"], duration: number): TestResult {
  return { status, duration } as TestResult;
}

const testCases: [TestCase, TestResult][] = [
  [tc("App launches successfully",       "Smoke"),        tr("passed",   310)],
  [tc("Health-check endpoint 200",       "Smoke"),        tr("passed",    88)],
  [tc("User can log in",                 "Auth"),         tr("passed",   540)],
  [tc("User can log out",                "Auth"),         tr("passed",   230)],
  [tc("Protected route redirects",       "Auth"),         tr("passed",   175)],
  [tc("Dashboard summary loads",         "Dashboard"),    tr("passed",   890)],
  [tc("Notifications badge updates",     "Dashboard"),    tr("skipped",    0)],
  [tc("Report exports as PDF",           "Reports"),      tr("passed",  1340)],
];

export default function ShadcnThemesPreview() {
  return (
    <PlaywrightReportShadcnThemesEmail
      result={result}
      testCases={testCases}
      theme={PREVIEW_THEME}
    />
  );
}
