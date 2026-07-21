# @playwright-labs/reporter-email

## 1.1.5

### Patch Changes

- Updated dependencies [2c8022d]
  - @playwright-labs/reporter-core@1.1.0

## 1.1.4

### Patch Changes

- e5fb985: First release of `@playwright-labs/reporter-core` — the unified base for all `@playwright-labs/reporter-*` packages.
  - `BaseReporter` — accumulates `TestCases` (`[test, result][]`) in `onTestEnd`, keeps per-status `counts`, stores `config`, resolves `Template` options (`T | ((result, testCases) => T | Promise<T>)`, the same `(result, testCases)` contract that reporter-email/reporter-slack templates use), `printsToStdio() === false`.
  - All reporter packages now extend `BaseReporter` instead of re-implementing accumulation (internal refactor — `NodemailerTestCases`/`SlackTestCases` remain as aliases of `TestCases`; no behavior changes).
  - `reporter-desktop-native-notification`: new `message` option — static string or a `(result, testCases)` template, overriding the built-in counts summary.

  ```ts
  import { BaseReporter, type Template } from "@playwright-labs/reporter-core";

  export default class MyReporter extends BaseReporter {
    override onTestEnd(test, result) {
      super.onTestEnd(test, result); // keep the accumulation working
      // …your per-test logic
    }

    async onEnd(result) {
      const text = await this.resolveTemplate(this.options.text, result);
      // …send
    }
  }
  ```

- Updated dependencies [e5fb985]
  - @playwright-labs/reporter-core@1.0.0

## 1.1.3

### Patch Changes

- fef3bff: Docs: fix README inaccuracies across packages.
  - SQL: the `pull` CLI is `@playwright-labs/sql-core`'s, not `fixture-sql`'s — all invocations corrected to `pnpm sql-core pull --adapter … --url … [--out …]` (with a note that pnpm only links bins of direct dependencies); `sql-core` README now documents the CLI; generated-file attribution fixed.
  - `fixture-abort`: fix wrong import package name; document the real fixture names `signal` and `useSignalWithTimeout` (was `abortSignal` / `useAbortSignalWithTimeout` — aligned README, JSDoc, and the validation error message).
  - `fixture-env`: add missing `createEnv` imports (subpath-only export), fix the zod example, remove a non-working `use: { env }` config block.
  - `fixture-faker`: fix a copy-pasted allure import. `fixture-ghost-cursor`: fix the test-composition example (`mergeTests`). `decorators`: fix two dead links.
  - `reporter-otel` / `reporter-email`: point example references to the real `examples/otel-stack` and `examples/reporter-email` directories; fix `FullResult`-based callback docs and tuple destructuring in email template examples.
  - `reporter-prometheus-remote-write`: README metric table now matches the actual emitted metric names; the package barrel now also re-exports `Histogram` and `DEFAULT_BUCKETS` from `prometheus-core`, as documented.

## 1.1.2

### Patch Changes

- ec7f12f: Security: update versions

## 1.1.1

### Patch Changes

- d9262c5: Added paths into .npmignore for npm publishing

## 1.1.0

### Minor Changes

- 32bfd24: Feature: implement react & react-email support

  ## New shadcn templates

  Added 4 new email templates built with shadcn/ui components (email-safe, no Radix UI, no CSS variables):
  - **`PlaywrightReportShadcnChartEmail`** — includes a pass-rate stacked bar chart
  - **`PlaywrightReportShadcnButtonEmail`** — adds CTA buttons linking to the full report and failures
  - **`PlaywrightReportShadcnThemesEmail`** — supports 6 color themes: `slate`, `zinc`, `rose`, `blue`, `green`, `orange`
  - **`PlaywrightReportShadcnSelectEmail`** — renders a static status-filter Select UI; accepts `statusFilter` prop to show only tests matching the given statuses

  ## New shadcn UI components

  Email-safe re-implementations of shadcn/ui primitives (no browser APIs, compatible with `@react-email/render`):
  - `Badge` — with variants: `success`, `destructive`, `warning`, `secondary`, `default`, `outline`, `muted`
  - `Card`, `CardHeader`, `CardContent`, `CardFooter`
  - `Button` — rendered as `<a>` tag for email compatibility
  - `Separator`

  ## Subpath exports

  Each template is now available as an individual subpath export:

  ```ts
  import { PlaywrightReportShadcnEmail } from "@playwright-labs/reporter-email/templates/shadcn";
  import { PlaywrightReportShadcnChartEmail } from "@playwright-labs/reporter-email/templates/shadcn/base-chart";
  import { PlaywrightReportShadcnButtonEmail } from "@playwright-labs/reporter-email/templates/shadcn/base-button";
  import { PlaywrightReportShadcnThemesEmail } from "@playwright-labs/reporter-email/templates/shadcn/base-themes";
  ```

  Select UI components are also exported from the barrel:

  ```ts
  import {
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    SelectLabel,
    SelectSeparator,
  } from "@playwright-labs/reporter-email/templates/shadcn";
  ```

  ## Other changes
  - `tsconfig.json`: `moduleResolution` changed to `"bundler"` so TypeScript resolves `exports` subpaths correctly
  - `tsup.config.ts`: each template is built as a separate named entry (`.mjs` / `.cjs` / `.d.ts` / `.d.cts`)
  - `examples/`: added preview files for every template; added `README.md` with quick-start instructions

## 1.0.3

### Patch Changes

- 4d0253d: CI: add new scripts

## 1.0.2

### Patch Changes

- 851a8d8: [CI]: make tests do not failed by default
- 851a8d8: [CI]: self update pnpm.

## 1.0.1

### Patch Changes

- f352079: new release
