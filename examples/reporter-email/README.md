# reporter-email — examples

Preview files for all available email templates.

## Quick start

From the monorepo root, build the package first (needed for imports to resolve):

```bash
pnpm --filter @playwright-labs/reporter-email build
```

Then start the preview server from this directory:

```bash
cd packages/reporter-email/examples
pnpm email:preview
```

Or from the monorepo root:

```bash
pnpm --filter reporter-email-example email:preview
```

The dev server opens at **http://localhost:3000** and hot-reloads on file changes.

## Available previews

| File | Template | Description |
|------|----------|-------------|
| `playwright-report.tsx` | `PlaywrightReportEmail` | Base template — plain HTML, no Tailwind |
| `playwright-report-tailwind.tsx` | `PlaywrightReportTailwindEmail` | Base template with Tailwind CSS |
| `playwright-report-shadcn.tsx` | `PlaywrightReportShadcnEmail` | shadcn/ui components |
| `shadcn-base-chart.tsx` | `PlaywrightReportShadcnChartEmail` | shadcn + pass-rate bar chart |
| `shadcn-base-button.tsx` | `PlaywrightReportShadcnButtonEmail` | shadcn + CTA buttons (report link, failures link) |
| `shadcn-base-themes.tsx` | `PlaywrightReportShadcnThemesEmail` | shadcn + color themes (slate / zinc / rose / blue / green / orange) |

## Customising a preview

Open any file in `emails/` and edit the constants at the top:

```ts
// shadcn-base-themes.tsx
const PREVIEW_THEME: ShadcnTheme = "blue"; // change theme

// shadcn-base-select.tsx
const STATUS_FILTER: TestStatus[] = ["failed", "timedOut"]; // change filter

// shadcn-base-button.tsx
const REPORT_URL = "https://ci.example.com/report/123"; // add your URL
```

The dev server picks up changes instantly — no rebuild required.

## Running tests

```bash
pnpm test
```

Playwright tests are in the `tests/` directory and render each template with `@react-email/render`, asserting on the generated HTML.
