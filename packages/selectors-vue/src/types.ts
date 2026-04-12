import type { AttributeSelectorPart as BasePart } from "@playwright-labs/selectors-core";

/**
 * Data source for a Vue component attribute selector:
 * - `"props"` — component props (default when no prefix is given)
 * - `"data"` — Options API reactive data returned by `data()`
 * - `"setup"` — Composition API state returned by `setup()` / `<script setup>`
 */
export type AttributeSource = "props" | "data" | "setup";

/** Extends the core attribute selector part with a resolved Vue data source. */
export type AttributeSelectorPart = BasePart & {
  source: AttributeSource;
};
