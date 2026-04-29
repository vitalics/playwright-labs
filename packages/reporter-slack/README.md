# @playwright-labs/reporter-slack

Playwright reporter that sends test results to Slack using interactive [Block Kit](https://api.slack.com/block-kit) messages.

Built on top of [`@playwright-labs/slack-buildkit`](../slack-buildkit) — use the built-in `BaseTemplate` or compose your own layout with builder functions or React JSX.

---

## Installation

```bash
pnpm add @playwright-labs/reporter-slack @playwright-labs/slack-buildkit
# React templates (optional)
pnpm add react
```

---

## Quick start

### Incoming Webhook

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { BaseTemplate } from "@playwright-labs/reporter-slack/templates";

export default defineConfig({
  reporter: [
    ["@playwright-labs/reporter-slack", {
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      blocks: (result, testCases) =>
        BaseTemplate(result, testCases, {
          projectName: "My App",
          reportUrl: process.env.CI_REPORT_URL,
        }),
    }],
  ],
});
```

### Slack Web API (Bot token)

```typescript
// playwright.config.ts
export default defineConfig({
  reporter: [
    ["@playwright-labs/reporter-slack", {
      token: process.env.SLACK_BOT_TOKEN,
      channel: "C12345678",
      blocks: (result, testCases) =>
        BaseTemplate(result, testCases, { projectName: "My App" }),
    }],
  ],
});
```

---

## Configuration

```typescript
import type { ReporterOptions } from "@playwright-labs/reporter-slack";
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `webhookUrl` | `string` | — | Slack Incoming Webhook URL _(use this **or** `token`+`channel`)_ |
| `token` | `string` | — | Slack Bot token (`xoxb-…`) |
| `channel` | `string` | — | Channel ID or name (required with `token`) |
| `blocks` | `SlackBlock[] \| SlackMessage \| function` | required | Block Kit payload. Can be static, a function, or JSX |
| `send` | `"always" \| "never" \| "on-failure"` | `"on-failure"` | When to send the message |
| `text` | `string \| function` | — | Fallback text for notifications |
| `onSend` | `(response) => void` | — | Called after a successful send |

---

## Custom templates

### Builder functions

```typescript
import { header, section, divider, actions, button, context } from "@playwright-labs/slack-buildkit";
import type { ReporterOptions } from "@playwright-labs/reporter-slack";

const config: ReporterOptions = {
  webhookUrl: process.env.SLACK_WEBHOOK_URL!,
  send: "always",
  blocks: (result, testCases) => {
    const passed = testCases.filter(([, r]) => r.status === "passed").length;
    const failed = testCases.filter(([, r]) => r.status === "failed").length;

    return [
      header(`${result.status === "passed" ? "✅" : "❌"} Test Run`),
      section(`*Passed:* ${passed}  •  *Failed:* ${failed}`),
      divider(),
      context([`${new Date().toUTCString()}`]),
    ];
  },
};
```

### React JSX

```tsx
/** @jsxImportSource @playwright-labs/slack-buildkit/react */
import { Blocks, Header, Section, Divider, Actions, Button, Context } from "@playwright-labs/slack-buildkit/react";
import type { ReporterOptions } from "@playwright-labs/reporter-slack";

function Report({ passed, failed, url }: { passed: number; failed: number; url?: string }) {
  return (
    <Blocks>
      <Header>{failed > 0 ? "❌ Tests Failed" : "✅ Tests Passed"}</Header>
      <Section>{`*Passed:* ${passed}   *Failed:* ${failed}`}</Section>
      <Divider />
      {url && (
        <Actions>
          <Button url={url} style="primary" action_id="view_report">
            View Report
          </Button>
        </Actions>
      )}
      <Context>{`Ran ${passed + failed} tests • ${new Date().toUTCString()}`}</Context>
    </Blocks>
  );
}

const config: ReporterOptions = {
  webhookUrl: process.env.SLACK_WEBHOOK_URL!,
  blocks: (result, testCases) => {
    const passed = testCases.filter(([, r]) => r.status === "passed").length;
    const failed = testCases.filter(([, r]) => r.status === "failed").length;
    return <Report passed={passed} failed={failed} url={process.env.REPORT_URL} />;
  },
};
```

> Requires `jsxImportSource: "@playwright-labs/slack-buildkit/react"` in your `tsconfig.json`, or the `/** @jsxImportSource */` pragma comment at the top of the file.

---

## BaseTemplate

The built-in template renders:
- Header with status emoji and project name
- Summary line: total / passed / failed / skipped / duration
- Failed test list (first 10, with first error line)
- "View Report" button (when `reportUrl` is provided)
- Context footer with timestamp

```typescript
import { BaseTemplate, type BaseTemplateOptions } from "@playwright-labs/reporter-slack/templates";

BaseTemplate(result, testCases, {
  projectName: "My App",   // defaults to "Playwright"
  reportUrl: "https://…",  // optional — adds View Report button
});
```

---

## Environment variables

The reporter reads no environment variables itself — pass secrets through your config:

```typescript
webhookUrl: process.env.SLACK_WEBHOOK_URL,
token:      process.env.SLACK_BOT_TOKEN,
channel:    process.env.SLACK_CHANNEL_ID,
```

---

## Transport

| Transport | When to use |
|-----------|-------------|
| **Incoming Webhook** (`webhookUrl`) | Simplest setup. Fixed channel, no scopes needed. |
| **Web API** (`token` + `channel`) | Flexible: dynamic channels, thread replies (`thread_ts`), bot identity. Requires `chat:write` scope. |

---

## License

MIT
