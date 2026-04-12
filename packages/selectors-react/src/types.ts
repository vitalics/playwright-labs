export type {
  AttributeSelectorOperator,
  AttributeSelector,
} from "@playwright-labs/selectors-core";
import type { AttributeSelectorPart as BasePart } from "@playwright-labs/selectors-core";

export type AttributeSource = "props" | "state" | "context";

/** Extends the base part with a `source` that routes the lookup to props, state, or context. */
export type AttributeSelectorPart = BasePart & {
  source: AttributeSource;
};
