---
title: "Reporter Slack"
description: "API reference for @playwright-labs/reporter-slack."
---

Source files: [`packages/reporter-slack/src/index.ts`](/workspace/home/playwright-labs/packages/reporter-slack/src/index.ts), [`packages/reporter-slack/src/types.ts`](/workspace/home/playwright-labs/packages/reporter-slack/src/types.ts), [`packages/reporter-slack/src/reporter.ts`](/workspace/home/playwright-labs/packages/reporter-slack/src/reporter.ts), [`packages/reporter-slack/src/templates/index.ts`](/workspace/home/playwright-labs/packages/reporter-slack/src/templates/index.ts).

## Imports

```ts
import Reporter, {
  type SlackReporterOptions,
  type SlackSendResponse,
  type SlackTestCases,
  BaseTemplate,
  WithOptionsTemplate,
  WithTableTemplate,
} from "@playwright-labs/reporter-slack";
```

## Reporter Options

```ts
export type SlackReporterOptions = {
  send?: "always" | "never" | "on-failure";
  blocks: SlackBlock[] | SlackMessage | ((result: FullResult, testCases: SlackTestCases) => SlackBlock[] | SlackMessage | Promise<...>);
  text?: string | ((result: FullResult, testCases: SlackTestCases) => string);
  onSend?: (response: SlackSendResponse) => void | Promise<void>;
} & ({ webhookUrl: string } | { token: string; channel: string });
```

| Option | Default | Description |
|---|---|---|
| `send` | `"on-failure"` | Controls when the message is sent. |
| `blocks` | — | Static or computed Block Kit payload. |
| `text` | — | Fallback text for notifications and accessibility. |
| `onSend` | — | Callback invoked after a successful send. |
| `webhookUrl` | — | Incoming Webhook transport. |
| `token` + `channel` | — | Web API transport. |

## Reporter Class

```ts
export default class SlackReporter implements Reporter {
  constructor(options: SlackReporterOptions);
  onTestEnd(test: TestCase, result: TestResult): void;
  onEnd(result: FullResult): Promise<void>;
}
```

## Templates

```ts
export function BaseTemplate(result: FullResult, testCases: SlackTestCases, options?: BaseTemplateOptions): SlackBlock[] | SlackMessage;
export function WithOptionsTemplate(result: FullResult, testCases: SlackTestCases, options?: WithOptionsTemplateOptions): SlackBlock[] | SlackMessage;
export function WithTableTemplate(result: FullResult, testCases: SlackTestCases, options?: WithTableTemplateConfig): SlackBlock[] | SlackMessage;
```

`BaseTemplate` gives a compact summary, `WithOptionsTemplate` exposes per-status display controls, and `WithTableTemplate` adds table-style environment rendering with optional secret masking.

## Example

```ts
import { defineConfig } from "@playwright/test";
import { BaseTemplate } from "@playwright-labs/reporter-slack";

export default defineConfig({
  reporter: [[
    "@playwright-labs/reporter-slack",
    {
      webhookUrl: process.env.SLACK_WEBHOOK_URL!,
      send: "on-failure",
      text: "Playwright report",
      blocks: (result, testCases) => BaseTemplate(result, testCases),
    },
  ]],
});
```
