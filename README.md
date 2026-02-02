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

### [@playwright-tools/fixture-ajv-ts](./packages/fixture-ajv-ts)

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

### [@playwright-labs/fixture-allure](./packages/fixture-allure)

All-in-one Allure fixture and helpers for Playwright with enhanced reporting capabilities.

**Installation:**

```bash
npm i @playwright-labs/fixture-allure allure-js-commons # npm
pnpm add @playwright-labs/fixture-allure allure-js-commons # pnpm
yarn add @playwright-labs/fixture-allure allure-js-commons # yarn
```

**Features:**

- 📊 Rich test metadata with `useAllure` fixture
- 🎨 Function and method decorators for automatic step reporting
- 🔒 Parameter masking for sensitive data (passwords, tokens)
- 🔧 Pre-configured Playwright reporter with environment info
- 📎 Support for attachments, steps, and custom labels

**Usage:**

Usage as fixture

```ts
// filename: custom-fixture.ts
import { mergeExpects, mergeTests } from "@playwright/test";
import {
  expect as allureExpect,
  test as allureTests,
} from "@playwright-labs/fixture-allure";

export const expect = mergeExpects(allureExpect);
export const test = mergeTests(allureTests);
```

And now you are ready to use the custom fixture in your tests.

```ts
import { expect, test } from "./custom-fixture";

test("Login", async ({ page, useAllure }) => {
  const allure = useAllure({
    id: 123456,
    description: "Login test",
    issues: [{ url: "https://example.com/issue1", name: "Issue 1" }],
    links: [{ url: "https://example.com/doc1", name: "documentation 1" }],
    // rest parameters
  });
  await page.goto("https://example.com");

  await allure.step("Login step", async () => {
    await page.fill("#username", "user");
    await page.fill("#password", "pass");
    await page.click("#submit");
  });

  await allure.attachment("screenshot", await page.screenshot(), "image/png");
});
```

2. Using decorators for automatic reporting:

```typescript
import { functionDecorator, PARAMETER } from "@playwright-labs/fixture-allure";

async function login(username: string, password: string) {
  // login logic
}

const secureLogin = functionDecorator(login, {
  name: "User login",
  args: [
    ["username", PARAMETER.DEFAULT],
    ["password", PARAMETER.MASKED], // masked in report
  ],
});

await secureLogin("user", "secretPassword");
```

3. Configure Playwright with Allure reporter:

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { REPORTER_DESCRIPTION } from "@playwright-labs/fixture-allure";

export default defineConfig({
  reporter: [["html"], REPORTER_DESCRIPTION],
});
```

### [@playwright-labs/fixture-faker](./packages/fixture-faker)

Playwright fixture for generating fake data using [@faker-js/faker](https://npmjs.com/package/@faker-js/faker). Generate realistic test data directly in your Playwright tests.

**Installation:**

```bash
npm i @playwright-labs/fixture-faker @faker-js/faker # npm
pnpm add @playwright-labs/fixture-faker @faker-js/faker # pnpm
yarn add @playwright-labs/fixture-faker @faker-js/faker # yarn
```

**Features:**

- 🎲 Seamless integration with @faker-js/faker
- 🌍 Multi-locale support via `useFaker` function
- 🧩 Easy integration with Playwright fixtures
- ✨ Generate realistic emails, passwords, names, and more

**Usage:**

1. Basic test setup:

```typescript
import { test, expect } from "@playwright-labs/fixture-faker";

test("my test", async ({ page, faker }) => {
  await page.goto("https://example.com");

  await page.fill("#username", faker.internet.email());
  await page.fill("#password", faker.internet.password());
  await page.click("#submit");
});
```

2. Using different locale:

```typescript
import { test } from "@playwright-labs/fixture-faker";

test("simple test", async ({ page, useFaker }) => {
  const faker = await useFaker({ locale: "fr" });

  await page.fill("#username", faker.internet.email());
  await page.fill("#password", faker.internet.password());
  await page.click("#submit");
});
```

### [@playwright-labs/reporter-email](./packages/reporter-email)

Playwright reporter that sends email notifications after test runs using nodemailer.

**Installation:**

```bash
npm i @playwright-labs/reporter-email # npm
pnpm add @playwright-labs/reporter-email # pnpm
yarn add @playwright-labs/reporter-email # yarn
```

**Features:**

- 📧 Send email reports after test runs
- 🎯 Configurable send conditions (always, on-failure, on-success, never)
- 📝 Dynamic subject and HTML body based on test results
- 📎 Support for file attachments
- 🔧 Built-in support for 50+ email services (Gmail, Outlook, AWS SES, etc.)

**Usage:**

1. Basic configuration:

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { type ReporterOptions } from "@playwright-labs/reporter-email";

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-email",
      {
        from: "your-email@example.com",
        to: "recipient-email@example.com",
        subject: "Playwright Test Report",
        html: "<p>Test report</p>",
      } satisfies ReporterOptions,
    ],
  ],
});
```

2. Dynamic content based on results:

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { type ReporterOptions } from "@playwright-labs/reporter-email";

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-email",
      {
        send: "always",
        from: "your-email@example.com",
        to: "recipient-email@example.com",
        subject: (result) =>
          `Playwright Test Report - ${result.status === "success" ? "Success" : "Failure"}`,
        html: (result, testCases) =>
          `<p>Total tests: ${testCases.length}</p>`,
      } satisfies ReporterOptions,
    ],
  ],
});
```
