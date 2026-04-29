/** @jsxImportSource @playwright-labs/slack-buildkit/react */
import {
  Actions,
  Blocks,
  Button,
  Context,
  Divider,
  Header,
  Section,
  Table,
  Td,
  Th,
  Tr,
} from "@playwright-labs/slack-buildkit/react";
import type { FullResult } from "@playwright/test/reporter";
import type { SlackTestCases } from "../types.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export type WithTableTemplateConfig = {
  /** Project or suite display name. Defaults to "Playwright". */
  projectName?: string;
  /** URL to the HTML report (e.g. CI artifact link). */
  reportUrl?: string;
  /**
   * Environment variables to render as a table.
   * `undefined` values are omitted.
   */
  env: Record<string, string | undefined>;
  /**
   * Title shown above the table.
   * @default "Environment"
   */
  tableTitle?: string;
  /**
   * Mask sensitive variable values.
   *
   * - `true`  — auto-mask keys matching built-in patterns (TOKEN, SECRET, PASSWORD, KEY, PASS, AUTH, CREDENTIAL).
   * - `string[]` — explicit list of key names to mask.
   * - `false` — no masking.
   * @default true
   */
  mask?: boolean | string[];
  /**
   * Show the test run summary (total / passed / failed / duration) above the table.
   * @default true
   */
  showRunSummary?: boolean;
  /**
   * Max rows per markdown block. Slack's text limit is 3000 chars; ~30 rows is a safe default.
   * @default 30
   */
  rowsPerChunk?: number;
};

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const RUN_EMOJI: Record<FullResult["status"], string> = {
  passed: ":white_check_mark:",
  failed: ":x:",
  timedout: ":hourglass_flowing_sand:",
  interrupted: ":warning:",
};

const RUN_LABEL: Record<FullResult["status"], string> = {
  passed: "All tests passed",
  failed: "Tests failed",
  timedout: "Run timed out",
  interrupted: "Run interrupted",
};

const SENSITIVE_RE = /token|secret|password|pass(?:word)?|credential|auth|api[_-]?key/i;

function maskValue(key: string, value: string, mask: boolean | string[]): string {
  if (mask === false) return value;
  if (Array.isArray(mask)) return mask.includes(key) ? "••••••••" : value;
  return SENSITIVE_RE.test(key) ? "••••••••" : value;
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export function WithTableTemplate(
  result: FullResult,
  testCases: SlackTestCases,
  config: WithTableTemplateConfig,
): ReturnType<typeof Blocks> {
  const {
    projectName = "Playwright",
    reportUrl,
    env,
    tableTitle = "Environment",
    mask = true,
    showRunSummary = true,
    rowsPerChunk = 30,
  } = config;

  // Resolve entries: filter undefined values, apply masking
  const entries: [string, string][] = Object.entries(env)
    .filter((e): e is [string, string] => e[1] !== undefined)
    .map(([k, v]) => [k, maskValue(k, v, mask)]);

  // Split into chunks so no single markdown block exceeds Slack's text limit
  const chunks: [string, string][][] = [];
  for (let i = 0; i < entries.length; i += rowsPerChunk) {
    chunks.push(entries.slice(i, i + rowsPerChunk));
  }

  // Run summary counts
  const passed = testCases.filter(([, r]) => r.status === "passed").length;
  const failed = testCases.filter(([, r]) => r.status === "failed").length;
  const skipped = testCases.filter(([, r]) => r.status === "skipped").length;
  const total = testCases.length;
  const durationSec = (
    testCases.reduce((acc, [, r]) => acc + r.duration, 0) / 1000
  ).toFixed(1);

  return (
    <Blocks>
      <Header>{`${RUN_EMOJI[result.status]} ${projectName} — ${RUN_LABEL[result.status]}`}</Header>

      {showRunSummary && total > 0 && (
        <Section>
          {`*Total:* ${total}  •  :white_check_mark: ${passed}  •  :x: ${failed}  •  :fast_forward: ${skipped}  •  :stopwatch: ${durationSec}s`}
        </Section>
      )}

      <Divider />

      <Section>{`*${tableTitle}*`}</Section>

      {chunks.length === 0 ? (
        <Section>_No variables provided._</Section>
      ) : (
        chunks.map((chunk) => (
          <Table>
            <Tr>
              <Th>Variable</Th>
              <Th>Value</Th>
            </Tr>
            {chunk.map(([k, v]) => (
              <Tr>
                <Td>{`\`${k}\``}</Td>
                <Td>{v || "_empty_"}</Td>
              </Tr>
            ))}
          </Table>
        ))
      )}

      {reportUrl && (
        <>
          <Divider />
          <Actions>
            <Button url={reportUrl} action_id="open_report" style="primary">
              View Full Report
            </Button>
          </Actions>
        </>
      )}

      <Divider />
      <Context>{`${projectName} • ${new Date().toUTCString()}`}</Context>
    </Blocks>
  );
}
