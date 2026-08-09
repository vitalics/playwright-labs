---
title: "Fixture OTel"
description: "API reference for @playwright-labs/fixture-otel."
---

Source files: [`packages/fixture-otel/src/index.ts`](/workspace/home/playwright-labs/packages/fixture-otel/src/index.ts), [`packages/fixture-otel/src/fixture.ts`](/workspace/home/playwright-labs/packages/fixture-otel/src/fixture.ts), [`packages/fixture-otel/src/matchers.ts`](/workspace/home/playwright-labs/packages/fixture-otel/src/matchers.ts), [`packages/fixture-otel/src/with-span.ts`](/workspace/home/playwright-labs/packages/fixture-otel/src/with-span.ts).

## Imports

```ts
import {
  test,
  expect,
  Counter,
  Histogram,
  UpDownCounter,
  Span,
  withSpan,
  TRACEPARENT_ANNOTATION,
  startWorkerSdk,
} from "@playwright-labs/fixture-otel";
```

## Fixture Interface

```ts
export interface Traceparent {
  traceId: string;
  spanId: string;
  traceparent: string;
}

export interface OtelFixture {
  useCounter: (name: string, options?: MetricOptions) => Counter;
  useHistogram: (name: string, options?: MetricOptions) => Histogram;
  useUpDownCounter: (name: string, options?: MetricOptions) => UpDownCounter;
  useSpan: (name: string) => Span;
  useTraceparent: () => Traceparent;
}
```

The implementation keeps arrays of created metrics and spans so teardown can flush or end them automatically after each test.

## Matchers

```ts
type OtelMatchers = {
  toBeOtelMetricCollected(received: BaseMetric): MatcherReturnType;
  toHaveOtelCallCount(received: BaseMetric, expected: number): MatcherReturnType;
  toHaveOtelMinCallCount(received: BaseMetric, min: number): MatcherReturnType;
  toBeOtelSpanEnded(received: Span): MatcherReturnType;
};
```

## `withSpan`

```ts
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => T | Promise<T>,
): Promise<T>;
```

`withSpan()` uses `AsyncLocalStorage` to preserve nested parent-child span relationships inside a worker. It always ends the span, and on error it marks the span with `status = "error"` before rethrowing.

## Example

```ts
import { test, expect, withSpan } from "@playwright-labs/fixture-otel";

test("records nested spans", async ({ useCounter }) => {
  const counter = useCounter("api_calls");

  await withSpan("api.fetch-user", async () => {
    counter.add(1);
  });

  expect(counter).toHaveOtelCallCount(1);
});
```
