import React from "react";
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import type { FullResult } from "@playwright/test/reporter";
import type { NodemailerTestCases } from "../reporter";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const e = React.createElement as (...args: any[]) => React.ReactElement;

/** Inline style is only used for the dynamic status background colour.
 *  Everything else is driven by Tailwind utility classes. */
const STATUS_BG: Record<string, string> = {
  passed: "#16a34a",
  failed: "#dc2626",
  timedOut: "#ea580c",
  skipped: "#6b7280",
  interrupted: "#9333ea",
};

const STATUS_TEXT_COLOR: Record<string, string> = {
  passed: "#15803d",
  failed: "#b91c1c",
  timedOut: "#c2410c",
  skipped: "#4b5563",
  interrupted: "#7e22ce",
};

export interface PlaywrightReportTailwindEmailProps {
  result: FullResult;
  testCases: NodemailerTestCases;
}

export function PlaywrightReportTailwindEmail({
  result,
  testCases,
}: PlaywrightReportTailwindEmailProps): React.ReactElement {
  const passed = testCases.filter(([, r]) => r.status === "passed").length;
  const failed = testCases.filter(([, r]) => r.status === "failed").length;
  const skipped = testCases.filter(([, r]) => r.status === "skipped").length;
  const headerBg = STATUS_BG[result.status] ?? "#6b7280";
  const duration = (result.duration / 1000).toFixed(1);

  return e(
    Html,
    { lang: "en" },
    e(Head, null),
    e(
      Preview,
      null,
      `Playwright: ${result.status} — ${passed} passed, ${failed} failed`,
    ),
    e(
      Tailwind,
      null,
      e(
        Body,
        { className: "bg-gray-100 font-sans m-0 p-5" },
        e(
          Container,
          {
            className:
              "max-w-[600px] mx-auto bg-white rounded-xl shadow-sm overflow-hidden",
          },
          // Header — dynamic background via inline style
          e(
            Section,
            { style: { backgroundColor: headerBg }, className: "px-8 py-6" },
            e(
              Heading,
              { className: "text-white m-0 text-xl font-bold" },
              "Playwright Test Report",
            ),
            e(
              Text,
              { className: "text-white/80 m-0 mt-2 text-sm" },
              `${result.status.toUpperCase()} · ${duration}s`,
            ),
          ),
          // Stats
          e(
            Section,
            { className: "px-8 py-5" },
            e(
              Row,
              null,
              e(
                Column,
                { className: "text-center" },
                e(
                  Text,
                  { className: "text-3xl font-bold text-green-600 m-0" },
                  String(passed),
                ),
                e(
                  Text,
                  { className: "text-xs text-gray-500 m-0 mt-1 tracking-wide" },
                  "PASSED",
                ),
              ),
              e(
                Column,
                { className: "text-center" },
                e(
                  Text,
                  { className: "text-3xl font-bold text-red-600 m-0" },
                  String(failed),
                ),
                e(
                  Text,
                  { className: "text-xs text-gray-500 m-0 mt-1 tracking-wide" },
                  "FAILED",
                ),
              ),
              e(
                Column,
                { className: "text-center" },
                e(
                  Text,
                  { className: "text-3xl font-bold text-gray-400 m-0" },
                  String(skipped),
                ),
                e(
                  Text,
                  { className: "text-xs text-gray-500 m-0 mt-1 tracking-wide" },
                  "SKIPPED",
                ),
              ),
            ),
          ),
          e(Hr, { className: "border-gray-200 mx-8" }),
          // Test list
          e(
            Section,
            { className: "px-8 pt-4 pb-6" },
            e(
              Heading,
              {
                as: "h2",
                className:
                  "text-sm font-semibold text-gray-700 m-0 mb-3 uppercase tracking-wide",
              },
              `Tests (${testCases.length})`,
            ),
            ...testCases.map(([testCase, testResult], i) =>
              e(
                Row,
                {
                  key: i,
                  className: `rounded mb-1 ${i % 2 === 0 ? "bg-gray-50" : "bg-white"}`,
                  style: { padding: "8px" },
                },
                e(
                  Column,
                  { className: "w-3/5" },
                  e(
                    Text,
                    { className: "m-0 text-[13px] text-gray-900 font-medium" },
                    testCase.title,
                  ),
                  testCase.parent?.title
                    ? e(
                        Text,
                        { className: "m-0 mt-0.5 text-[11px] text-gray-400" },
                        testCase.parent.title,
                      )
                    : null,
                ),
                e(
                  Column,
                  { className: "w-1/4 text-center" },
                  e(
                    Text,
                    {
                      className: "m-0 text-xs font-bold",
                      style: {
                        color:
                          STATUS_TEXT_COLOR[testResult.status] ?? "#6b7280",
                      },
                    },
                    testResult.status.toUpperCase(),
                  ),
                ),
                e(
                  Column,
                  { className: "w-[15%] text-right" },
                  e(
                    Text,
                    { className: "m-0 text-xs text-gray-400" },
                    `${testResult.duration}ms`,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

export default PlaywrightReportTailwindEmail;
