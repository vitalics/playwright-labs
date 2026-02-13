# Playwright Labs

A collection of Playwright fixtures, utilities, and best practices for building reliable, maintainable test automation.

## Packages

| Package | Description | Install |
|---------|-------------|---------|
| [@playwright-labs/decorators](./packages/decorators) | OOP-style decorators for Playwright — `@describe`, `@test`, `@step`, `@param`, `@use.define`, `@beforeAll`, `@afterAll`, `@beforeEach`, `@afterEach`, and more | `npm i @playwright-labs/decorators` |
| [@playwright-labs/fixture-abort](./packages/fixture-abort) | `AbortController` & `AbortSignal` fixtures with custom matchers (`toBeAborted`, `toBeActive`, `toAbortWithin`, etc.) | `npm i @playwright-labs/fixture-abort` |
| [@playwright-labs/fixture-ajv-ts](./packages/fixture-ajv-ts) | Schema validation fixture using [ajv-ts](https://npmjs.com/package/ajv-ts) with `toMatchSchema` matcher | `npm i @playwright-labs/fixture-ajv-ts ajv-ts` |
| [@playwright-labs/fixture-allure](./packages/fixture-allure) | Allure reporting fixture (`useAllure`), function/method decorators for steps, parameter masking (`PARAMETER.MASKED`) | `npm i @playwright-labs/fixture-allure allure-js-commons` |
| [@playwright-labs/fixture-env](./packages/fixture-env) | Type-safe environment variable management with ajv-ts or zod schema validation | `npm i @playwright-labs/fixture-env` |
| [@playwright-labs/fixture-faker](./packages/fixture-faker) | Fake data generation fixture using [@faker-js/faker](https://npmjs.com/package/@faker-js/faker) with multi-locale support | `npm i @playwright-labs/fixture-faker @faker-js/faker` |
| [@playwright-labs/fixture-timers](./packages/fixture-timers) | Promise-based Node.js timer fixtures (`setTimeout`, `setInterval`, `setImmediate`, `scheduler`) with timing matchers | `npm i @playwright-labs/fixture-timers` |
| [@playwright-labs/reporter-email](./packages/reporter-email) | Email reporter for test run notifications via nodemailer (50+ email services supported) | `npm i @playwright-labs/reporter-email` |
| [@playwright-labs/playwright-best-practices](./packages/playwright-best-practices) | AI-optimized best practices guide — 10+ rules across 8 categories with real-world examples | `pnpx add-skill https://github.com/vitalics/playwright-labs/tree/main/packages/playwright-best-practices` |

## Quick Start

All fixture packages follow the same pattern — import `test` and `expect`, or merge with your existing fixtures:

```typescript
// Use directly
import { test, expect } from "@playwright-labs/fixture-timers";

// Or merge with other fixtures
import { mergeTests, mergeExpects } from "@playwright/test";
import { test as timersTest, expect as timersExpect } from "@playwright-labs/fixture-timers";
import { test as abortTest, expect as abortExpect } from "@playwright-labs/fixture-abort";

export const test = mergeTests(timersTest, abortTest);
export const expect = mergeExpects(timersExpect, abortExpect);
```

## License

MIT
