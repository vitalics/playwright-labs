---
title: "Selectors React"
description: "API reference for @playwright-labs/selectors-react."
---

Source files: [`packages/selectors-react/src/index.ts`](/workspace/home/playwright-labs/packages/selectors-react/src/index.ts), [`packages/selectors-react/src/engine.ts`](/workspace/home/playwright-labs/packages/selectors-react/src/engine.ts), [`packages/selectors-react/src/fixture.ts`](/workspace/home/playwright-labs/packages/selectors-react/src/fixture.ts), [`packages/selectors-react/src/matchers.ts`](/workspace/home/playwright-labs/packages/selectors-react/src/matchers.ts).

## Imports

```ts
import {
  ReactEngine,
  test,
  expect,
  ReactHtmlElement,
  type Fixture,
  type ReactMatchers,
} from "@playwright-labs/selectors-react";
```

## Fixture Surface

```ts
export type Fixture = {
  $r: (
    selector: string,
    options?: {
      has?: Locator;
      hasNot?: Locator;
      hasNotText?: string | RegExp;
      hasText?: string | RegExp;
    },
  ) => ReactHtmlElement;
};
```

The worker fixture auto-registers the `react=` selector engine once per worker using `selectors.register("react", ReactEngine)`.

## `ReactHtmlElement` Methods

```ts
class ReactHtmlElement extends Locator {
  nth(index: number): ReactHtmlElement;
  first(): ReactHtmlElement;
  last(): ReactHtmlElement;
  isComponent(): Promise<boolean>;
  componentName(): Promise<string | null>;
  props<T = Record<string, any>>(): Promise<T>;
  prop<T = unknown>(name: string): Promise<T>;
  state<T = any>(): Promise<T | null>;
  context<T = any>(): Promise<T | null>;
}
```

`state()` reads either class state or hook state from React fiber internals. In function components, hook state is returned as an indexed object like `{ "0": value }`.

## Matchers

```ts
type ReactMatchers = {
  toBeReactComponent(locator): Promise<MatcherReturnType>;
  toHaveReactProp(locator, name, value?): Promise<MatcherReturnType>;
  toBeReactProp(locator, name, value): Promise<MatcherReturnType>;
  toHaveReactState(locator, path, value?): Promise<MatcherReturnType>;
  toBeReactState(locator, path, value): Promise<MatcherReturnType>;
  toHaveReactContext(locator, key, value?): Promise<MatcherReturnType>;
  toMatchReactSnapshot(locator, snapshot): Promise<MatcherReturnType>;
};
```

## Example

```ts
import { test } from "@playwright-labs/selectors-react";

test("reads hook state", async ({ page, $r }) => {
  await page.goto("/");
  const state = await $r("react=Counter").first().state<{ "0": number }>();
  console.log(state?.["0"]);
});
```
