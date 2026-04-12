# @playwright-labs/selectors-core

Shared parsing infrastructure for the `@playwright-labs/selectors-*` family.

Provides a framework-agnostic CSS-like **attribute selector parser** and a **value matcher** that are consumed by `selectors-angular` and `selectors-react`. Use this package directly when building your own Playwright selector engine on top of the same selector syntax.

## What's inside

| Export | Description |
|---|---|
| `parseAttributeSelector(selector, allowUnquotedStrings)` | Parses a selector string into a structured `AttributeSelector` object |
| `matchesAttributePart(value, attr)` | Tests whether a resolved value satisfies an `AttributeSelectorPart` constraint |
| `AttributeSelector` | Type: `{ name: string; attributes: AttributeSelectorPart[] }` |
| `AttributeSelectorPart` | Type: one attribute constraint with `name`, `jsonPath`, `op`, `value`, `caseSensitive` |
| `AttributeSelectorOperator` | Union of all supported operator literals |

## Installation

```bash
npm install -D @playwright-labs/selectors-core
# or
pnpm add -D @playwright-labs/selectors-core
```

No peer dependencies. No runtime dependencies.

## Selector syntax

```
ComponentName
ComponentName[path]
ComponentName[path operator value]
ComponentName[path operator value flag]
```

### Path

Dot-separated property access. Each segment is a CSS identifier or a quoted string.

```
label               → jsonPath: ["label"]
user.name           → jsonPath: ["user", "name"]
a.b.c.d             → jsonPath: ["a", "b", "c", "d"]
'first-name'.'last' → jsonPath: ["first-name", "last"]
```

### Operators

| Operator | Meaning | Value types |
|---|---|---|
| _(absent)_ | Truthy check | any |
| `=` | Strict equality or RegExp test | string, number, boolean, `null`, RegExp |
| `*=` | String contains | string only |
| `^=` | String starts with | string only |
| `$=` | String ends with | string only |
| `~=` | Word in space-separated list | string only |
| `\|=` | Exact match or hyphen-prefixed subtype | string only |

### Value literals

| Literal | Parsed as |
|---|---|
| `"text"` or `'text'` | `string` |
| `true` / `false` | `boolean` |
| `42`, `-5`, `3.14` | `number` |
| `/pattern/flags` | `RegExp` |
| unquoted non-boolean/non-number | `string` (only when `allowUnquotedStrings: true`) |

### Case sensitivity flag

Append `i` (or `I`) to opt out of case-sensitive matching; `s` (or `S`) to be explicit about case sensitivity. Only applicable to string values.

```
[label="submit" i]   // case-insensitive
[label="Submit" s]   // case-sensitive (default)
```

## API

### `parseAttributeSelector(selector, allowUnquotedStrings)`

Parses a selector string and returns a structured representation.

```typescript
import { parseAttributeSelector } from "@playwright-labs/selectors-core";

parseAttributeSelector('Button[label="Submit"][disabled]', false);
// {
//   name: "Button",
//   attributes: [
//     { name: "label",    jsonPath: ["label"],    op: "=",        value: "Submit", caseSensitive: true  },
//     { name: "disabled", jsonPath: ["disabled"], op: "<truthy>", value: null,     caseSensitive: false },
//   ]
// }
```

**Parameters**

| Name | Type | Description |
|---|---|---|
| `selector` | `string` | The selector string to parse |
| `allowUnquotedStrings` | `boolean` | When `true`, bare identifiers that are not numbers or booleans are treated as string values instead of throwing |

**Throws** `Error` on syntax errors, unterminated strings, invalid regex, unsupported operator/value combinations.

---

### `matchesAttributePart(value, attr)`

Tests whether a pre-resolved `value` satisfies the constraint described by `attr`.

```typescript
import { matchesAttributePart } from "@playwright-labs/selectors-core";

const attr = { name: "label", jsonPath: ["label"], op: "=", value: "Submit", caseSensitive: true };

matchesAttributePart("Submit", attr);  // true
matchesAttributePart("Cancel", attr);  // false
```

**Returns** `boolean`.

---

## Building a custom selector engine

Combine `parseAttributeSelector` and `matchesAttributePart` to implement a custom Playwright selector engine for any framework:

```typescript
import {
  parseAttributeSelector,
  matchesAttributePart,
  type AttributeSelectorPart,
} from "@playwright-labs/selectors-core";
import { selectors } from "@playwright/test";

const MyEngine = () => ({
  queryAll(scope: Element, selector: string): Element[] {
    const { name, attributes } = parseAttributeSelector(selector, false);

    return Array.from(scope.querySelectorAll("*")).filter((el) => {
      // 1. Match component name however makes sense for your framework
      const componentName = getComponentName(el);
      if (name && componentName !== name) return false;

      // 2. Resolve the component data
      const props = getComponentProps(el);

      // 3. Test each attribute constraint
      return attributes.every((attr: AttributeSelectorPart) => {
        // Walk jsonPath to resolve nested value
        let value: any = props;
        for (const key of attr.jsonPath) {
          if (value == null) return false;
          value = value[key];
        }
        return matchesAttributePart(value, attr);
      });
    });
  },
});

selectors.register("my-engine", MyEngine);
// Usage: page.locator('my-engine=MyComponent[props.active=true]')
```

## Notes

### `allowUnquotedStrings`

The flag controls whether bare non-keyword tokens are accepted as string values. Both `selectors-angular` and `selectors-react` pass `false`, which enforces quoting all string values. Pass `true` only if you want to support shorthand like `[status=active]` without quotes.

### Non-string operands and string operators

Operators other than `=` and `<truthy>` require **both** the actual value and the attribute value to be strings. If either side is a non-string (number, boolean, object), `matchesAttributePart` returns `false` rather than throwing. This mirrors CSS attribute selector semantics where these operators are only defined for string values.

### RegExp matching

Regular expressions can only be used with the `=` operator. `matchesAttributePart` calls `String.prototype.match` on the actual value, so it returns `false` for non-string values:

```typescript
matchesAttributePart("hello@example.com", { op: "=", value: /@/ ... }); // true
matchesAttributePart(42,                  { op: "=", value: /42/ ... }); // false
```
