---
title: "Decorators"
description: "Reference for the class-based test decorators exported by @playwright-labs/decorators."
---

Source files: [`packages/decorators/src/index.ts`](/workspace/home/playwright-labs/packages/decorators/src/index.ts), [`packages/decorators/src/makeDecorators.ts`](/workspace/home/playwright-labs/packages/decorators/src/makeDecorators.ts), [`packages/decorators/src/decorator-describe.ts`](/workspace/home/playwright-labs/packages/decorators/src/decorator-describe.ts), [`packages/decorators/src/decorator-test.ts`](/workspace/home/playwright-labs/packages/decorators/src/decorator-test.ts).

## Import Paths

```ts
import {
  describe,
  test,
  step,
  param,
  beforeEach,
  beforeAll,
  afterEach,
  afterAll,
  before,
  after,
  tag,
  skip,
  fixme,
  slow,
  annotate,
  attachment,
  use,
  timeout,
  BaseTest,
  makeDecorators,
  expect,
  pwTest,
} from "@playwright-labs/decorators";
```

## Core Exports

```ts
export function makeDecorators<
  const T extends TestType<any, any>,
  const Opts extends Record<string, any> = ...
>(pwTest: T, fixturesToExtract?: (fixtures: Opts) => Partial<Opts>): {
  describe: ...;
  step: ...;
  BaseTest: ...;
  test: typeof test;
  param: typeof param;
  afterAll: typeof afterAll;
  afterEach: typeof afterEach;
  beforeAll: typeof beforeAll;
  beforeEach: typeof beforeEach;
  annotate: typeof annotate;
  attachment: typeof attachment;
  skip: typeof skip;
  fixme: typeof fixme;
  slow: typeof slow;
  tag: typeof tag;
  use: typeof use;
  before: typeof before;
  after: typeof after;
  timeout: typeof timeout;
};
```

`makeDecorators()` is the package’s real factory. The default top-level decorators are created by calling it with Playwright’s base `test` inside `packages/decorators/src/index.ts`.

## Important Runtime Behavior

- `describe()` registers the suite synchronously and walks decorator metadata to discover tests and lifecycle hooks.
- `test()` records metadata instead of registering the test immediately when used inside a decorated class.
- `test.each()` expands parameterized cases during suite registration, and the implementation explicitly rejects async data providers because Playwright requires synchronous test registration.
- `makeDescribe()` also applies class-level `@use()` metadata before methods are wired up.

## Constants

```ts
export const DEFAULT_FIXTURE_KEYS: readonly string[];
export const DEFAULT_PWSELF_KEYS: readonly string[];
```

These defaults come from `packages/decorators/src/decorator-describe.ts` and define which Playwright fixtures are injected into generated base classes and the `pwSelf` helper surface.

## Example

```ts
import { describe, test, beforeEach, afterEach } from "@playwright-labs/decorators";

@describe("Auth")
class AuthTests {
  @beforeEach()
  async openLogin() {
    await this.page.goto("/login");
  }

  @test("logs in")
  async login() {}

  @afterEach()
  async cleanup() {
    await this.context.clearCookies();
  }
}
```

Related pages: [Fixture Composition](/workspace/home/codedocs-template/content/docs/fixture-composition.mdx) and [Fixture Allure](/workspace/home/codedocs-template/content/docs/api-reference/fixture-allure.mdx).
