# Allure fixture

This is a base allure all-in-one fixture and helpers for playwright from Playwright labs team!

## Installation

1. Install playwright (optional)

```sh
npm i  @playwright/test
pnpm add @playwright/test
yarn add @playwright/test
```

2. Install [`allure-js-commons`](https://www.npmjs.com/package/allure-js-commons)

```sh
npm i allure-js-commons
pnpm add allure-js-commons
yarn add allure-js-commons
```

3. Install [`@playwright-labs/fixture-allure`](https://www.npmjs.com/package/@playwright-labs/fixture-allure)

```sh
npm i @playwright-labs/fixture-allure
pnpm add @playwright-labs/fixture-allure
yarn add @playwright-labs/fixture-allure
```

## Usage

### Basic Test Setup

```typescript
import { test, expect } from "@playwright-labs/fixture-allure";

test("my test", async ({ page, useAllure }) => {
  const allure = useAllure({
    id: 123456,
    description: "This is a test description",
    layer: "API",
    severity: "critical",
    owner: "John Doe",
    epic: "User Management",
    feature: "Login",
    story: "User can log in",
    suite: "Authentication",
    labels: {
      custom_label: "my_value",
    },
    tags: ["ui", "regression"],
    issues: [{ url: "https://example.com/issue1", name: "Issue 1" }],
    links: [{ url: "https://example.com/doc1", name: "documentation 1" }],
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

### Advanced Usage (fixture)

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

### Using Decorators

#### Function Decorator

**NOTE**: Function decorator will return `Promise`, even if your function is not `async`. This is made because of allure exposes `Promise` for steps and attachments.

```typescript
import { functionDecorator, PARAMETER } from "@playwright-labs/fixture-allure";

async function login(username: string, password: string) {
  console.log("Logging in...");
  // login logic
}

// Basic usage
const decoratedLogin = functionDecorator(login);
await decoratedLogin("user", "pass");

// With custom name
const customLogin = functionDecorator(login, { name: "Perform login action" });
await customLogin("user", "pass");

// With masked parameters
const secureLogin = functionDecorator(login, {
  name: "Secure login",
  args: [
    ["username", PARAMETER.DEFAULT],
    ["password", PARAMETER.MASKED], // password will be masked in report
  ],
});
await secureLogin("user", "secretPassword");
```

#### Method Decorator

**NOTE 1**: Method decorators using new typescript syntax. See [proposal decorators](https://github.com/tc39/proposal-decorators) for more details.

**NOTE 2**: Method decorators only available for `async` methods.

```typescript
import { methodDecorator, PARAMETER } from "@playwright-labs/fixture-allure";

class UserActions {
  @methodDecorator({
    name: "User login",
    args: [
      ["username", PARAMETER.DEFAULT], // username will be displayed in report
      ["password", PARAMETER.MASKED], // password will be masked in report
    ],
  })
  async login(username: string, password: string) {
    console.log("Login called with", username);
    // login logic
  }

  @methodDecorator()
  async logout() {
    console.log("Logout called");
    // logout logic
  }
}

const actions = new UserActions();
await actions.login("user", "password"); // password masked in Allure
await actions.logout();
```

### Playwright Configuration

This module provides a default configuration for Playwright that includes the `allure` reporter.

#### Using Default Configuration

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { DEFAULT_CONFIG } from "@playwright-labs/fixture-allure";

export default defineConfig({
  ...DEFAULT_CONFIG,
  testMatch: "**/*.spec.ts",
  use: {
    baseURL: "https://example.com",
  },
});
```

#### Using Reporter Description

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { REPORTER_DESCRIPTION } from "@playwright-labs/fixture-allure";

export default defineConfig({
  reporter: [
    ["json", { outputFile: "test-results.json" }],
    REPORTER_DESCRIPTION, // Includes default environment info
  ],
});
```

#### Custom Reporter Configuration

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import {
  makeReporterDescription,
  ENVIRONMENT_INFO,
} from "@playwright-labs/fixture-allure";

export default defineConfig({
  reporter: [
    ["html"],
    makeReporterDescription({
      outputFolder: "custom-allure-results",
      resultsDir: "custom-allure-results",
      detail: true,
      environmentInfo: {
        Environment: "staging",
        Browser: "chromium",
        Team: "QA Team",
        ...ENVIRONMENT_INFO, // includes `os_release`, `os_arch`, etc.
      },
    }),
  ],
});
```

## Features

### Fixture Options

The `useAllure` fixture accepts the following options:

- **id**: Test case ID (string or number)
- **layer**: Test layer (e.g., 'API', 'UI', 'E2E')
- **description**: Test description
- **epic**: Epic name
- **owner**: Test owner
- **feature**: Feature name
- **story**: User story
- **suite**: Test suite name
- **component**: Component name
- **severity**: Test severity ('trivial', 'minor', 'blocker', 'critical')
- **labels**: Custom labels (key-value pairs)
- **parameters**: Test parameters (array or object)
- **tags**: Test tags (array of strings)
- **issues**: Related issues (array of {name, url})
- **links**: Related links (array of {name, url})

### Decorator Options

Both `functionDecorator` and `methodDecorator` accept:

- **name**: Step name (default: function/method name)
- **parametrizeThis**: Include `this` as parameter (default: false)
- **parametrizeArguments**: Include arguments array as parameter (default: false)
- **args**: Array of [name, type] for custom parameter handling
- **attachResult**: Attach function result to report (default: true)
- **attachError**: Attach errors to report (default: true)
- **throwError**: Re-throw errors (default: true)

### Parameter Types

- **PARAMETER.DEFAULT**: Normal parameter visibility
- **PARAMETER.HIDDEN**: Hidden in report
- **PARAMETER.MASKED**: Shown as **\*** in report
