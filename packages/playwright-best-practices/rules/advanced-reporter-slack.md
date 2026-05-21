---
title: Send Test Results to Slack with Rich Block Kit Messages via reporter-slack
impact: LOW
impactDescription: keeps teams informed of CI failures in their existing communication channel without checking dashboards
tags: slack, reporter, notifications, block-kit, ci, on-failure, webhooks, bot-token
---

## Send Test Results to Slack with Rich Block Kit Messages via reporter-slack

**Impact: LOW (keeps teams informed of CI failures in their existing communication channel without checking dashboards)**

Checking a CI dashboard for test results requires context-switching. The `@playwright-labs/reporter-slack` package sends Playwright results directly to a Slack channel as interactive [Block Kit](https://api.slack.com/block-kit) messages — with pass/fail counts, failed test list, duration, and a "View Report" button. Use the built-in `BaseTemplate`, compose blocks via builder functions, or write a full JSX template with the `@playwright-labs/slack-buildkit/react` runtime.

## When to Use

- **Use `send: "on-failure"`** (default): Notify the team only when the run has failures — avoids noise on green runs
- **Use `send: "always"`**: Daily scheduled runs where the team wants a success summary too
- **Use Incoming Webhook** when: The target channel is fixed and you don't need dynamic routing — simplest setup
- **Use Bot token** when: You need to post to different channels per project, reply in threads, or set a custom bot name
- **Use custom template** when: `BaseTemplate` doesn't match your team's format — add project links, environment badges, or assignee mentions

## Guidelines

### Do

- Store `SLACK_WEBHOOK_URL` / `SLACK_BOT_TOKEN` in CI secrets, never hardcode them
- Use `satisfies ReporterOptions` on the config object to catch misconfigured options at compile time
- Set `send: "on-failure"` on CI and `send: "never"` locally to avoid spamming the channel during development
- Add `reportUrl` to `BaseTemplate` so recipients can jump directly to the HTML report
- Use `@playwright-labs/slack-buildkit/react` JSX templates for complex layouts — the custom JSX runtime compiles to Block Kit JSON, not HTML

### Don't

- Don't put the Webhook URL or Bot token as a plain string in `playwright.config.ts` — use `process.env`
- Don't use `send: "always"` on per-PR CI runs — only on scheduled / main-branch runs
- Don't import `react` in config unless you add `@playwright-labs/slack-buildkit/react` as the `jsxImportSource` — the JSX runtime is not React DOM
- Don't exceed Slack's 50-block limit per message with very large test suites — filter or paginate the failed tests list

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/reporter-slack @playwright-labs/slack-buildkit`
- **JSX templates (optional)**: `npm install react` + `/** @jsxImportSource @playwright-labs/slack-buildkit/react */`
- **Transport**: `webhookUrl` (Incoming Webhook) or `token` + `channel` (Web API, requires `chat:write` scope)
- **Built-in template**: `import { BaseTemplate } from "@playwright-labs/reporter-slack/templates"`
- **Block builders**: `header()`, `section()`, `divider()`, `actions()`, `button()`, `context()` from `@playwright-labs/slack-buildkit`
- **`send` option**: `"always"` | `"on-failure"` (default) | `"never"`

## Edge Cases and Constraints

### Limitations

- Slack Incoming Webhooks are tied to one channel — use Bot token + `channel` option for dynamic routing
- Block Kit messages have a 50-block limit — `BaseTemplate` caps the failed tests list at 10 to stay within bounds
- `@playwright-labs/slack-buildkit/react` is a custom JSX runtime that outputs Block Kit JSON, not HTML — do not mix with `react-dom`

### Edge Cases

1. **Multiple Playwright projects**: Run the reporter once with a single `blocks` function that combines results from all projects, or add one reporter entry per project with different channel IDs.
2. **Monorepo / matrix CI**: Pass a unique `reportUrl` per job so each notification links to the correct artifact.
3. **Rate limiting**: Slack's Incoming Webhook rate limit is 1 message/second. For very long test runs with `send: "always"`, the single end-of-run message is well within limits.

### What Breaks If Ignored

- **Without reporter-slack**: Teams discover failures only when they manually check CI — delayed response to broken main
- **Without `reportUrl`**: Recipients have no direct link to the HTML report and must navigate CI manually
- **Without `send: "on-failure"`**: Every green run generates a Slack notification — channel becomes noisy and notifications are ignored

**Incorrect (no Slack notification, hardcoded secrets):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [["html"]],
  // ❌ Team never learns about failures until someone checks CI
});
```

**Correct (BaseTemplate with Incoming Webhook):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { BaseTemplate } from "@playwright-labs/reporter-slack/templates";
import { type ReporterOptions } from "@playwright-labs/reporter-slack";

export default defineConfig({
  reporter: [
    ["html"],
    [
      "@playwright-labs/reporter-slack",
      {
        // ✅ Secrets from environment — never hardcoded
        webhookUrl: process.env.SLACK_WEBHOOK_URL!,
        // ✅ Only notify on failures — no noise on green runs
        send: "on-failure",
        blocks: (result, testCases) =>
          BaseTemplate(result, testCases, {
            projectName: "My App — E2E",
            // ✅ Link to the HTML report artifact in CI
            reportUrl: process.env.CI_REPORT_URL,
          }),
      } satisfies ReporterOptions,
    ],
  ],
});
```

**Custom template with builder functions:**

```typescript
import { defineConfig } from "@playwright/test";
import {
  header, section, divider, actions, button, context,
} from "@playwright-labs/slack-buildkit";
import { type ReporterOptions } from "@playwright-labs/reporter-slack";

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-slack",
      {
        webhookUrl: process.env.SLACK_WEBHOOK_URL!,
        send: "on-failure",
        blocks: (result, testCases) => {
          const passed  = testCases.filter(([, r]) => r.status === "passed").length;
          const failed  = testCases.filter(([, r]) => r.status === "failed").length;
          const skipped = testCases.filter(([, r]) => r.status === "skipped").length;
          const emoji   = failed > 0 ? "🔴" : "✅";

          const blocks = [
            header(`${emoji} E2E — ${result.status.toUpperCase()}`),
            section(
              `*Passed:* ${passed}  •  *Failed:* ${failed}  •  *Skipped:* ${skipped}`,
            ),
            divider(),
          ];

          // ✅ List failed tests (capped to avoid hitting Slack's 50-block limit)
          if (failed > 0) {
            const failedTests = testCases
              .filter(([, r]) => r.status === "failed")
              .slice(0, 8);

            for (const [tc, r] of failedTests) {
              const err = r.errors[0]?.message?.split("\n")[0] ?? "unknown error";
              blocks.push(section(`• \`${tc.title}\`\n_${err}_`));
            }

            if (failed > 8) {
              blocks.push(section(`_…and ${failed - 8} more failures_`));
            }

            blocks.push(divider());
          }

          if (process.env.CI_REPORT_URL) {
            blocks.push(
              actions([
                button("view_report", "View Report", process.env.CI_REPORT_URL, "primary"),
              ]),
            );
          }

          blocks.push(context([
            `Branch: ${process.env.GIT_BRANCH ?? "local"}`,
            new Date().toUTCString(),
          ]));

          return blocks;
        },
      } satisfies ReporterOptions,
    ],
  ],
});
```

**JSX template (React-like syntax → Block Kit JSON):**

```tsx
// playwright.config.tsx (rename from .ts)
/** @jsxImportSource @playwright-labs/slack-buildkit/react */
import { defineConfig } from "@playwright/test";
import {
  Blocks, Header, Section, Divider, Actions, Button, Context,
} from "@playwright-labs/slack-buildkit/react";
import { type ReporterOptions } from "@playwright-labs/reporter-slack";

function TestReport({
  passed, failed, skipped, url, branch,
}: {
  passed: number; failed: number; skipped: number;
  url?: string; branch?: string;
}) {
  return (
    <Blocks>
      <Header>{failed > 0 ? "🔴 Tests Failed" : "✅ Tests Passed"}</Header>
      <Section>
        {`*Passed:* ${passed}   *Failed:* ${failed}   *Skipped:* ${skipped}`}
      </Section>
      {branch && <Section>{`Branch: \`${branch}\``}</Section>}
      <Divider />
      {url && (
        <Actions>
          <Button url={url} style="primary" action_id="view_report">
            View Report
          </Button>
        </Actions>
      )}
      <Context>{`${new Date().toUTCString()}`}</Context>
    </Blocks>
  );
}

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-slack",
      {
        webhookUrl: process.env.SLACK_WEBHOOK_URL!,
        send: "on-failure",
        blocks: (result, testCases) => {
          const passed  = testCases.filter(([, r]) => r.status === "passed").length;
          const failed  = testCases.filter(([, r]) => r.status === "failed").length;
          const skipped = testCases.filter(([, r]) => r.status === "skipped").length;
          // ✅ JSX is compiled to Block Kit JSON by @playwright-labs/slack-buildkit/react
          return (
            <TestReport
              passed={passed}
              failed={failed}
              skipped={skipped}
              url={process.env.CI_REPORT_URL}
              branch={process.env.GIT_BRANCH}
            />
          );
        },
      } satisfies ReporterOptions,
    ],
  ],
});
```

**Bot token (Web API) for dynamic channels:**

```typescript
export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-slack",
      {
        // ✅ Web API transport — allows dynamic channel selection
        token: process.env.SLACK_BOT_TOKEN!,
        // ✅ Channel ID (starts with C) or channel name
        channel: process.env.SLACK_CHANNEL_ID ?? "C12345678",
        send: "on-failure",
        blocks: (result, testCases) =>
          BaseTemplate(result, testCases, { projectName: "E2E Suite" }),
        onSend: (response) => {
          console.log("Slack notification sent:", response.ts); // thread timestamp
        },
      } satisfies ReporterOptions,
    ],
  ],
});
```

Reference: [@playwright-labs/reporter-slack](https://github.com/vitalics/playwright-labs/tree/main/packages/reporter-slack)
