---
title: "Selectors Core"
description: "API reference for @playwright-labs/selectors-core."
---

Source files: [`packages/selectors-core/src/index.ts`](/workspace/home/playwright-labs/packages/selectors-core/src/index.ts), [`packages/selectors-core/src/parser.ts`](/workspace/home/playwright-labs/packages/selectors-core/src/parser.ts), [`packages/selectors-core/src/types.ts`](/workspace/home/playwright-labs/packages/selectors-core/src/types.ts).

## Imports

```ts
import {
  parseAttributeSelector,
  matchesAttributePart,
  type AttributeSelector,
  type AttributeSelectorPart,
  type AttributeSelectorOperator,
} from "@playwright-labs/selectors-core";
```

## Public API

```ts
export function parseAttributeSelector(
  selector: string,
  allowUnquotedStrings: boolean,
): AttributeSelector;

export function matchesAttributePart(
  value: any,
  attr: AttributeSelectorPart,
): boolean;
```

```ts
export type AttributeSelectorOperator =
  "=" | "*=" | "^=" | "$=" | "|=" | "~=";

export type AttributeSelectorPart = {
  name: string;
  jsonPath: string[];
  op: AttributeSelectorOperator | "<truthy>";
  value: unknown;
  caseSensitive: boolean;
};

export type AttributeSelector = {
  name: string;
  attributes: AttributeSelectorPart[];
};
```

`parseAttributeSelector()` is the shared grammar used by the selector engine packages. The parser supports dotted property paths, quoted strings, booleans, numbers, regex values, and the special truthy shorthand like `[disabled]`.

## Example

```ts
import { parseAttributeSelector } from "@playwright-labs/selectors-core";

const selector = parseAttributeSelector("Button[props.label='Submit']", true);
```
