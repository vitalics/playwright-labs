# @playwright-labs/reporter-email

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
