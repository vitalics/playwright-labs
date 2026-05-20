---
title: "Utility Fixtures"
description: "Reference for the smaller utility packages: fixture-abort, fixture-ajv-ts, fixture-faker, and fixture-timers."
---

This page groups the smallest fixture packages whose public surfaces are intentionally narrow.

## `@playwright-labs/fixture-abort`

Source: [`packages/fixture-abort/src/abort.ts`](/workspace/home/playwright-labs/packages/fixture-abort/src/abort.ts)

```ts
import { test, expect, type Fixture } from "@playwright-labs/fixture-abort";
```

```ts
export type Fixture = {
  abortController: AbortController;
  useAbortController: (options?: {
    abortTest?: boolean;
    onAbort?: (this: AbortSignal, ev?: Event) => void | PromiseLike<void>;
  }) => AbortController;
  signal: AbortSignal;
  useSignalWithTimeout: (
    timeout: number,
    options?: { abortTest?: boolean },
  ) => AbortSignal;
};
```

The extended `expect` adds abort-state matchers such as `toBeAborted()`, `toBeActive()`, `toHaveAbortedSignal()`, and `toAbortWithin()`.

## `@playwright-labs/fixture-ajv-ts`

Source: [`packages/fixture-ajv-ts/src/fixture.ts`](/workspace/home/playwright-labs/packages/fixture-ajv-ts/src/fixture.ts)

```ts
import { test, expect, type AjvTsTestFixture } from "@playwright-labs/fixture-ajv-ts";
```

```ts
export type AjvTsTestFixture = {
  schema: typeof s;
};
```

The package extends `expect` with:

```ts
toMatchSchema(data: unknown, schema: AnySchemaBuilder, options?: { message?: string })
```

## `@playwright-labs/fixture-faker`

Source: [`packages/fixture-faker/src/fixture.ts`](/workspace/home/playwright-labs/packages/fixture-faker/src/fixture.ts)

```ts
import { test, expect, type Fixture } from "@playwright-labs/fixture-faker";
```

```ts
export type Fixture = {
  useFaker(options?: {
    locale?: keyof typeof allLocales;
    randomizer?: Randomizer;
    seed?: number;
  }): Faker & Disposable;
  faker: Faker & Disposable;
};
```

## `@playwright-labs/fixture-timers`

Source: [`packages/fixture-timers/src/timers.ts`](/workspace/home/playwright-labs/packages/fixture-timers/src/timers.ts)

```ts
import { test, expect, type Fixture } from "@playwright-labs/fixture-timers";
```

```ts
export type Fixture = {
  setTimeout: <T = void>(delay?: number, value?: T, options?: TimerOptions) => Promise<T>;
  setInterval: <T = void>(delay?: number, value?: T, options?: TimerOptions) => NodeJS.AsyncIterator<T>;
  setImmediate: <T = void>(value?: T, options?: TimerOptions) => Promise<T>;
  scheduler: typeof scheduler;
};
```

The matcher surface includes `toResolveWithin()`, `toTakeAtLeast()`, `toResolveWith()`, `toYield()`, and additional async-iterator timing assertions defined in `timers.ts`.

## Example

```ts
import { test, expect } from "@playwright-labs/fixture-abort";

test("times out a fetch", async ({ useSignalWithTimeout }) => {
  const signal = useSignalWithTimeout(50);
  expect(signal).toBeActive();
});
```
