---
title: "Fixture Allure"
description: "API reference for @playwright-labs/fixture-allure, including the fixture surface, decorators, and Playwright config helpers."
---

Source files: [`packages/fixture-allure/src/index.ts`](/workspace/home/playwright-labs/packages/fixture-allure/src/index.ts), [`packages/fixture-allure/src/fixture.ts`](/workspace/home/playwright-labs/packages/fixture-allure/src/fixture.ts), [`packages/fixture-allure/src/decorators.ts`](/workspace/home/playwright-labs/packages/fixture-allure/src/decorators.ts), [`packages/fixture-allure/src/pw-config.ts`](/workspace/home/playwright-labs/packages/fixture-allure/src/pw-config.ts).

## Imports

```ts
import {
  test,
  expect,
  functionDecorator,
  methodDecorator,
  PARAMETER,
  decorators,
  DEFAULT_CONFIG,
  ENVIRONMENT_INFO,
  REPORTER_DESCRIPTION,
  makeReporterDescription,
} from "@playwright-labs/fixture-allure";
```

## Fixture Surface

```ts
export type AllureContext = {
  id?: string | number;
  layer?: string;
  description?: string;
  epic?: string;
  owner?: string;
  feature?: string;
  story?: string;
  suite?: string;
  component?: string;
  severity?: "trivial" | "minor" | "blocker" | "critical" | string;
  labels?: Record<string, string>;
  parameters?: AllureParameter[] | Record<string, string>;
  tags?: string[];
  issues?: readonly allure.Link[];
  links?: readonly allure.Link[];
};

export type Fixture = {
  useAllure: (context: AllureContext) => typeof allure;
  allure: typeof allure;
};
```

`useAllure()` maps the passed context object into Allure labels, parameters, issues, and links. The implementation iterates keys dynamically in `fixture.ts`, so the helper stays close to the upstream `allure-js-commons` API.

## Decorator Helpers

```ts
export const PARAMETER = {
  DEFAULT: "default",
  HIDDEN: "hidden",
  MASKED: "masked",
};

export function functionDecorator<T, A extends any[], This = void>(
  anotherFn: (this: This, ...args: A) => T,
  params?: DecoratorParameters,
  thisArg?: This,
): (this: This, ...args: A) => PromiseLike<Awaited<T>>;

export function methodDecorator<
  const R extends PromiseLike<any>,
  const T extends (...args: any[]) => R
>(params?: DecoratorParameters): (
  target: T,
  context: ClassMethodDecoratorContext<any, any>,
) => (...args: any[]) => R;
```

Both helpers wrap calls in `allure.step(...)`. The source attaches parameters, return values, and errors, then optionally rethrows failures.

## Playwright Config Helpers

```ts
export const ENVIRONMENT_INFO: Readonly<Record<string, string>>;
export const REPORTER_DESCRIPTION: ReporterDescription;
export const DEFAULT_CONFIG: PlaywrightTestConfig;

export function makeReporterDescription(options?: {
  detail?: boolean;
  outputFolder?: string;
  resultsDir?: string;
  environmentInfo?: Record<string, string>;
}): ReporterDescription;
```

| Option | Type | Default | Description |
|---|---|---|---|
| `detail` | `boolean` | `true` | Enables detailed allure-playwright output. |
| `outputFolder` | `string` | `"output/allure-results"` | Reporter output folder. |
| `resultsDir` | `string` | `"output/allure-results"` | Results directory passed to the reporter. |
| `environmentInfo` | `Record<string, string>` | `ENVIRONMENT_INFO` | Additional environment metadata. |

## Example

```ts
import { defineConfig } from "@playwright/test";
import { test, REPORTER_DESCRIPTION } from "@playwright-labs/fixture-allure";

test("annotates a run", async ({ useAllure }) => {
  const allure = useAllure({ feature: "checkout", severity: "critical" });
  await allure.step("submit order", async () => {});
});

export default defineConfig({
  reporter: [REPORTER_DESCRIPTION],
});
```
