---
title: "Reporter Email"
description: "API reference for @playwright-labs/reporter-email, including the HTML helpers and built-in templates."
---

Source files: [`packages/reporter-email/src/index.ts`](/workspace/home/playwright-labs/packages/reporter-email/src/index.ts), [`packages/reporter-email/src/reporter.ts`](/workspace/home/playwright-labs/packages/reporter-email/src/reporter.ts), [`packages/reporter-email/src/html.ts`](/workspace/home/playwright-labs/packages/reporter-email/src/html.ts), [`packages/reporter-email/src/templates/index.ts`](/workspace/home/playwright-labs/packages/reporter-email/src/templates/index.ts).

## Imports

```ts
import Reporter, {
  type ReporterOptions,
  type TestCases,
  h,
  html,
  body,
  head,
  title,
  div,
  p,
  ul,
  li,
  a,
  img,
  table,
  tbody,
  thead,
  tr,
  td,
  th,
  fragment,
  PlaywrightReportEmail,
  PlaywrightReportTailwindEmail,
  PlaywrightReportShadcnEmail,
  PlaywrightReportShadcnChartEmail,
  PlaywrightReportShadcnButtonEmail,
  PlaywrightReportShadcnThemesEmail,
} from "@playwright-labs/reporter-email";
```

## Reporter Options

```ts
export type NodemailerReporterOptions = {
  send?: "always" | "never" | "on-failure";
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  secure?: boolean;
  from: string;
  host?: string;
  port?: number;
  service?: string;
  auth?: Record<string, string>;
  headers?: Record<string, string> | Headers;
  attachments?: Attachment[];
  subject: string | ((result: FullResult) => string);
  onEmailSend?: (info: SMTPTransport.SentMessageInfo) => void | Promise<void>;
} & ({ text: string | ((result: FullResult, testCases: NodemailerTestCases) => string | Promise<string>) } | {
  html: string | ReactElement | ((result: FullResult, testCases: NodemailerTestCases) => string | ReactElement | Promise<string | ReactElement>)
});
```

## Reporter Class

```ts
export default class EmailReporter implements Reporter {
  constructor(options: NodemailerReporterOptions);
  onTestEnd(test: TestCase, result: TestResult): void;
  onEnd(result: FullResult): Promise<void>;
}
```

The reporter renders React email templates with `@react-email/render` when available and falls back to `react-dom/server`.

## HTML Helper Surface

```ts
h(tag: string, children?: string[] | string | TemplateStringsArray, attributes?: Record<string, string>, selfClosing?: boolean): string
fragment(...children: TemplateStringsArray | string[]): string
```

The package also exports convenience creators such as `html`, `body`, `head`, `div`, `table`, `tr`, `td`, and `img`.

## Built-In Templates

From `packages/reporter-email/src/templates/index.ts`:

```ts
PlaywrightReportEmail
PlaywrightReportTailwindEmail
PlaywrightReportShadcnEmail
PlaywrightReportShadcnChartEmail
PlaywrightReportShadcnButtonEmail
PlaywrightReportShadcnThemesEmail
type ShadcnTheme = "slate" | "zinc" | "rose" | "blue" | "green" | "orange"
```

Use the base template for plain HTML, the Tailwind template for utility-class styling, and the shadcn variants for more opinionated visual layouts.
