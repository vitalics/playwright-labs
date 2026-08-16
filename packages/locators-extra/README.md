# @playwright-labs/locators-extra

Extra utilities for Playwright locators: a runtime `Locator` type guard, *selector realization* — turning a locator into a concrete CSS selector, XPath, or tag name for the element(s) it matches — and a mouse-event `dnd` drag-and-drop helper.

Useful when a third-party API wants a plain selector string (axe-core, CDP calls, analytics scripts) but your test code speaks locators.

## Install

```bash
npm i -D @playwright-labs/locators-extra
```

## API

| Export | Purpose |
|---|---|
| `isLocator(value)` | Type guard `value is Locator`. Structural check — Playwright does not export the `Locator` class. Distinguishes `Locator` from `Page`, `Frame`, `FrameLocator`, `ElementHandle` |
| `selectorRealization(locator, kind?)` | Selector for **the** matched element. `kind`: `"css"` (default) \| `"xpath"` \| `"tag"`. Waits for the element; throws on strict-mode violation |
| `selectorRealizationAll(locator, kind?)` | Selector per **every** matched element. Does not wait; `[]` when nothing matches |
| `registerRealizer(kind, realizer)` | Registers a custom realizer — makes `selectorRealization(locator, kind)` understand your own selector engine |
| `dnd(from, options)` | Mouse-event drag and drop: to a locator (`{ to }`) or absolute coordinates (`{ x, y }`), with `steps`, `timeout`, `AbortSignal`, and source/target positions |
| `LocatorExtra` | Aggregate: `is`, `register`, `realization`, `realizationAll`, plus shortcuts `css`, `xpath`, `tag` |
| `SelectorKind` | `"css" \| "xpath" \| "tag"` or any registered custom kind |
| `Realizer` | `(el: Element) => string` — browser-side, must be self-contained (it is serialized into the page) |

Realization kinds:

- `"css"` — unique CSS path anchored at the nearest ancestor with an id: `#root > ul > li:nth-of-type(2)`
- `"xpath"` — absolute XPath: `/html/body/div/ul/li[2]`
- `"tag"` — lower-case tag name: `li`

## Usage

```ts
import { test, expect } from "@playwright/test";
import { LocatorExtra, isLocator, selectorRealization } from "@playwright-labs/locators-extra";

test("realize a locator", async ({ page }) => {
  await page.goto("/");

  const row = page.getByRole("listitem").filter({ hasText: "two" });

  await selectorRealization(row);          // "#root > ul > li:nth-of-type(2)"
  await selectorRealization(row, "xpath"); // "/html/body/div/ul/li[2]"
  await LocatorExtra.tag(row);             // "li"
});

function acceptsBoth(target: string | Locator) {
  if (isLocator(target)) {
    // target: Locator
  } else {
    // target: string
  }
}
```

## Drag and drop

```ts
import { dnd } from "@playwright-labs/locators-extra";

await dnd(page.locator("#card"), { to: page.locator("#column-done") });
await dnd(page.locator("#slider-handle"), { x: 640, y: 400, steps: 25 });
await dnd(page.locator("#card"), { to: zone, signal: AbortSignal.timeout(5_000) });
```

`dnd` drives real mouse events (`hover` → `mousedown` → `mousemove` × `steps` → `mouseup`), so it works with `mousemove`-tracking drag implementations and supports coordinate targets — the two cases `locator.dragTo` doesn't cover. For native HTML5 drag-and-drop (`dragstart`/`drop`), prefer `locator.dragTo`. The mouse button is always released, even on abort or timeout mid-drag.

## Custom realizers

Built-in kinds cover CSS, XPath, and tag. For custom selector engines — e.g. the react/vue/angular engines from [`@playwright-labs/selectors-react`](https://www.npmjs.com/package/@playwright-labs/selectors-react) and friends, or your own `data-testid` convention — register a realizer:

```ts
import { registerRealizer, selectorRealization } from "@playwright-labs/locators-extra";

registerRealizer("testid", (el) => {
  const id = el.getAttribute("data-testid");
  if (!id) throw new Error("element has no data-testid");
  return `[data-testid="${id}"]`;
});

await selectorRealization(page.getByRole("button"), "testid"); // '[data-testid="submit"]'
```

The realizer runs **in the browser** and is serialized into the page: it must be self-contained (no closures over imports or module scope). Custom realizers are revived via indirect `eval`, so pages with a strict CSP (no `unsafe-eval`) reject them — built-in kinds are not affected.

> The realized selector describes the element **at the moment of the call**. If the DOM re-renders (elements are inserted, reordered, or ids change), realize again — the string does not track the element.

## License

MIT
