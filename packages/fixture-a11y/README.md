# @playwright-labs/fixture-a11y

Accessibility testing fixture and `toBeAccessible` matcher for Playwright, powered by [axe-core](https://github.com/dequelabs/axe-core) via `@axe-core/playwright`.

The twist over plain `AxeBuilder`: `include` / `exclude` accept **locators**, not just selector strings — locators are realized into CSS selectors by [`@playwright-labs/locators-extra`](https://www.npmjs.com/package/@playwright-labs/locators-extra) right before the scan.

## Install

```bash
npm i -D @playwright-labs/fixture-a11y
```

## Usage

```ts
import { test, expect } from "@playwright-labs/fixture-a11y";

test("dashboard is accessible", async ({ page, a11y }) => {
  await page.goto("/dashboard");

  const results = await a11y
    .include(page.getByRole("main"))          // locator 👈
    .exclude(page.locator(".third-party-ad")) // locator 👈
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});
```

Or with the matcher:

```ts
test("form is accessible", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("form")).toBeAccessible({ tags: ["wcag2a"] });
});
```

## API

| Export | Purpose |
|---|---|
| `test` | Base test extended with the `a11y` and `useA11y` fixtures |
| `a11y` fixture | Fresh `A11yBuilder` for the default page — one scan per test |
| `useA11y(page?)` fixture | Factory: a fresh `A11yBuilder` per call, for several scans in one test or for extra pages |
| `expect` | `expect` extended with `toBeAccessible` |
| `A11yBuilder` | `AxeBuilder` subclass with locator-aware `include`/`exclude` — usable without the fixture |
| `ToBeAccessibleOptions` | `{ include?, exclude?, tags?, disableRules? }` |

### `A11yBuilder`

Everything `AxeBuilder` does ([docs](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)), plus:

- `include(locator)` / `exclude(locator)` — locators are queued and realized into CSS selectors when `analyze()` runs; a locator matching several elements includes/excludes each of them
- an `include` locator that matches nothing **throws** instead of silently widening the scan to the whole page; an `exclude` locator that matches nothing is a no-op

### `toBeAccessible`

```ts
await expect(page).toBeAccessible();
await expect(locator).toBeAccessible();            // scan is scoped to the locator
await expect(page).toBeAccessible({
  include: [page.getByRole("main"), "#sidebar"],   // locators and strings mix
  exclude: [page.locator(".legacy")],
  tags: ["wcag2a", "wcag2aa"],
  disableRules: ["color-contrast"],
});
```

The failure message lists every violation with rule id, impact, and the first offending targets.

> Tip: default `axe.run` also enables best-practice rules (`region`, `landmark-*`, …). Pin the scan to a standard with `tags: ["wcag2a", "wcag2aa"]` for deterministic CI results.

## License

MIT
