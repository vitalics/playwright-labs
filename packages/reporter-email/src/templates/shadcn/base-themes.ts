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

export type ShadcnTheme = "slate" | "zinc" | "rose" | "blue" | "green" | "orange";

interface ThemePalette {
  accent: string;
  heading: string;
  subtitle: string;
  border: string;
  bg: string;
  card: string;
}

const THEMES: Record<ShadcnTheme, ThemePalette> = {
  slate:  { accent: "#334155", heading: "#0f172a", subtitle: "#64748b", border: "#e2e8f0", bg: "#f8fafc", card: "#ffffff" },
  zinc:   { accent: "#52525b", heading: "#18181b", subtitle: "#71717a", border: "#e4e4e7", bg: "#fafafa",  card: "#ffffff" },
  rose:   { accent: "#e11d48", heading: "#881337", subtitle: "#9f1239", border: "#fecdd3", bg: "#fff1f2",  card: "#ffffff" },
  blue:   { accent: "#2563eb", heading: "#1e3a8a", subtitle: "#3b82f6", border: "#bfdbfe", bg: "#eff6ff",  card: "#ffffff" },
  green:  { accent: "#16a34a", heading: "#14532d", subtitle: "#15803d", border: "#bbf7d0", bg: "#f0fdf4",  card: "#ffffff" },
  orange: { accent: "#ea580c", heading: "#7c2d12", subtitle: "#c2410c", border: "#fed7aa", bg: "#fff7ed",  card: "#ffffff" },
};

const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  passed: "success",
  failed: "destructive",
  timedOut: "warning",
  interrupted: "default",
  skipped: "secondary",
};

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

export interface PlaywrightReportShadcnThemesEmailProps {
  result: FullResult;
  testCases: NodemailerTestCases;
  /** Visual theme for the email. Defaults to "slate". */
  theme?: ShadcnTheme;
}

export function PlaywrightReportShadcnThemesEmail({
  result,
  testCases,
  theme = "slate",
}: PlaywrightReportShadcnThemesEmailProps): React.ReactElement {
  const passed  = testCases.filter(([, r]) => r.status === "passed").length;
  const failed  = testCases.filter(([, r]) => r.status === "failed").length;
  const skipped = testCases.filter(([, r]) => r.status === "skipped").length;
  const duration = (result.duration / 1000).toFixed(1);
  const palette = THEMES[theme] ?? THEMES.slate;
  const statusVariant: BadgeProps["variant"] = STATUS_VARIANT[result.status] ?? "secondary";

  return e(
    Html, { lang: "en" },
    e(Head, null),
    e(Preview, null, `Playwright: ${result.status} — ${passed} passed, ${failed} failed`),
    e(Tailwind, null,
      e(Body, { style: { backgroundColor: palette.bg, margin: "0", padding: "0" } },
        e("div", { style: { maxWidth: "600px", margin: "32px auto", padding: "0 16px" } },
          e(Card, { style: { overflow: "hidden", borderColor: palette.border, backgroundColor: palette.card } },
            // Accent bar uses the theme accent colour
            e("div", { style: { height: "4px", backgroundColor: palette.accent } }),
            e(CardHeader, {
              style: {
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                paddingBottom: "12px",
                borderBottom: `1px solid ${palette.border}`,
              },
            },
              e("div", null,
                e("h1", {
                  style: {
                    margin: "0",
                    fontSize: "18px",
                    fontWeight: "600",
                    color: palette.heading,
                    letterSpacing: "-0.01em",
                  },
                }, "Playwright Test Report"),
                e("p", { style: { margin: "4px 0 0", fontSize: "13px", color: palette.subtitle } },
                  `Duration: ${duration}s · ${testCases.length} tests`,
                ),
              ),
              e(Badge, { variant: statusVariant }, result.status.toUpperCase()),
            ),
            // Stats
            e("div", { style: { display: "flex", borderBottom: `1px solid ${palette.border}` } },
              e("div", { style: { flex: "1", padding: "16px 0", textAlign: "center" } },
                e("p", { style: { margin: "0", fontSize: "26px", fontWeight: "700", color: "#16a34a" } }, String(passed)),
                e("p", { style: { margin: "2px 0 0", fontSize: "11px", color: palette.subtitle, fontWeight: "500", letterSpacing: "0.06em" } }, "PASSED"),
              ),
              e("div", { style: { flex: "1", padding: "16px 0", textAlign: "center", borderLeft: `1px solid ${palette.border}`, borderRight: `1px solid ${palette.border}` } },
                e("p", { style: { margin: "0", fontSize: "26px", fontWeight: "700", color: "#e11d48" } }, String(failed)),
                e("p", { style: { margin: "2px 0 0", fontSize: "11px", color: palette.subtitle, fontWeight: "500", letterSpacing: "0.06em" } }, "FAILED"),
              ),
              e("div", { style: { flex: "1", padding: "16px 0", textAlign: "center" } },
                e("p", { style: { margin: "0", fontSize: "26px", fontWeight: "700", color: "#94a3b8" } }, String(skipped)),
                e("p", { style: { margin: "2px 0 0", fontSize: "11px", color: palette.subtitle, fontWeight: "500", letterSpacing: "0.06em" } }, "SKIPPED"),
              ),
            ),
            // Test list
            e(CardContent, { style: { paddingTop: "16px" } },
              e("p", {
                style: {
                  margin: "0 0 12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: palette.subtitle,
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
                    backgroundColor: i % 2 === 0 ? palette.bg : palette.card,
                    borderRadius: "6px",
                    border: `1px solid ${palette.border}`,
                  },
                },
                  e("div", { style: { flex: "1", minWidth: "0" } },
                    e("p", { style: { margin: "0", fontSize: "13px", color: palette.heading, fontWeight: "500" } }, testCase.title),
                    testCase.parent?.title
                      ? e("p", { style: { margin: "2px 0 0", fontSize: "11px", color: palette.subtitle } }, testCase.parent.title)
                      : null,
                  ),
                  e("p", { style: { margin: "0 12px", fontSize: "11px", fontWeight: "600", color: textColor, whiteSpace: "nowrap" } },
                    e("span", { style: { display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: dot, marginRight: "4px", verticalAlign: "middle" } }),
                    testResult.status.toUpperCase(),
                  ),
                  e("p", { style: { margin: "0", fontSize: "11px", color: palette.subtitle, fontFamily: "monospace", minWidth: "50px", textAlign: "right" as const } },
                    `${testResult.duration}ms`,
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    ),
  );
}

export default PlaywrightReportShadcnThemesEmail;
