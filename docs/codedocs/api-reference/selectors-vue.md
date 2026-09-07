---
title: "Selectors Vue"
description: "API reference for @playwright-labs/selectors-vue."
---

Source files: [`packages/selectors-vue/src/index.ts`](/workspace/home/playwright-labs/packages/selectors-vue/src/index.ts), [`packages/selectors-vue/src/engine.ts`](/workspace/home/playwright-labs/packages/selectors-vue/src/engine.ts), [`packages/selectors-vue/src/fixture.ts`](/workspace/home/playwright-labs/packages/selectors-vue/src/fixture.ts), [`packages/selectors-vue/src/matchers.ts`](/workspace/home/playwright-labs/packages/selectors-vue/src/matchers.ts).

## Imports

```ts
import {
  VueEngine,
  test,
  expect,
  VueHtmlElement,
  type Fixture,
  type VueMatchers,
  type AttributeSource,
  type AttributeSelectorPart,
} from "@playwright-labs/selectors-vue";
```

## Fixture Surface

```ts
export type Fixture = {
  $v: (
    selector: string,
    options?: {
      has?: Locator;
      hasNot?: Locator;
      hasNotText?: string | RegExp;
      hasText?: string | RegExp;
    },
  ) => VueHtmlElement;
};
```

## `VueHtmlElement` Methods

```ts
class VueHtmlElement extends Locator {
  nth(index: number): VueHtmlElement;
  first(): VueHtmlElement;
  last(): VueHtmlElement;
  componentName(): Promise<string | null>;
  props<T = Record<string, any>>(): Promise<T>;
  prop<T = unknown>(name: string): Promise<T>;
  setup<T = Record<string, any>>(): Promise<T | null>;
  data<T = Record<string, any>>(): Promise<T | null>;
}
```

`setup()` unwraps refs automatically, while `data()` reads Options API state.

## Matchers

```ts
type VueMatchers = {
  toBeVueComponent(locator): Promise<MatcherReturnType>;
  toHaveVueProp(locator, name, value?): Promise<MatcherReturnType>;
  toBeVueProp(locator, name, value): Promise<MatcherReturnType>;
  toHaveVueSetup(locator, path, value?): Promise<MatcherReturnType>;
  toBeVueSetup(locator, path, value): Promise<MatcherReturnType>;
  toHaveVueData(locator, path, value?): Promise<MatcherReturnType>;
  toBeVueData(locator, path, value): Promise<MatcherReturnType>;
  toMatchVueSnapshot(locator, snapshot): Promise<MatcherReturnType>;
};
```
