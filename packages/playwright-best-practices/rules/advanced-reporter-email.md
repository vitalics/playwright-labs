---
title: Send Test Run Reports via Email with React Email Templates via reporter-email
impact: LOW
impactDescription: delivers structured test reports to stakeholders who don't have CI access
tags: email, reporter, notifications, react-email, nodemailer, ci, on-failure, html-template
---

## Send Test Run Reports via Email with React Email Templates via reporter-email

**Impact: LOW (delivers structured test reports to stakeholders who don't have CI access)**

CI dashboards are only accessible to engineers. Stakeholders, QA managers, and on-call teams often need test results delivered to their inbox. The `@playwright-labs/reporter-email` package sends Playwright results as formatted emails via any SMTP provider (Gmail, SendGrid, AWS SES, Mailgun, and 50+ others powered by nodemailer). Use the built-in React Email templates, write a custom HTML string, or author a full React component for pixel-perfect email design.

## When to Use

- **Use `send: "on-failure"`** (default): Notify only when the run breaks — avoids inbox noise on healthy runs
- **Use `send: "always"`**: Scheduled nightly runs where stakeholders want a daily summary regardless of result
- **Use built-in templates** when: You need a polished email out of the box — `PlaywrightReportEmail`, `PlaywrightReportTailwindEmail`, `PlaywrightReportShadcnEmail`
- **Use custom React template** when: You need to match brand colors, add logo, or include environment-specific information
- **Use local Maildev** when: Testing the reporter locally without sending real email

## Guidelines

### Do

- Store SMTP credentials in CI secrets and read from `process.env` — never hardcode passwords
- Use `satisfies ReporterOptions` on the config object for compile-time type checking
- Install `@react-email/components` and `@react-email/render` for email-client-compatible HTML — the renderer inlines CSS automatically for Gmail and Outlook compatibility
- Use a dynamic `subject` function that includes pass/fail status so recipients can triage from the subject line alone
- Set `send: "never"` in a local `.env` override to avoid sending emails during local development
- Test with [Maildev](https://github.com/maildev/maildev) locally (`docker run -p 1080:1080 -p 1025:1025 maildev/maildev`) before connecting a real SMTP service

### Don't

- Don't pass `html` and `text` simultaneously — they are mutually exclusive; `html` takes precedence
- Don't use `react-dom/server`'s `renderToString` directly for email — it does not inline CSS; use `@react-email/render` which handles it
- Don't name the config file `.tsx` unless `tsconfig.json` has `"jsx": "react-jsx"` — JSX in config only works when the compiler is configured for it
- Don't send large attachments (screenshots, traces) as inline email content — link to CI artifacts instead

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/reporter-email`
- **React Email (recommended)**: `npm install react react-dom @react-email/components @react-email/render`
- **Built-in templates**: `import { PlaywrightReportEmail, PlaywrightReportTailwindEmail, PlaywrightReportShadcnEmail } from "@playwright-labs/reporter-email/templates"`
- **SMTP services**: Gmail, SendGrid, AWS SES, Mailgun, Outlook365, Postmark, Brevo, Maildev (local) — 50+ via nodemailer `service` option
- **`send` option**: `"always"` | `"on-failure"` (default) | `"never"`
- **Attachments**: `attachments: [{ path: "...", name: "..." }]` — standard nodemailer attachment format

## Edge Cases and Constraints

### Limitations

- React Email requires `@react-email/render` to inline CSS — without it the reporter falls back to `react-dom/server` which produces class-based CSS that breaks in Gmail
- Gmail with `service: "Gmail"` requires an App Password when 2FA is enabled — not the account password
- AWS SES requires the `from` address to be verified in SES before sending
- File attachments add to email size — Outlook and Gmail enforce ~25MB limits

### Edge Cases

1. **Image attachments as inline CID**: Reference the attachment in HTML as `<img src="cid:image.png">` and include the same `name` in the `attachments` array with a matching `contentType`.
2. **Rendering custom JSX in `.ts` config**: Use `React.createElement(MyComponent, props)` instead of JSX syntax — no `tsconfig.json` changes needed.
3. **Large test suites**: The built-in templates render every test row — for 500+ tests, consider filtering to only failed tests in your `html` function to keep email size manageable.

### What Breaks If Ignored

- **Without email reporter**: Stakeholders without CI access never learn about failures until an engineer escalates manually
- **Without `@react-email/render`**: Emails render correctly in a browser preview but break in Gmail (CSS stripped) and Outlook (CSS not supported)
- **Without dynamic subject**: Subject line reads "Playwright Test Report" on both pass and fail — recipients cannot triage without opening the email

**Incorrect (no email, or hardcoded credentials with plain HTML):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [["html"]],
  // ❌ Stakeholders have no visibility without CI access
});
```

```typescript
// ❌ Hardcoded credentials + static subject + no template
[
  "@playwright-labs/reporter-email",
  {
    from: "bot@company.com",
    to: "team@company.com",
    subject: "Playwright Report",          // ❌ same subject always — impossible to triage
    html: "<p>Tests ran.</p>",             // ❌ no results, useless
    // ❌ SMTP password in plaintext in source code
    auth: { user: "bot@company.com", pass: "s3cr3t" },
  },
]
```

**Correct (built-in React Email template via Incoming credentials from env):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import React from "react";
import { type ReporterOptions } from "@playwright-labs/reporter-email";
import { PlaywrightReportEmail } from "@playwright-labs/reporter-email/templates";

export default defineConfig({
  reporter: [
    ["html"],
    [
      "@playwright-labs/reporter-email",
      {
        // ✅ Credentials from CI secrets
        service: "SendGrid",
        auth: {
          user: "apikey",
          pass: process.env.SENDGRID_API_KEY!,
        },
        from: "ci@company.com",
        to: ["qa-team@company.com", "product@company.com"],
        // ✅ Dynamic subject makes triage possible from inbox
        subject: (result) =>
          `[E2E] ${result.status === "passed" ? "✅ Passed" : "❌ Failed"} — ${new Date().toLocaleDateString()}`,
        // ✅ Built-in template — polished, email-client compatible
        html: (result, testCases) =>
          React.createElement(PlaywrightReportEmail, { result, testCases }),
        // ✅ Only send on failure — no inbox noise on green runs
        send: "on-failure",
      } satisfies ReporterOptions,
    ],
  ],
});
```

**Swap templates — three built-in styles:**

```typescript
// Default (inline styles — maximum compatibility)
import { PlaywrightReportEmail } from "@playwright-labs/reporter-email/templates";

// Tailwind CSS layout
import { PlaywrightReportTailwindEmail } from "@playwright-labs/reporter-email/templates";

// shadcn/ui-inspired design (status badge, card border)
import { PlaywrightReportShadcnEmail } from "@playwright-labs/reporter-email/templates";

// All accept identical props: { result, testCases }
html: (result, testCases) =>
  React.createElement(PlaywrightReportShadcnEmail, { result, testCases }),
```

**Custom React Email template:**

```tsx
// emails/report.tsx
import React from "react";
import {
  Html, Head, Body, Container, Heading, Text, Hr, Row, Column,
} from "@react-email/components";
import type { FullResult } from "@playwright/test/reporter";
import type { TestCases } from "@playwright-labs/reporter-email";

export function CompanyReport({
  result,
  testCases,
  env,
}: {
  result: FullResult;
  testCases: TestCases;
  env?: string;
}) {
  const failed  = testCases.filter(([, r]) => r.status === "failed");
  const passed  = testCases.filter(([, r]) => r.status === "passed");

  return (
    <Html lang="en">
      <Head />
      <Body style={{ fontFamily: "sans-serif", background: "#f4f4f4" }}>
        <Container style={{ background: "#fff", padding: "24px", borderRadius: "8px" }}>
          <Heading style={{ color: failed.length > 0 ? "#dc2626" : "#16a34a" }}>
            {failed.length > 0 ? "❌ Tests Failed" : "✅ All Tests Passed"}
          </Heading>
          {env && <Text style={{ color: "#6b7280" }}>Environment: {env}</Text>}
          <Hr />
          <Row>
            <Column><Text><strong>Passed:</strong> {passed.length}</Text></Column>
            <Column><Text><strong>Failed:</strong> {failed.length}</Text></Column>
          </Row>
          {failed.length > 0 && (
            <>
              <Hr />
              <Heading as="h3">Failed Tests</Heading>
              {failed.slice(0, 10).map(([tc, r], i) => (
                <Text key={i} style={{ color: "#dc2626" }}>
                  • {tc.title}
                  {r.errors[0]?.message && (
                    <span style={{ color: "#6b7280", fontSize: "12px" }}>
                      {" — "}{r.errors[0].message.split("\n")[0]}
                    </span>
                  )}
                </Text>
              ))}
            </>
          )}
          <Hr />
          <Text style={{ color: "#9ca3af", fontSize: "12px" }}>
            {new Date().toUTCString()}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

```typescript
// playwright.config.ts — use custom template
import React from "react";
import { CompanyReport } from "./emails/report";

html: (result, testCases) =>
  React.createElement(CompanyReport, {
    result,
    testCases,
    env: process.env.ENVIRONMENT ?? "staging",
  }),
```

**Local development with Maildev:**

```bash
# Start Maildev — local SMTP + web UI (no real emails sent)
docker run -p 1080:1080 -p 1025:1025 maildev/maildev
```

```typescript
// playwright.config.ts — local testing config
export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-email",
      {
        service: "Maildev",
        port: 1025,
        from: "ci@local.dev",
        to: "team@local.dev",
        subject: (r) => `[LOCAL] ${r.status}`,
        send: "always",
        html: (result, testCases) =>
          React.createElement(PlaywrightReportEmail, { result, testCases }),
      } satisfies ReporterOptions,
    ],
  ],
});
// Open http://localhost:1080 to view the rendered email
```

**AWS SES with attachments:**

```typescript
export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-email",
      {
        service: "SES-EU-WEST-1",
        auth: {
          user: process.env.AWS_SES_ACCESS_KEY!,
          pass: process.env.AWS_SES_SECRET_KEY!,
        },
        from: "noreply@company.com",   // must be SES-verified
        to: "team@company.com",
        subject: (r) =>
          `[E2E] ${r.status === "passed" ? "✅" : "❌"} ${process.env.ENVIRONMENT}`,
        html: (result, testCases) =>
          React.createElement(PlaywrightReportEmail, { result, testCases }),
        send: "on-failure",
        // ✅ Attach the Playwright HTML report
        attachments: [
          {
            path: "playwright-report/index.html",
            name: "playwright-report.html",
          },
        ],
      } satisfies ReporterOptions,
    ],
  ],
});
```

Reference: [@playwright-labs/reporter-email](https://github.com/vitalics/playwright-labs/tree/main/packages/reporter-email)
