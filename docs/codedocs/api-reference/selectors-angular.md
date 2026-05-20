---
title: "Selectors Angular"
description: "API reference for @playwright-labs/selectors-angular."
---

Source files: [`packages/selectors-angular/src/index.ts`](/workspace/home/playwright-labs/packages/selectors-angular/src/index.ts), [`packages/selectors-angular/src/engine.ts`](/workspace/home/playwright-labs/packages/selectors-angular/src/engine.ts), [`packages/selectors-angular/src/fixture.ts`](/workspace/home/playwright-labs/packages/selectors-angular/src/fixture.ts), [`packages/selectors-angular/src/matchers.ts`](/workspace/home/playwright-labs/packages/selectors-angular/src/matchers.ts).

## Imports

```ts
import {
  AngularEngine,
  test,
  expect,
  NgHtmlElement,
  type Fixture,
  type AngularMatchers,
} from "@playwright-labs/selectors-angular";
```

## Public API

```ts
export const AngularEngine: () => {
  queryAll(scope: Element | ShadowRoot | Document, selector: string): Element[];
};

export type Fixture = {
  $ng: (
    selector: string,
    options?: {
      has?: Locator;
      hasNot?: Locator;
      hasNotText?: string | RegExp;
      hasText?: string | RegExp;
    },
  ) => NgHtmlElement;
};
```

## `NgHtmlElement` Methods

```ts
class NgHtmlElement extends Locator {
  nth(index: number): NgHtmlElement;
  first(): NgHtmlElement;
  last(): NgHtmlElement;
  isComponent(): Promise<boolean>;
  directives(): Promise<string[]>;
  inputs(): Promise<string[]>;
  input<T = unknown>(name: string): Promise<T>;
  outputs(): Promise<string[]>;
  signals(): Promise<string[]>;
  signal<T = unknown>(name: string): Promise<T>;
  detectChanges(): Promise<void>;
}
```

The class wraps a Playwright `Locator` with a `Proxy`, so regular locator methods still work.

## Matchers

```ts
type AngularMatchers = {
  toBeNgComponent(locator): Promise<MatcherReturnType>;
  toHaveNgInput(locator, name): Promise<MatcherReturnType>;
  toHaveNgOutput(locator, name): Promise<MatcherReturnType>;
  toBeNgInput(locator, name, expectedValue): Promise<MatcherReturnType>;
  toBeNgOutput(locator, name, expectedValue): Promise<MatcherReturnType>;
  toHaveNgSignal(locator, name): Promise<MatcherReturnType>;
  toBeNgSignal(locator, name, expectedValue): Promise<MatcherReturnType>;
  toBeNgRouterOutlet(locator): Promise<MatcherReturnType>;
  toBeNgIf(locator, condition): Promise<MatcherReturnType>;
  toBeNgFor(locator): Promise<MatcherReturnType>;
  toMatchNgSnapshot(locator, snapshot): Promise<MatcherReturnType>;
};
```

The implementation depends on `window.ng`, so it is meant for Angular development-mode builds.
