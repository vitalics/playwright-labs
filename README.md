# Playwright Labs

A collection of Playwright skills and best practices for building reliable, maintainable test automation.

## 📦 Packages

### [@playwright-labs/playwright-best-practices](./packages/playwright-best-practices)

Comprehensive best practices guide for Playwright TypeScript, optimized for AI agents and developers.

**Installation:**

```bash
pnpx add-skill https://github.com/vitalics/playwright-labs/tree/main/packages/playwright-best-practices # pnpm
npx add-skill https://github.com/vitalics/playwright-labs/tree/main/packages/playwright-best-practices # npm
```

**Features:**

- 📚 10+ rules across 8 categories (stability, performance, locators, assertions, parallelization, fixtures, debugging, advanced)
- 🤖 AI-agent optimized with structured examples
- ✅ Automated validation and build system
- 📊 Impact-driven organization (CRITICAL to LOW)
- 💡 Real-world code examples (incorrect vs correct)

### [@playwright-tools/fixture-schema-ajv-ts](./packages/fixture-ajv-ts)

Playwright fixture for schema validation using [ajv-ts](https://npmjs.com/package/ajv-ts). Validate API responses and data structures in your tests with type-safe schemas.

**Installation:**

```bash
npm i @playwright/test ajv-ts @playwright-labs/fixture-ajv-ts # npm
pnpm i @playwright/test ajv-ts @playwright-labs/fixture-ajv-ts # pnpm
yarn add @playwright/test ajv-ts @playwright-labs/fixture-ajv-ts # yarn
```

**Features:**

- 🔍 Schema validation with `toMatchSchema` assertion
- 🛠️ Type-safe schema definitions using ajv-ts
- 🧩 Easy integration with Playwright fixtures
- ✨ Support for complex schema compositions

**Usage:**

1. Create or update your fixture file:

```typescript
// fixture.ts
import { mergeExpects, mergeTests } from "@playwright/test";
import {
  expect as ajvTsExpect,
  test as ajvTsTests,
} from "@playwright-labs/fixture-ajv-ts";

export const expect = mergeExpects(ajvTsExpect);
export const test = mergeTests(ajvTsTests);
```

2. Use schema validation in your tests:

```typescript
import { test, expect } from "./fixture";

test("validate API response", async ({ schema }) => {
  const mySchema = schema.string();
  expect("hello").toMatchSchema(mySchema); // OK
});
```

3. Or define schemas separately:

```typescript
// api-response.ts
import { s } from "ajv-ts";

export const someResponse = s.object({
  data: s.string().or(s.number()),
});

// test.spec.ts
import { someResponse } from "./api-response";
import { test, expect } from "./fixture";

test("validate API response", async () => {
  const resp = await fetch("https://example.com/data.json");
  expect(await resp.json()).toMatchSchema(someResponse);
});
```
