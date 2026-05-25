---
title: "Ghost Cursor"
description: "Reference for @playwright-labs/ghost-cursor and @playwright-labs/fixture-ghost-cursor."
---

Source files: [`packages/ghost-cursor/src/index.ts`](/workspace/home/playwright-labs/packages/ghost-cursor/src/index.ts), [`packages/ghost-cursor/src/cursor.ts`](/workspace/home/playwright-labs/packages/ghost-cursor/src/cursor.ts), [`packages/fixture-ghost-cursor/src/fixture.ts`](/workspace/home/playwright-labs/packages/fixture-ghost-cursor/src/fixture.ts).

## Core Import Paths

```ts
import {
  createCursor,
  getElementBox,
  getRandomPagePoint,
  installMouseHelper,
  path,
  GhostCursor,
} from "@playwright-labs/ghost-cursor";

import {
  test,
  expect,
  type Fixture,
  type GhostCursor as FixtureGhostCursor,
  type CreateCursorOptions,
} from "@playwright-labs/fixture-ghost-cursor";
```

## Top-Level Helpers

```ts
export const getRandomPagePoint: (page: Page) => Vector;
export const getElementBox: (_page: Page, element: ElementHandle) => Promise<BoundingBox>;
export function path(
  start: Vector,
  end: Vector | BoundingBox,
  options?: number | PathOptions,
): Vector[] | TimedVector[];
```

`createCursor(page, options?)` returns a `GhostCursor` instance bound to a Playwright page.

## `GhostCursor` Methods

Source: `packages/ghost-cursor/src/cursor.ts`

```ts
class GhostCursor {
  constructor(page: Page, options?: CreateCursorOptions);
  installMouseHelper(): Promise<void>;
  removeMouseHelper(): Promise<void>;
  mouseDown(options?: MouseButtonOptions): Promise<void>;
  mouseUp(options?: MouseButtonOptions): Promise<void>;
  toggleRandomMove(random: boolean): void;
  getLocation(): Vector;
  click(selectorOrElement: string | ElementHandle, options?: ClickOptions): Promise<void>;
  move(selectorOrElement: string | ElementHandle, options?: MoveOptions): Promise<void>;
  moveTo(destination: Vector, options?: MoveToOptions): Promise<void>;
  moveBy(delta: Partial<Vector>, options?: MoveToOptions): Promise<void>;
  scroll(delta: Partial<Vector>, options?: ScrollOptions): Promise<void>;
  scrollTo(destination: ScrollToDestination, options?: ScrollIntoViewOptions): Promise<void>;
  scrollIntoView(selectorOrElement: string | ElementHandle, options?: ScrollIntoViewOptions): Promise<void>;
  getElement(selectorOrElement: string | ElementHandle, options?: GetElementOptions): Promise<ElementHandle>;
}
```

## Fixture Wrapper

```ts
export type Fixture = {
  useGhostCursor(options?: CreateCursorOptions): GhostCursor;
  ghostCursor: GhostCursor;
};
```

The fixture package is intentionally thin: it exposes a ready-to-use cursor and a factory for custom options, both tied to the current Playwright `page`.

## Example

```ts
import { test } from "@playwright-labs/fixture-ghost-cursor";

test("clicks with a human-like path", async ({ ghostCursor }) => {
  await ghostCursor.click("#submit", { hesitate: 30 });
});
```
