import { test as baseTest, expect as baseExpect } from "@playwright/test";
import {
  createCursor,
  type CreateCursorOptions,
  type GhostCursor,
} from "@playwright-labs/ghost-cursor";

export type { GhostCursor, CreateCursorOptions };

export type Fixture = {
  /**
   * Factory that creates a `GhostCursor` bound to the current `page`.
   * Call it inside a test to get a cursor with custom options.
   *
   * @example
   * ```ts
   * test('custom cursor', async ({ useGhostCursor }) => {
   *   const cursor = useGhostCursor({ visible: true, performRandomMoves: false })
   *   await cursor.click('#submit')
   * })
   * ```
   */
  useGhostCursor(options?: CreateCursorOptions): GhostCursor;

  /**
   * A ready-to-use `GhostCursor` bound to the current `page` with default options.
   *
   * @example
   * ```ts
   * test('default cursor', async ({ ghostCursor }) => {
   *   await ghostCursor.click('#submit')
   * })
   * ```
   */
  ghostCursor: GhostCursor;
};

export const test = baseTest.extend<Fixture>({
  // biome-ignore lint/correctness/noEmptyPattern: playwright default behavior
  useGhostCursor: async ({ page }, use) => {
    await use((options?: CreateCursorOptions) => createCursor(page, options));
  },

  ghostCursor: async ({ useGhostCursor }, use) => {
    await use(useGhostCursor());
  },
});

export const expect = baseExpect.extend({});
