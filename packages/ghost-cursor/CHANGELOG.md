# @playwright-labs/ghost-cursor

## 1.0.0

### Major Changes

- ef8425f: First release of `@playwright-labs/ghost-cursor` — human-like mouse cursor movements for Playwright.

  Generates realistic Bézier-curve paths with overshoot, jitter, and Fitts's-law–based timing using Playwright's native `page.mouse` API (no Puppeteer, no CDP required).

  ## Quick start

  ```bash
  npm install @playwright-labs/ghost-cursor
  ```

  ```typescript
  import { createCursor } from "@playwright-labs/ghost-cursor";

  const cursor = createCursor(page);

  await cursor.move("#submit"); // move with a natural path
  await cursor.click("#submit"); // move + click
  await cursor.scroll({ y: 300 }); // scroll
  ```

  Key API: `move`, `moveTo`, `moveBy`, `click`, `mouseDown`, `mouseUp`, `scroll`, `scrollTo`, `scrollIntoView`.
