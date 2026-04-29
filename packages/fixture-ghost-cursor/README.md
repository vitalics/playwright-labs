# @playwright-labs/fixture-ghost-cursor

Playwright/test fixture that integrates [`@playwright-labs/ghost-cursor`](../ghost-cursor) into your test suite via `test.extend`.

Provides two fixtures:

| Fixture | Description |
|---|---|
| `useGhostCursor(options?)` | Factory — creates a cursor with custom options |
| `ghostCursor` | Ready-to-use cursor with default options |

## Installation

```bash
npm install @playwright-labs/fixture-ghost-cursor @playwright-labs/ghost-cursor
# or
pnpm add @playwright-labs/fixture-ghost-cursor @playwright-labs/ghost-cursor
```

`@playwright/test` is a peer dependency.

## Usage

### Using the `ghostCursor` convenience fixture

```typescript
// tests/example.spec.ts
import { test, expect } from '@playwright-labs/fixture-ghost-cursor'

test('fill a form with human-like mouse movements', async ({ page, ghostCursor }) => {
  await page.goto('https://example.com/login')

  await ghostCursor.click('#username')
  await page.fill('#username', 'user@example.com')

  await ghostCursor.click('#password')
  await page.fill('#password', 'secret')

  await ghostCursor.click('#submit')

  await expect(page).toHaveURL('/dashboard')
})
```

### Using `useGhostCursor` for custom options

```typescript
import { test } from '@playwright-labs/fixture-ghost-cursor'

test('debug with visible cursor overlay', async ({ page, useGhostCursor }) => {
  const cursor = useGhostCursor({ visible: true, performRandomMoves: true })

  await page.goto('https://example.com')
  await cursor.click('nav a[href="/about"]')
  await cursor.scrollTo('bottom')
})
```

### Merging with other fixtures

```typescript
import { test as base } from '@playwright/test'
import { test as ghostTest } from '@playwright-labs/fixture-ghost-cursor'

export const test = base.extend(ghostTest.fixtures)
```

## Fixtures

### `useGhostCursor(options?): GhostCursor`

Returns a new `GhostCursor` instance bound to the current `page`. Call it once per test with the options you need.

```typescript
test('example', async ({ useGhostCursor }) => {
  const cursor = useGhostCursor({
    start: { x: 100, y: 100 },
    visible: false,
    defaultOptions: {
      move: { overshootThreshold: 300 },
      click: { hesitate: 100, waitForClick: 50 },
    },
  })
})
```

### `ghostCursor: GhostCursor`

A cursor created with default options — equivalent to `useGhostCursor()`. Use this when you don't need to customise anything.

## `CreateCursorOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `start` | `Vector` | `{ x: 0, y: 0 }` | Initial cursor position |
| `performRandomMoves` | `boolean` | `false` | Move to random positions when idle |
| `defaultOptions` | `DefaultOptions` | `{}` | Defaults for all cursor method calls |
| `visible` | `boolean` | `false` | Show a debug overlay following the cursor |

See [`@playwright-labs/ghost-cursor`](../ghost-cursor/README.md) for the full `GhostCursor` API.

## License

MIT
