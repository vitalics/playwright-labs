import type { SlackBlock, SlackMessage } from "@playwright-labs/slack-buildkit";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";

/** Array of [TestCase, TestResult] pairs collected during the run. */
export type SlackTestCases = [test: TestCase, result: TestResult][];

type BlocksValue = SlackBlock[] | SlackMessage;
type BlocksResolver =
  | BlocksValue
  | ((result: FullResult, testCases: SlackTestCases) => BlocksValue | Promise<BlocksValue>);

type WebhookTransport = {
  /** Slack Incoming Webhook URL */
  webhookUrl: string;
};

type BotTransport = {
  /** Slack Bot token (xoxb-...) */
  token: string;
  /** Channel ID or name to post to */
  channel: string;
};

export type SlackReporterOptions = {
  /**
   * When to send the Slack message.
   * @default 'on-failure'
   */
  send?: "always" | "never" | "on-failure";
  /**
   * Block Kit blocks (or a full message payload) to send.
   * Can be a static value or a function called with the test result and test cases.
   *
   * @example
   * // static blocks using builders
   * blocks: [header("Results"), divider()]
   *
   * @example
   * // JSX (with jsxImportSource configured)
   * blocks: <MyReport />
   *
   * @example
   * // dynamic
   * blocks: (result, testCases) => [
   *   header(`Run ${result.status}`),
   *   section(`Passed: ${testCases.filter(([,r]) => r.status === 'passed').length}`)
   * ]
   */
  blocks: BlocksResolver;
  /**
   * Fallback text shown in notifications and accessibility contexts.
   * @default 'Playwright test report'
   */
  text?: string | ((result: FullResult, testCases: SlackTestCases) => string);
  /**
   * Called after the message is successfully sent.
   */
  onSend?: (response: SlackSendResponse) => void | Promise<void>;
} & (WebhookTransport | BotTransport);

export type SlackSendResponse = {
  ok: boolean;
  /** Only present when using the Web API (bot token) */
  ts?: string;
  channel?: string;
  error?: string;
};
