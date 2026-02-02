# Faker fixture

This is a base @faker-js/faker all-in-one fixture and helpers for playwright from Playwright labs team!

## Installation

1. Install playwright (optional)

```sh
npm i  @playwright/test
pnpm add @playwright/test
yarn add @playwright/test
```

2. Install [`@playwright-labs/fixture-faker`](https://www.npmjs.com/package/@playwright-labs/fixture-faker)

```sh
npm i @playwright-labs/fixture-faker
pnpm add @playwright-labs/fixture-faker
yarn add @playwright-labs/fixture-faker
```

## Usage

### Basic Test Setup

```typescript
import { test, expect } from "@playwright-labs/fixture-faker";

test("my test", async ({ page, faker }) => {
  await page.goto("https://example.com");

  await page.fill("#username", faker.internet.email());
  await page.fill("#password", faker.internet.password());
  await page.click("#submit");
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

test("Login", async ({ page, faker }) => {
  await page.goto("https://example.com");

  await page.fill("#username", faker.internet.email());
  await page.fill("#password", faker.internet.password());
  await page.click("#submit");
});
```

### Using different locale

We exports `useFaker` function to configure faker with different options(e.g. `locale`)

```ts
import { test } from "@playwright-labs/fixture-faker";

test("simple test", async ({ page, useFaker }) => {
  const faker = await useFaker({ locale: "fr" });

  await page.fill("#username", faker.internet.email());
  await page.fill("#password", faker.internet.password());
  await page.click("#submit");
});
```
