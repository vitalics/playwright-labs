# @playwright-labs/fixture-ghost-cursor

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
