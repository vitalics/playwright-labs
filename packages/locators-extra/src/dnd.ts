import type { Locator } from "playwright-core";

type CommonOptions = {
  /** Timeout for waiting on the source/target elements, ms. */
  timeout?: number;
  /** Aborts the drag; if it fires mid-drag the mouse button is still released. */
  signal?: AbortSignal;
  /**
   * Intermediate `mousemove` events between source and target (default 10).
   * Drag implementations that track movement need more than one.
   */
  steps?: number;
  /**
   * Point on the source element to grab, relative to its top-left corner.
   * Defaults to the center.
   */
  sourcePosition?: { x: number; y: number };
};

type DnDXYOptions = {
  /** Drop at absolute page coordinates by x */
  x: number;
  /** Drop at absolute page coordinates by y */
  y: number;
};

type DnDLOptions = {
  /** Drop on this locator (its center, or `targetPosition`). */
  to: Locator;
  /**
   * Point on the target element to drop at, relative to its top-left corner.
   * Defaults to the center.
   */
  targetPosition?: { x: number; y: number };
};

export type DnDOptions = CommonOptions & (DnDXYOptions | DnDLOptions);

/**
 * Drags an element to another locator or to absolute page coordinates using
 * real mouse events: `hover` on the source → `mousedown` → `mousemove` in
 * `steps` increments → `mouseup`.
 *
 * Unlike `locator.dragTo` it supports coordinate targets, an `AbortSignal`,
 * and configurable movement granularity. Works with `mousedown`/`mousemove`
 * -based drag implementations; for native HTML5 drag-and-drop (`dragstart`/
 * `drop` events) prefer `locator.dragTo`, which dispatches those natively.
 *
 * ```ts
 * await dnd(page.locator("#card"), { to: page.locator("#column-done") });
 * await dnd(page.locator("#slider-handle"), { x: 640, y: 400, steps: 25 });
 * ```
 */
export async function dnd(from: Locator, options: DnDOptions): Promise<void> {
  const { timeout, signal, steps = 10 } = options;
  signal?.throwIfAborted();

  const page = from.page();

  let target: { x: number; y: number };
  if ("to" in options) {
    await options.to.scrollIntoViewIfNeeded({ timeout });
    const box = await options.to.boundingBox({ timeout });
    if (!box) {
      throw new Error(
        `dnd: target locator is not visible: ${String(options.to)}`,
      );
    }
    target = options.targetPosition
      ? { x: box.x + options.targetPosition.x, y: box.y + options.targetPosition.y }
      : { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  } else {
    target = { x: options.x, y: options.y };
  }

  signal?.throwIfAborted();
  // hover auto-waits for the source and moves the mouse onto it
  await from.hover({ timeout, position: options.sourcePosition });

  await page.mouse.down();
  try {
    signal?.throwIfAborted();
    await page.mouse.move(target.x, target.y, { steps });
    signal?.throwIfAborted();
    // one extra move at the drop point: dnd libraries often ignore the first
    // event batch and only commit the position on a subsequent mousemove
    await page.mouse.move(target.x, target.y);
  } finally {
    // never leave the button pressed, even on abort/timeout mid-drag
    await page.mouse.up();
  }
}
