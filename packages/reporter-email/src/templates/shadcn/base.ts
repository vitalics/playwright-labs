import React from "react";
import {
  Body,
  Head,
  Hr,
  Html,
  Preview,
  Tailwind,
} from "@react-email/components";
import type { FullResult } from "@playwright/test/reporter";
import type { NodemailerTestCases } from "../../reporter";
import { Badge } from "./components/ui/badge";
import { Card, CardContent, CardHeader } from "./components/ui/card";
import type { BadgeProps } from "./components/ui/badge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const e = React.createElement as (...args: any[]) => React.ReactElement;

const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  passed: "success",
  failed: "destructive",
  timedOut: "warning",
  interrupted: "default",
  skipped: "secondary",
};

/** Status dot colours used inline so tests can assert specific hex values */
const STATUS_DOT: Record<string, string> = {
  passed: "#16a34a",
  failed: "#e11d48",
  timedOut: "#ea580c",
  skipped: "#94a3b8",
  interrupted: "#9333ea",
};

const STATUS_TEXT: Record<string, string> = {
  passed: "#16a34a",
  failed: "#be123c",
  timedOut: "#c2410c",
  skipped: "#475569",
  interrupted: "#7e22ce",
};

/** Accent bar colour at the top of the card */
const ACCENT_COLOR: Record<string, string> = {
  passed: "#16a34a",
  failed: "#e11d48",
  timedOut: "#ea580c",
  skipped: "#94a3b8",
  interrupted: "#9333ea",
};

export interface PlaywrightReportShadcnEmailProps {
  result: FullResult;
  testCases: NodemailerTestCases;
}

export function PlaywrightReportShadcnEmail({
  result,
  testCases,
}: PlaywrightReportShadcnEmailProps): React.ReactElement {
  const passed  = testCases.filter(([, r]) => r.status === "passed").length;
  const failed  = testCases.filter(([, r]) => r.status === "failed").length;
  const skipped = testCases.filter(([, r]) => r.status === "skipped").length;
  const duration = (result.duration / 1000).toFixed(1);
  const accentColor = ACCENT_COLOR[result.status] ?? "#94a3b8";
  const statusVariant: BadgeProps["variant"] =
    STATUS_VARIANT[result.status] ?? "secondary";

  return e(
    Html, { lang: "en" },
    e(Head, null),
    e(Preview, null, `Playwright: ${result.status} — ${passed} passed, ${failed} failed`),
    e(Tailwind, null,
      e(Body, { className: "bg-slate-50 m-0 p-0" },
        e("div", { style: { maxWidth: "600px", margin: "32px auto", padding: "0 16px" } },
          e(Card, { className: "overflow-hidden" },
            // Top accent bar
            e("div", { style: { height: "4px", backgroundColor: accentColor } }),
            // Header — uses shadcn CardHeader
            e(CardHeader, {
              style: {
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                paddingBottom: "12px",
              },
            },
              e("div", null,
                e("h1", {
                  style: {
                    margin: "0",
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#0f172a",
                    letterSpacing: "-0.01em",
                  },
                }, "Playwright Test Report"),
                e("p", {
                  style: {
                    margin: "4px 0 0",
                    fontSize: "13px",
                    color: "#64748b",
                  },
                }, `Duration: ${duration}s · ${testCases.length} tests`),
              ),
              // shadcn Badge for run status
              e(Badge, { variant: statusVariant }, result.status.toUpperCase()),
            ),
            e(Hr, { style: { margin: "0", borderColor: "#e2e8f0" } }),
            // Stats strip
            e("div", {
              style: {
                display: "flex",
                borderBottom: "1px solid #e2e8f0",
              },
            },
              e("div", { style: { flex: "1", padding: "16px 0", textAlign: "center" } },
                e("p", { style: { margin: "0", fontSize: "26px", fontWeight: "700", color: "#16a34a" } }, String(passed)),
                e("p", { style: { margin: "2px 0 0", fontSize: "11px", color: "#64748b", fontWeight: "500", letterSpacing: "0.06em" } }, "PASSED"),
              ),
              e("div", {
                style: {
                  flex: "1",
                  padding: "16px 0",
                  textAlign: "center",
                  borderLeft: "1px solid #e2e8f0",
                  borderRight: "1px solid #e2e8f0",
                },
              },
                e("p", { style: { margin: "0", fontSize: "26px", fontWeight: "700", color: "#e11d48" } }, String(failed)),
                e("p", { style: { margin: "2px 0 0", fontSize: "11px", color: "#64748b", fontWeight: "500", letterSpacing: "0.06em" } }, "FAILED"),
              ),
              e("div", { style: { flex: "1", padding: "16px 0", textAlign: "center" } },
                e("p", { style: { margin: "0", fontSize: "26px", fontWeight: "700", color: "#94a3b8" } }, String(skipped)),
                e("p", { style: { margin: "2px 0 0", fontSize: "11px", color: "#64748b", fontWeight: "500", letterSpacing: "0.06em" } }, "SKIPPED"),
              ),
            ),
            // Test list — uses shadcn CardContent
            e(CardContent, { style: { paddingTop: "16px" } },
              e("p", {
                style: {
                  margin: "0 0 12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#64748b",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase" as const,
                },
              }, `Tests · ${testCases.length}`),
              ...testCases.map(([testCase, testResult], i) => {
                const dot = STATUS_DOT[testResult.status] ?? "#94a3b8";
                const textColor = STATUS_TEXT[testResult.status] ?? "#475569";
                return e("div", {
                  key: i,
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 12px",
                    marginBottom: "4px",
                    backgroundColor: i % 2 === 0 ? "#f8fafc" : "#ffffff",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                  },
                },
                  e("div", { style: { flex: "1", minWidth: "0" } },
                    e("p", { style: { margin: "0", fontSize: "13px", color: "#0f172a", fontWeight: "500" } }, testCase.title),
                    testCase.parent?.title
                      ? e("p", { style: { margin: "2px 0 0", fontSize: "11px", color: "#64748b" } }, testCase.parent.title)
                      : null,
                  ),
                  e("p", {
                    style: {
                      margin: "0 12px",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: textColor,
                      whiteSpace: "nowrap",
                    },
                  },
                    e("span", {
                      style: {
                        display: "inline-block",
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: dot,
                        marginRight: "4px",
                        verticalAlign: "middle",
                      },
                    }),
                    testResult.status.toUpperCase(),
                  ),
                  e("p", {
                    style: {
                      margin: "0",
                      fontSize: "11px",
                      color: "#64748b",
                      fontFamily: "monospace",
                      minWidth: "50px",
                      textAlign: "right" as const,
                    },
                  }, `${testResult.duration}ms`),
                );
              }),
            ),
          ),
        ),
      ),
    ),
  );
}

export default PlaywrightReportShadcnEmail;
