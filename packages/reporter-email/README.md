# Playwright email Reporter

This is a Playwright plugin that sends email reports after test runs using nodemailer.

## Installation

To install the Playwright Email Reporter plugin, run the following command:

```bash
npm install @playwright-labs/reporter-email # npm
yarn add @playwright-labs/reporter-email # yarn
pnpm add @playwright-labs/reporter-email # pnpm
```

## Usage

To use the Playwright Email Reporter plugin, add it to your Playwright configuration file:

```ts
import { defineConfig } from "@playwright/test";
import { type ReporterOptions } from "@playwright-labs/reporter-email";

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-email",
      {
        from: "your-email@example.com",
        to: "recipient-email@example.com",
        subject: "Playwright Test Report",
        html: "<p>Test report</p>",
      } satisfies ReporterOptions,
    ],
  ],
});
```

## Reporter Options

- `send`: `'always' | 'on-failure' | 'never'`. Default is `'on-failure'`
- `from`: string. Who sends the email.
- `to`: string | string[]. Recipient email address.
- `subject`: string | ((result: FullResult) => string). Subject of the email.
- `html`: string | ReactElement | ((result: FullResult, testCases: TestCases) => string | ReactElement | Promise<string | ReactElement>). HTML body of the email. Mutually exclusive with `text`.
- `text`: string | ((result: FullResult, testCases: TestCases) => string | Promise<string>). Plain-text body. Mutually exclusive with `html`.

## Dynamic message (depends on the test results)

```ts
import { defineConfig } from "@playwright/test";
import {
  type ReporterOptions,
  type TestCases,
} from "@playwright-labs/reporter-email";

function formatTable(result: TestResult, testCases: TestCases) {
  const str = Object.values(testCases).forEach((testCase) => {
    return `<tr><td>${testCase.test.name}</td><td>${testCase.result.status}</td></tr>`;
  });
  return `<table>${str}</table>`;
}

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-email",
      {
        send: "always",
        from: "your-email@example.com",
        to: "recipient-email@example.com",
        subject: (result) =>
          `Playwright Test Report - ${result.status === "success" ? "Success" : "Failure"}`,
        html: (result, testCases) =>
          `<p>Test report for ${formatTable(result, testCases)}</p>`,
      } satisfies ReporterOptions,
    ],
  ],
});
```

## Built-in templates

The package ships ready-made email templates under the `@playwright-labs/reporter-email/templates` subpath. All templates are built with [React Email](https://react.email) for maximum email-client compatibility.

### Available templates

All templates accept the same props: `result: FullResult` and `testCases: TestCases`.

| Name | Description |
|------|-------------|
| `PlaywrightReportEmail` | Default template — bold colour-coded header, stats row, per-test table with inline styles |
| `PlaywrightReportTailwindEmail` | Same layout built with Tailwind CSS utility classes via the `<Tailwind>` React Email component |
| `PlaywrightReportShadcnEmail` | shadcn/ui-inspired design — status badge, top accent bar, card border, monochromatic palette |

All templates are exported from the same subpath:

```ts
import {
  PlaywrightReportEmail,
  PlaywrightReportTailwindEmail,
  PlaywrightReportShadcnEmail,
} from "@playwright-labs/reporter-email/templates";
```

### Quick start

Install the required peer dependencies:

```bash
npm install react react-dom @react-email/components @react-email/render
pnpm add react react-dom @react-email/components @react-email/render
```

Add to your `playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";
import React from "react";
import { type ReporterOptions } from "@playwright-labs/reporter-email";
import { PlaywrightReportEmail } from "@playwright-labs/reporter-email/templates";

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-email",
      {
        from: "reporter@example.com",
        to: "team@example.com",
        send: "on-failure",
        subject: (result) =>
          `[Playwright] ${result.status.toUpperCase()} — ${new Date().toLocaleDateString()}`,
        // Swap the component to change the design:
        //   PlaywrightReportEmail         — default (inline styles)
        //   PlaywrightReportTailwindEmail — Tailwind CSS
        //   PlaywrightReportShadcnEmail   — shadcn/ui-inspired
        html: (result, testCases) =>
          React.createElement(PlaywrightReportEmail, { result, testCases }),
      } satisfies ReporterOptions,
    ],
  ],
});
```

When `@react-email/render` is installed, the reporter uses its `render()` function automatically — the resulting HTML has inlined CSS and is compatible with Gmail, Outlook, Apple Mail, and Yahoo. Without it, the reporter falls back to `react-dom/server`'s `renderToString`.

### Preview template in the browser

The `examples/` directory contains a fully runnable setup. It includes the React Email dev server so you can inspect the template visually without sending a real email.

```bash
cd examples
pnpm install
pnpm email:preview   # starts http://localhost:3000
```

The `emails/playwright-report.tsx` file inside `examples/` provides mock data and is picked up automatically by the React Email dev server.

To run the actual tests and receive an email (requires local [Maildev](https://github.com/maildev/maildev)):

```bash
docker run -p 1080:1080 -p 1025:1025 maildev/maildev
pnpm test            # from examples/
open http://localhost:1080
```

A full working example is in [`examples/`](./examples/).

## React Email templates

[React Email](https://react.email) provides battle-tested components that render correctly across all major email clients (Gmail, Outlook, Apple Mail, Yahoo, etc.). The reporter has built-in support for React Email via `@react-email/render`.

### Installation

Install the optional peer dependencies:

```bash
npm install react react-dom @react-email/components @react-email/render
pnpm add react react-dom @react-email/components @react-email/render
```

### Built-in template

The package ships a ready-made `PlaywrightReportEmail` template built with React Email. It displays:
- Overall run status with colour-coded header
- Passed / Failed / Skipped counters
- Per-test table with title, suite name, status and duration

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import React from "react";
import {
  type ReporterOptions,
  PlaywrightReportEmail,
} from "@playwright-labs/reporter-email";

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-email",
      {
        from: "reporter@example.com",
        to: "team@example.com",
        subject: (result) => `Playwright Report — ${result.status}`,
        html: (result, testCases) =>
          React.createElement(PlaywrightReportEmail, { result, testCases }),
      } satisfies ReporterOptions,
    ],
  ],
});
```

If `@react-email/render` is installed, the reporter uses its `render()` function automatically — producing email-compatible HTML with inline CSS. Without it, the reporter falls back to `react-dom/server`'s `renderToString`.

### Custom React Email template

You can build your own template using any `@react-email/components` and pass it the same way:

```tsx
// my-template.tsx
import React from "react";
import { Html, Head, Body, Container, Heading, Text, Hr } from "@react-email/components";
import type { FullResult } from "@playwright/test/reporter";
import type { TestCases } from "@playwright-labs/reporter-email";

export function MyTemplate({ result, testCases }: { result: FullResult; testCases: TestCases }) {
  return (
    <Html lang="en">
      <Head />
      <Body>
        <Container>
          <Heading>Status: {result.status}</Heading>
          <Hr />
          {testCases.map(([tc, r], i) => (
            <Text key={i}>{tc.title} — {r.status}</Text>
          ))}
        </Container>
      </Body>
    </Html>
  );
}
```

```ts
// playwright.config.ts
import React from "react";
import { defineConfig } from "@playwright/test";
import { type ReporterOptions } from "@playwright-labs/reporter-email";
import { MyTemplate } from "./my-template";

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-email",
      {
        from: "reporter@example.com",
        to: "team@example.com",
        subject: "Playwright Report",
        html: (result, testCases) =>
          React.createElement(MyTemplate, { result, testCases }),
      } satisfies ReporterOptions,
    ],
  ],
});
```

> **Note:** To use JSX syntax in your config, rename `playwright.config.ts` → `playwright.config.tsx` and ensure `tsconfig.json` includes `"jsx": "react-jsx"`.

## React (JSX) templates

The `html` option also accepts a React element — the reporter calls `react-dom/server`'s `renderToString` internally. Install the optional peer dependencies first:

```bash
npm install react react-dom      # npm
pnpm add react react-dom         # pnpm
```

### Static element

```tsx
// playwright.config.tsx
import { defineConfig } from "@playwright/test";
import React from "react";
import { type ReporterOptions } from "@playwright-labs/reporter-email";

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-email",
      {
        from: "reporter@example.com",
        to: "team@example.com",
        subject: "Playwright Report",
        html: <p>Test run finished.</p>,
      } satisfies ReporterOptions,
    ],
  ],
});
```

### Dynamic element using test results

```tsx
// playwright.config.tsx
import { defineConfig } from "@playwright/test";
import React from "react";
import type { FullResult } from "@playwright/test/reporter";
import {
  type ReporterOptions,
  type TestCases,
} from "@playwright-labs/reporter-email";

function Report({
  result,
  testCases,
}: {
  result: FullResult;
  testCases: TestCases;
}) {
  return (
    <div>
      <h1>Playwright Report — {result.status}</h1>
      <table>
        <thead>
          <tr>
            <th>Test</th>
            <th>Status</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {testCases.map(([testCase, testResult], i) => (
            <tr key={i}>
              <td>{testCase.title}</td>
              <td>{testResult.status}</td>
              <td>{testResult.duration}ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-email",
      {
        from: "reporter@example.com",
        to: "team@example.com",
        subject: (result) => `Playwright Report — ${result.status}`,
        html: (result, testCases) => (
          <Report result={result} testCases={testCases} />
        ),
      } satisfies ReporterOptions,
    ],
  ],
});
```

> **Note:** To use JSX syntax in your config, rename `playwright.config.ts` → `playwright.config.tsx` and ensure your `tsconfig.json` includes `"jsx": "react-jsx"` (or `"react"`).

## HTML Templates

Example of using html templates

You are available next tags:

- `h` - general element creator function
- `fragment` - fragment that allows to combine several elements without array usage.
- `div`
- `a`
- `img`
- `br`
- `hr`
- `ul`
- `li`
- `table`
- `thead`
- `tbody`
- `tr`
- `td`
- `th`

```ts
import {
  div,
  h1,
  p,
  table,
  thead,
  tbody,
  tr,
  td,
  fragment,
} from "@playwright-labs/reporter-email";

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-email",
      {
        send: "always",
        from: "your-email@example.com",
        to: "recipient-email@example.com",
        subject: (result) =>
          `Playwright Test Report - ${result.status === "success" ? "Success" : "Failure"}`,
        html: (result, testCases) =>
          div(
            fragment(
              h1(
                `Playwright Test Report - ${result.status === "success" ? "Success" : "Failure"}`,
              ),
              p(`Test report table`),
              table(
                fragment(
                  thead(
                    tr(fragment(td("Test Name"), td("Status"), td("Duration"))),
                  ),
                  tbody(
                    testCases.map((testCase) =>
                      tr(
                        fragment(
                          td(testCase.title),
                          td(testCase.status),
                          td(testCase.duration),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
      } satisfies ReporterOptions,
    ],
  ],
});
```

## Working with attachments

To attach files to the email, you can use the `attachments` option:

```ts
import { defineConfig } from "@playwright/test";
import {
  type ReporterOptions,
  type TestCases,
} from "@playwright-labs/reporter-email";

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-email",
      {
        send: "always",
        from: "your-email@example.com",
        to: "recipient-email@example.com",
        subject: (result) => `Playwright Test Report for ${result.status}`,
        html: (result, testCases: TestCases) =>
          `<p>Test report for #${Object.values(testCases).length} tests</p>`,
        attachments: [
          {
            path: "path/to/file",
            name: "file.txt",
          },
        ],
      } satisfies ReporterOptions,
    ],
  ],
});
```

Example with [maildev](https://github.com/maildev/maildev?tab=readme-ov-file#docker-run) local service:

```ts
import { defineConfig } from "@playwright/test";
import { type ReporterOptions } from "@playwright-labs/reporter-email";

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-email",
      {
        send: "always",
        service: "Maildev",
        port: 1025,
        from: "from@email.fr",
        to: "to@email.fr",
        subject: "Playwright Test Report",
        html: (result, testCases) => {
          return `
          HTML Result:
          <table>
            <tr>
              <th>Test Name</th>
              <th>Status</th>
            </tr>
            ${testCases
              .map(
                ([testCase, result]) => `
              <tr>
                <td>${testCase.title}</td>
                <td>${result.status}</td>
              </tr>
            `,
              )
              .join("")}
          </table>
          `;
        },
      } satisfies ReporterOptions,
    ],
  ],
});
```

Result of test report from maildev UI (http://localhost:1080): ![Test Report](./docs/example-report.png)

Example with an image [attachment](https://nodemailer.com/message/attachments):

```ts
import { defineConfig } from "@playwright/test";
import { type ReporterOptions } from "@playwright-labs/reporter-email";

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-email",
      {
        send: "always",
        from: "your-email@example.com",
        to: "recipient-email@example.com",
        subject: (result) => `Playwright Test Report for ${result.testId}`,
        html: (result) => `<p>Test report for ${result.testId}</p>
        <img src="cid:image.png" alt="Image Attachment" />`,
        attachments: [
          {
            path: "path/to/file",
            name: "file.txt",
          },
          {
            path: "path/to/image.png",
            name: "image.png",
            contentType: "image/png",
          },
        ],
      } satisfies ReporterOptions,
    ],
  ],
});
```

## Services

All services are optional and reused from nodemailer. [See the docs of supported services](https://nodemailer.com/smtp/well-known-services#list-of-builtin-services).

| Service               | ID Provider                      | SMTP host                               | Port |
| --------------------- | -------------------------------- | --------------------------------------- | ---- |
| 1und1                 | 1&1 IONOS                        | smtp.1und1.de                           | 465  |
| 126                   | 126 Mail                         | smtp.126.com                            | 465  |
| 163                   | 163 Mail                         | smtp.163.com                            | 465  |
| Aliyun                | Alibaba Cloud (Aliyun)           | smtp.aliyun.com                         | 465  |
| AliyunQiye            | Alibaba Cloud Enterprise         | smtp.qiye.aliyun.com                    | 465  |
| AOL                   | AOL Mail                         | smtp.aol.com                            | 587  |
| Bluewin               | Swisscom Bluewin                 | smtpauths.bluewin.ch                    | 465  |
| DebugMail             | DebugMail.io                     | debugmail.io                            | 25   |
| DynectEmail           | Oracle Dynect Email              | smtp.dynect.net                         | 25   |
| Ethereal              | Ethereal Email (test)            | smtp.ethereal.email                     | 587  |
| FastMail              | FastMail                         | smtp.fastmail.com                       | 465  |
| Feishu                | Mail Feishu Mail                 | smtp.feishu.cn                          | 465  |
| Forward               | Email Forward Email              | smtp.forwardemail.net                   | 465  |
| GandiMail             | Gandi Mail                       | mail.gandi.net                          | 587  |
| Gmail                 | Gmail / Google Workspace         | smtp.gmail.com                          | 465  |
| Godaddy               | GoDaddy (US)                     | smtpout.secureserver.net                | 25   |
| GodaddyAsia           | GoDaddy (Asia)                   | smtp.asia.secureserver.net              | 25   |
| GodaddyEurope         | GoDaddy (Europe)                 | smtp.europe.secureserver.net            | 25   |
| hot.ee                | Hot.ee                           | mail.hot.ee                             | 25   |
| Hotmail               | Microsoft Outlook / Hotmail      | smtp-mail.outlook.com                   | 587  |
| iCloud                | Apple iCloud Mail                | smtp.mail.me.com                        | 587  |
| Infomaniak            | Infomaniak Mail                  | mail.infomaniak.com                     | 587  |
| Loopia                | Loopia                           | mailcluster.loopia.se                   | 465  |
| mail.ee               | Mail.ee                          | smtp.mail.ee                            | 25   |
| Mail.ru               | Mail.ru                          | smtp.mail.ru                            | 465  |
| Mailcatch.app         | Mailcatch.app (sandbox)          | sandbox-smtp.mailcatch.app              | 2525 |
| Maildev               | Maildev (local)                  | 127.0.0.1                               | 1025 |
| Mailgun               | Mailgun                          | smtp.mailgun.org                        | 465  |
| Mailjet               | Mailjet                          | in.mailjet.com                          | 587  |
| Mailosaur             | Mailosaur                        | mailosaur.io                            | 25   |
| Mailtrap              | Mailtrap                         | live.smtp.mailtrap.io                   | 587  |
| Mandrill              | Mandrill                         | smtp.mandrillapp.com                    | 587  |
| Naver                 | Naver                            | smtp.naver.com                          | 587  |
| One                   | one.com                          | send.one.com                            | 465  |
| OpenMailBox           | OpenMailBox                      | smtp.openmailbox.org                    | 465  |
| OhMySMTP              | OhMySMTP                         | smtp.ohmysmtp.com                       | 587  |
| Outlook365            | Microsoft 365 / Outlook 365      | smtp.office365.com                      | 587  |
| Postmark              | Postmark                         | smtp.postmarkapp.com                    | 2525 |
| Proton                | Proton Mail                      | smtp.protonmail.ch                      | 587  |
| qiye.aliyun           | Aliyun Enterprise (mxhichina)    | smtp.mxhichina.com                      | 465  |
| QQ                    | QQ Mail                          | smtp.qq.com                             | 465  |
| QQex                  | QQ Enterprise Mail               | smtp.exmail.qq.com                      | 465  |
| SendCloud             | SendCloud                        | smtp.sendcloud.net                      | 2525 |
| SendGrid              | SendGrid                         | smtp.sendgrid.net                       | 587  |
| SendinBlue            | Brevo (formerly Sendinblue)      | smtp-relay.brevo.com                    | 587  |
| SendPulse             | SendPulse                        | smtp-pulse.com                          | 465  |
| SES                   | AWS SES (generic)                | email-smtp.us-east-1.amazonaws.com      | 465  |
| SES-US-EAST-1         | AWS SES US East (N. Virginia)    | email-smtp.us-east-1.amazonaws.com      | 465  |
| SES-US-WEST-2         | AWS SES US West (Oregon)         | email-smtp.us-west-2.amazonaws.com      | 465  |
| SES-EU-WEST-1         | AWS SES EU West (Ireland)        | email-smtp.eu-west-1.amazonaws.com      | 465  |
| SES-AP-SOUTH-1        | AWS SES Asia Pacific (Mumbai)    | email-smtp.ap-south-1.amazonaws.com     | 465  |
| SES-AP-NORTHEAST-1    | AWS SES Asia Pacific (Tokyo)     | email-smtp.ap-northeast-1.amazonaws.com | 465  |
| SES-AP-NORTHEAST-2    | AWS SES Asia Pacific (Seoul)     | email-smtp.ap-northeast-2.amazonaws.com | 465  |
| SES-AP-NORTHEAST-3    | AWS SES Asia Pacific (Osaka)     | email-smtp.ap-northeast-3.amazonaws.com | 465  |
| SES-AP-SOUTHEAST-1    | AWS SES Asia Pacific (Singapore) | email-smtp.ap-southeast-1.amazonaws.com | 465  |
| SES-AP-SOUTHEAST-2AWS | SES Asia Pacific (Sydney)        | email-smtp.ap-southeast-2.amazonaws.com | 465  |
| Seznam                | Seznam.cz                        | Email smtp.seznam.cz                    | 465  |
| Sparkpost             | SparkPost                        | smtp.sparkpostmail.com                  | 587  |
| Tipimail              | Tipimail                         | smtp.tipimail.com                       | 587  |
| Yahoo                 | Yahoo Mail                       | smtp.mail.yahoo.com                     | 465  |
| Yandex                | Yandex Mail                      | smtp.yandex.ru                          | 465  |
| Zoho                  | Zoho Mail                        | smtp.zoho.com                           | 465  |

## API reference

### type TestCases

Array<[test: TestCase, result: TestResult]>

Where `value` is an array with 2 keys.

- `0` - `TestCase` - [TestCase](https://playwright.dev/docs/api/class-testcase) Object from Playwright.
- `1` - `TestResult` - [TestResult](https://playwright.dev/docs/api/class-testresult) Object from Playwright.

### type ReporterOptions

Options for the email reporter.

- `send` (optional) - `"always" | "never" | "on-failure"` - When to send email. Default is `"on-failure"`
- `from` (required) - `string` - Sender email address.
- `to` (required) - `string` - Recipient email address.
- `subject` (required) - `string` - Email subject.
- `html` (optional, required if no `text`) - `string | ReactElement | ((result, testCases) => string | ReactElement | Promise<string | ReactElement>)` - HTML body. Accepts a plain string, a React element (rendered via `renderToString`), or a function returning either.
- `text` (optional, required if no `html`) - `string | ((result, testCases) => string | Promise<string>)` - Plain-text body. Recommended to use `html` instead.
- `cc` (optional) - `string` - Recipient email address.
- `bcc` (optional) - `string` - Recipient email address.
- `attachments` (optional) - `Attachment[]` - Array of attachments.

### PlaywrightReportEmail

A built-in React Email template component. Exported from the `./templates` subpath.

```ts
import { PlaywrightReportEmail } from "@playwright-labs/reporter-email/templates";
```

**Props:**

- `result` — `FullResult` from `@playwright/test/reporter`
- `testCases` — `TestCases` (array of `[TestCase, TestResult]` pairs)

Renders a responsive email with a status header, passed/failed/skipped counters, and a per-test results table.

Requires `@react-email/components` and `@react-email/render` to be installed.

### type Attachment

Described at [nodemailer attachment docs](https://nodemailer.com/message/attachments/)

Can be either a file path or a buffer.

- `filename` - `string` - Path to the file to attach.
- `content` - `string` - Content of the attachment. `string` or `Buffer`
- `contentType` - `string` - MIME type of the attachment. Example: `application/octet-stream`

- `href` - `string` - URL of the attachment. `content` field is optional in this case.
