# @playwright-labs/fixture-ghost-cursor

## 1.0.1

### Patch Changes

- fef3bff: Docs: fix README inaccuracies across packages.
  - SQL: the `pull` CLI is `@playwright-labs/sql-core`'s, not `fixture-sql`'s — all invocations corrected to `pnpm sql-core pull --adapter … --url … [--out …]` (with a note that pnpm only links bins of direct dependencies); `sql-core` README now documents the CLI; generated-file attribution fixed.
  - `fixture-abort`: fix wrong import package name; document the real fixture names `signal` and `useSignalWithTimeout` (was `abortSignal` / `useAbortSignalWithTimeout` — aligned README, JSDoc, and the validation error message).
  - `fixture-env`: add missing `createEnv` imports (subpath-only export), fix the zod example, remove a non-working `use: { env }` config block.
  - `fixture-faker`: fix a copy-pasted allure import. `fixture-ghost-cursor`: fix the test-composition example (`mergeTests`). `decorators`: fix two dead links.
  - `reporter-otel` / `reporter-email`: point example references to the real `examples/otel-stack` and `examples/reporter-email` directories; fix `FullResult`-based callback docs and tuple destructuring in email template examples.
  - `reporter-prometheus-remote-write`: README metric table now matches the actual emitted metric names; the package barrel now also re-exports `Histogram` and `DEFAULT_BUCKETS` from `prometheus-core`, as documented.

## 1.0.0

### Major Changes

- ef8425f: First release of `@playwright-labs/fixture-ghost-cursor` — Playwright/test fixture that integrates `@playwright-labs/ghost-cursor` via `test.extend`.

  Provides two fixtures: `ghostCursor` (ready-to-use with defaults) and `useGhostCursor(options?)` (factory for custom options).

  ## Quick start

  ```bash
  npm install @playwright-labs/fixture-ghost-cursor @playwright-labs/ghost-cursor
  ```

  ```typescript
  import { test, expect } from "@playwright-labs/fixture-ghost-cursor";

  test("fill a form with human-like mouse movements", async ({
    page,
    ghostCursor,
  }) => {
    await page.goto("https://example.com/login");

    await ghostCursor.click("#username");
    await page.fill("#username", "user@example.com");

    await ghostCursor.click("#submit");
  });
  ```

### Patch Changes

- Updated dependencies [ef8425f]
  - @playwright-labs/ghost-cursor@1.0.0
