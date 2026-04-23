# @playwright-labs/ghost-cursor

Human-like mouse cursor movements for [Playwright](https://playwright.dev/)

Generates realistic Bézier-curve paths with overshoot, jitter, and Fitts's-law–based timing — all driven by Playwright's native `page.mouse` API (no Puppeteer, no CDP required).

## Installation

```bash
npm install @playwright-labs/ghost-cursor
# or
pnpm add @playwright-labs/ghost-cursor
```

`@playwright/test` is a peer dependency — install it separately if you haven't already.

## Quick start

```typescript
import { chromium } from '@playwright/test'
import { createCursor } from '@playwright-labs/ghost-cursor'

const browser = await chromium.launch({ headless: false })
const page = await browser.newPage()
await page.goto('https://example.com')

const cursor = createCursor(page)

// Move to an element with a natural path
await cursor.move('#submit')

// Click (moves there first, then clicks)
await cursor.click('#submit')

// Move to absolute coordinates
await cursor.moveTo({ x: 400, y: 300 })

// Move relative to current position
await cursor.moveBy({ x: 50, y: -20 })

// Scroll
await cursor.scroll({ y: 300 })
await cursor.scrollTo('bottom')
await cursor.scrollIntoView('#footer')
```

## `createCursor(page, options?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `start` | `Vector` | `{ x: 0, y: 0 }` | Initial cursor position |
| `performRandomMoves` | `boolean` | `false` | Continuously move to random positions when idle |
| `defaultOptions` | `DefaultOptions` | `{}` | Defaults applied to all method calls |
| `visible` | `boolean` | `false` | Show a debug overlay following the cursor |

## `GhostCursor` API

### Movement

| Method | Description |
|---|---|
| `move(selector, options?)` | Move to a CSS/XPath selector or `ElementHandle` |
| `moveTo(destination, options?)` | Move to absolute `{ x, y }` coordinates |
| `moveBy(delta, options?)` | Move relative to the current position |
| `path(start, end, options?)` | Generate a path (static utility) |
| `getLocation()` | Return the current `{ x, y }` position |

### Clicking

| Method | Description |
|---|---|
| `click(selector?, options?)` | Move + realistic click |
| `mouseDown(options?)` | Press a mouse button |
| `mouseUp(options?)` | Release a mouse button |

### Scrolling

| Method | Description |
|---|---|
| `scroll(delta, options?)` | Scroll by pixel delta |
| `scrollTo(destination, options?)` | Scroll to `'top'`, `'bottom'`, `'left'`, `'right'` or `{ x, y }` |
| `scrollIntoView(selector, options?)` | Scroll element into the viewport |

### Misc

| Method | Description |
|---|---|
| `toggleRandomMove(enabled)` | Enable/disable background random movements |
| `installMouseHelper()` | Inject a visual cursor overlay (debug) |
| `removeMouseHelper()` | Remove the overlay |
| `getElement(selector, options?)` | Resolve selector → `ElementHandle` |

## Options

### `MoveOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `moveDelay` | `number` | `0` | Milliseconds to wait after moving |
| `randomizeMoveDelay` | `boolean` | `true` | Randomise the delay |
| `maxTries` | `number` | `10` | Retry limit when element intersection fails |
| `overshootThreshold` | `number` | `500` | Distance (px) above which overshoot is applied |
| `paddingPercentage` | `number` | — | Keep click within this % from the edge |
| `moveSpeed` | `number` | — | Movement speed multiplier |
| `spreadOverride` | `number` | — | Override Bézier curve spread |
| `useTimestamps` | `boolean` | `false` | Add realistic inter-frame delays |
| `waitForSelector` | `number` | — | Timeout (ms) for `waitForSelector` |

### `ClickOptions`

Extends `MoveOptions` with:

| Option | Type | Default | Description |
|---|---|---|---|
| `hesitate` | `number` | `0` | Delay between arriving and pressing |
| `waitForClick` | `number` | `0` | Delay between mousedown and mouseup |
| `button` | `'left'\|'right'\|'middle'` | `'left'` | Mouse button |
| `clickCount` | `number` | `1` | Number of clicks |

### `ScrollOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `scrollSpeed` | `number` | `100` | 1–100; lower = more steps |
| `scrollDelay` | `number` | `200` | Milliseconds to wait after scrolling |

## Math utilities

The package also exports all vector / Bézier math functions for advanced use:

```typescript
import { bezierCurve, path, overshoot, type Vector } from '@playwright-labs/ghost-cursor'
```

## License

MIT
