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
  Text,
} from "@react-email/components";
import type { FullResult } from "@playwright/test/reporter";
import type { NodemailerTestCases } from "../reporter";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const e = React.createElement as (...args: any[]) => React.ReactElement;

const STATUS_COLOR: Record<string, string> = {
  passed: "#16a34a",
  failed: "#dc2626",
  timedOut: "#ea580c",
  skipped: "#6b7280",
  interrupted: "#9333ea",
};

export interface PlaywrightReportEmailProps {
  result: FullResult;
  testCases: NodemailerTestCases;
}

export function PlaywrightReportEmail({
  result,
  testCases,
}: PlaywrightReportEmailProps): React.ReactElement {
  const passed = testCases.filter(([, r]) => r.status === "passed").length;
  const failed = testCases.filter(([, r]) => r.status === "failed").length;
  const skipped = testCases.filter(([, r]) => r.status === "skipped").length;
  const statusColor = STATUS_COLOR[result.status] ?? "#6b7280";
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
      Body,
      {
        style: {
          fontFamily: "Arial, Helvetica, sans-serif",
          backgroundColor: "#f3f4f6",
          margin: "0",
          padding: "20px",
        },
      },
      e(
        Container,
        {
          style: {
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,.12)",
          },
        },
        // Header
        e(
          Section,
          { style: { backgroundColor: statusColor, padding: "24px 32px" } },
          e(
            Heading,
            { style: { color: "#ffffff", margin: "0", fontSize: "22px" } },
            "Playwright Test Report",
          ),
          e(
            Text,
            {
              style: {
                color: "rgba(255,255,255,.85)",
                margin: "8px 0 0",
                fontSize: "14px",
              },
            },
            `${result.status.toUpperCase()} · ${duration}s`,
          ),
        ),
        // Stats
        e(
          Section,
          { style: { padding: "24px 32px" } },
          e(
            Row,
            null,
            e(
              Column,
              { style: { textAlign: "center" } },
              e(
                Text,
                {
                  style: {
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: STATUS_COLOR.passed,
                    margin: "0",
                  },
                },
                String(passed),
              ),
              e(
                Text,
                {
                  style: {
                    fontSize: "12px",
                    color: "#6b7280",
                    margin: "4px 0 0",
                  },
                },
                "PASSED",
              ),
            ),
            e(
              Column,
              { style: { textAlign: "center" } },
              e(
                Text,
                {
                  style: {
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: STATUS_COLOR.failed,
                    margin: "0",
                  },
                },
                String(failed),
              ),
              e(
                Text,
                {
                  style: {
                    fontSize: "12px",
                    color: "#6b7280",
                    margin: "4px 0 0",
                  },
                },
                "FAILED",
              ),
            ),
            e(
              Column,
              { style: { textAlign: "center" } },
              e(
                Text,
                {
                  style: {
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: "#6b7280",
                    margin: "0",
                  },
                },
                String(skipped),
              ),
              e(
                Text,
                {
                  style: {
                    fontSize: "12px",
                    color: "#6b7280",
                    margin: "4px 0 0",
                  },
                },
                "SKIPPED",
              ),
            ),
          ),
        ),
        e(Hr, { style: { margin: "0 32px", borderColor: "#e5e7eb" } }),
        // Test list
        e(
          Section,
          { style: { padding: "16px 32px 24px" } },
          e(
            Heading,
            {
              as: "h2",
              style: {
                fontSize: "16px",
                color: "#111827",
                margin: "0 0 12px",
              },
            },
            `Tests (${testCases.length})`,
          ),
          ...testCases.map(([testCase, testResult], i) =>
            e(
              Row,
              {
                key: i,
                style: {
                  marginBottom: "6px",
                  padding: "8px",
                  backgroundColor: i % 2 === 0 ? "#f9fafb" : "#ffffff",
                  borderRadius: "4px",
                },
              },
              e(
                Column,
                { style: { width: "60%" } },
                e(
                  Text,
                  {
                    style: { margin: "0", fontSize: "13px", color: "#111827" },
                  },
                  testCase.title,
                ),
                testCase.parent?.title
                  ? e(
                      Text,
                      {
                        style: {
                          margin: "2px 0 0",
                          fontSize: "11px",
                          color: "#9ca3af",
                        },
                      },
                      testCase.parent.title,
                    )
                  : null,
              ),
              e(
                Column,
                { style: { width: "25%", textAlign: "center" } },
                e(
                  Text,
                  {
                    style: {
                      margin: "0",
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: STATUS_COLOR[testResult.status] ?? "#6b7280",
                    },
                  },
                  testResult.status.toUpperCase(),
                ),
              ),
              e(
                Column,
                { style: { width: "15%", textAlign: "right" } },
                e(
                  Text,
                  {
                    style: { margin: "0", fontSize: "12px", color: "#6b7280" },
                  },
                  `${testResult.duration}ms`,
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

export default PlaywrightReportEmail;
