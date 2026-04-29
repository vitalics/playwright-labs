/** @jsxImportSource @playwright-labs/slack-buildkit/react */
import {
  Actions,
  Blocks,
  Button,
  Context,
  Divider,
  Header,
  Section,
} from "@playwright-labs/slack-buildkit/react";
import type { FullResult } from "@playwright/test/reporter";
import type { SlackTestCases } from "../types.js";

const STATUS_EMOJI: Record<FullResult["status"], string> = {
  passed: ":white_check_mark:",
  failed: ":x:",
  timedout: ":hourglass_flowing_sand:",
  interrupted: ":warning:",
};

const STATUS_LABEL: Record<FullResult["status"], string> = {
  passed: "Passed",
  failed: "Failed",
  timedout: "Timed out",
  interrupted: "Interrupted",
};

export type BaseTemplateOptions = {
  /** Project or suite display name. Defaults to "Playwright". */
  projectName?: string;
  /** URL to the HTML report (e.g. CI artifact link). */
  reportUrl?: string;
  /** Date of the report, displayed in the bottom in context. */
  reportDate?: Date | string | number;
};

export function BaseTemplate(
  result: FullResult,
  testCases: SlackTestCases,
  options: BaseTemplateOptions = {},
): ReturnType<typeof Blocks> {
  const { projectName = "Playwright", reportUrl } = options;

  const emoji = STATUS_EMOJI[result.status];
  const label = STATUS_LABEL[result.status];

  const passed = testCases.filter(([, r]) => r.status === "passed").length;
  const failed = testCases.filter(([, r]) => r.status === "failed").length;
  const skipped = testCases.filter(([, r]) => r.status === "skipped").length;
  const total = testCases.length;

  const durationSec = (
    testCases.reduce((acc, [, r]) => acc + r.duration, 0) / 1000
  ).toFixed(1);

  const failedTests = testCases
    .filter(([, r]) => r.status === "failed")
    .slice(0, 10);

  return (
    <Blocks>
      <Header>{`${emoji} ${projectName} — ${label}`}</Header>

      <Section>
        {`*Total:* ${total}  •  :white_check_mark: ${passed}  •  :x: ${failed}  •  :fast_forward: ${skipped}  •  :stopwatch: ${durationSec}s`}
      </Section>

      {failedTests.length > 0 && (
        <>
          <Divider />
          <Section>{`*Failed tests (${failedTests.length}${failedTests.length === 10 && failed > 10 ? "+" : ""}):*`}</Section>
          {failedTests.map(([test, r]) => {
            const errorMsg = r.errors?.[0]?.message?.split("\n")[0] ?? "";
            return (
              <Section>
                {`• \`${test.titlePath().slice(1).join(" › ")}\`${errorMsg ? `\n  ${errorMsg}` : ""}`}
              </Section>
            );
          })}
        </>
      )}

      {reportUrl && (
        <>
          <Divider />
          <Actions>
            <Button url={reportUrl} action_id="open_report" style="primary">
              View Report
            </Button>
          </Actions>
        </>
      )}

      <Divider />
      <Context>{`Triggered by Playwright test runner • ${new Date(options?.reportDate ?? new Date()).toUTCString()}`}</Context>
    </Blocks>
  );
}
