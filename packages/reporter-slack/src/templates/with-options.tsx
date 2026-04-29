/** @jsxImportSource @playwright-labs/slack-buildkit/react */
import {
  Actions,
  Blocks,
  Button,
  Context,
  Divider,
  Header,
  Section,
  StaticSelect,
} from "@playwright-labs/slack-buildkit/react";
import { option } from "@playwright-labs/slack-buildkit";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import type { SlackTestCases } from "../types.js";

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

const STATUS_CONFIG = {
  failed: { emoji: ":x:", label: "Failed" },
  passed: { emoji: ":white_check_mark:", label: "Passed" },
  skipped: { emoji: ":fast_forward:", label: "Skipped" },
  timedOut: { emoji: ":hourglass_flowing_sand:", label: "Timed out" },
  interrupted: { emoji: ":warning:", label: "Interrupted" },
} satisfies Record<TestResult["status"], { emoji: string; label: string }>;

export type WithOptionsTemplateConfig = {
  /** Project or suite display name. Defaults to "Playwright". */
  projectName?: string;
  /** URL to the HTML report (e.g. CI artifact link). */
  reportUrl?: string;
  /**
   * Which status groups to render. All groups are shown by default.
   * Set a status to `false` to hide it entirely.
   */
  show?: {
    failed?: boolean;
    passed?: boolean;
    skipped?: boolean;
    timedOut?: boolean;
    interrupted?: boolean;
  };
  /**
   * Maximum number of test names to list per status group.
   * @default 10
   */
  maxPerStatus?: number;
  /**
   * When `true`, each group shows individual test names.
   * When `false`, groups show only the count summary.
   * @default true
   */
  showTestNames?: boolean;
};

/** @deprecated Use {@link WithOptionsTemplateConfig} */
export type WithOptionsTemplateOptions = WithOptionsTemplateConfig;

type Group = {
  status: TestResult["status"];
  tests: [TestCase, TestResult][];
};

function groupByStatus(testCases: SlackTestCases): Group[] {
  const order: TestResult["status"][] = [
    "failed",
    "timedOut",
    "interrupted",
    "skipped",
    "passed",
  ];

  return order
    .map((status) => ({
      status,
      tests: testCases.filter(([, r]) => r.status === status),
    }))
    .filter((g) => g.tests.length > 0);
}

function StatusGroup({
  group,
  max,
  showNames,
}: {
  group: Group;
  max: number;
  showNames: boolean;
}) {
  const { emoji, label } = STATUS_CONFIG[group.status];
  const visible = group.tests.slice(0, max);
  const overflow = group.tests.length - visible.length;

  return (
    <>
      <Divider />
      <Section>
        {`${emoji} *${label}* — ${group.tests.length} test${group.tests.length !== 1 ? "s" : ""}`}
      </Section>
      {showNames &&
        visible.map(([test, r]) => {
          const path = test.titlePath().slice(1).join(" › ");
          const errorLine =
            group.status === "failed" || group.status === "timedOut"
              ? r.errors?.[0]?.message?.split("\n")[0] ?? ""
              : "";
          return (
            <Section>
              {`• \`${path}\`${errorLine ? `\n  _${errorLine}_` : ""}`}
            </Section>
          );
        })}
      {showNames && overflow > 0 && (
        <Section>{`_… and ${overflow} more_`}</Section>
      )}
    </>
  );
}

export function WithOptionsTemplate(
  result: FullResult,
  testCases: SlackTestCases,
  config: WithOptionsTemplateConfig = {},
): ReturnType<typeof Blocks> {
  const {
    projectName = "Playwright",
    reportUrl,
    show = {},
    maxPerStatus = 10,
    showTestNames = true,
  } = config;

  const runEmoji = RUN_EMOJI[result.status];
  const runLabel = RUN_LABEL[result.status];

  const total = testCases.length;
  const durationSec = (
    testCases.reduce((acc, [, r]) => acc + r.duration, 0) / 1000
  ).toFixed(1);

  const groups = groupByStatus(testCases).filter((g) => show[g.status] !== false);

  // Build interactive options from the statuses actually present in this run.
  // "All" is always first, then one option per present status group.
  const statusOptions = [
    option("All statuses", "all"),
    ...groups.map((g) => {
      const { emoji, label } = STATUS_CONFIG[g.status];
      return option(`${emoji} ${label} (${g.tests.length})`, g.status);
    }),
  ];

  return (
    <Blocks>
      <Header>{`${runEmoji} ${projectName} — ${runLabel}`}</Header>

      <Section>
        {[
          `*Total:* ${total}`,
          `*Duration:* ${durationSec}s`,
          ...(result.startTime
            ? [`*Started:* ${result.startTime.toUTCString()}`]
            : []),
        ].join("   |   ")}
      </Section>

      {/* Interactive filter — lets readers focus on a specific status group */}
      <Actions block_id="status_filter">
        <StaticSelect
          placeholder="Filter by status"
          options={statusOptions}
          action_id="filter_status"
        />
        {reportUrl && (
          <Button url={reportUrl} action_id="open_report" style="primary">
            View Full Report
          </Button>
        )}
      </Actions>

      {groups.map((group) => (
        <StatusGroup group={group} max={maxPerStatus} showNames={showTestNames} />
      ))}

      <Divider />
      <Context>{`${projectName} • ${new Date().toUTCString()}`}</Context>
    </Blocks>
  );
}
