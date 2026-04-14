import {
  expect as baseExpect,
  type ExpectMatcherState,
  type MatcherReturnType,
} from "@playwright/test";
import type { BaseMetric } from "@playwright-labs/otel-core";
import type { Span } from "@playwright-labs/otel-core";

/**
 * Custom OTel matchers for Playwright's `expect`.
 *
 * Available after importing `expect` from `@playwright-labs/fixture-otel`.
 *
 * @example
 * ```ts
 * import { test, expect } from '@playwright-labs/fixture-otel';
 *
 * test('example', async ({ useCounter, useSpan }) => {
 *   const counter = useCounter('my_metric');
 *   counter.add(1);
 *   counter.add(3);
 *
 *   const span = useSpan('my_operation');
 *   span.end();
 *
 *   expect(counter).toBeOtelMetricCollected();
 *   expect(counter).toHaveOtelCallCount(2);
 *   expect(counter).toHaveOtelMinCallCount(1);
 *   expect(span).toBeOtelSpanEnded();
 * });
 * ```
 */
export type OtelMatchers = {
  /**
   * Asserts that the metric was recorded at least once.
   *
   * @example
   * ```ts
   * const counter = useCounter('http_requests');
   * counter.add(1);
   * expect(counter).toBeOtelMetricCollected();
   * expect(histogram).not.toBeOtelMetricCollected(); // was never recorded
   * ```
   */
  toBeOtelMetricCollected(
    this: ExpectMatcherState,
    received: BaseMetric,
  ): MatcherReturnType;

  /**
   * Asserts the exact number of times a metric was recorded.
   *
   * @param expected - Expected call count.
   *
   * @example
   * ```ts
   * counter.add(1);
   * counter.add(1);
   * expect(counter).toHaveOtelCallCount(2);
   * ```
   */
  toHaveOtelCallCount(
    this: ExpectMatcherState,
    received: BaseMetric,
    expected: number,
  ): MatcherReturnType;

  /**
   * Asserts that the metric was recorded at least `min` times.
   *
   * @param min - Minimum acceptable call count.
   *
   * @example
   * ```ts
   * counter.add(1);
   * counter.add(1);
   * counter.add(1);
   * expect(counter).toHaveOtelMinCallCount(2);    // passes (3 >= 2)
   * expect(counter).not.toHaveOtelMinCallCount(5); // passes (3 < 5)
   * ```
   */
  toHaveOtelMinCallCount(
    this: ExpectMatcherState,
    received: BaseMetric,
    min: number,
  ): MatcherReturnType;

  /**
   * Asserts that a span created via `useSpan` has been ended via `span.end()`
   * or by leaving a `using` block.
   *
   * @example
   * ```ts
   * const span = useSpan('checkout');
   * span.end();
   * expect(span).toBeOtelSpanEnded();
   * ```
   */
  toBeOtelSpanEnded(
    this: ExpectMatcherState,
    received: Span,
  ): MatcherReturnType;
};

export const expect = baseExpect.extend<OtelMatchers>({
  toBeOtelMetricCollected(
    this: ExpectMatcherState,
    received: BaseMetric,
  ): MatcherReturnType {
    const { callCount, name } = received;
    const pass = callCount > 0;
    return {
      pass,
      message: () =>
        pass
          ? `Expected metric "${name}" NOT to have been recorded, but it was recorded ${callCount} time(s)`
          : `Expected metric "${name}" to have been recorded at least once, but callCount is 0`,
    };
  },

  toHaveOtelCallCount(
    this: ExpectMatcherState,
    received: BaseMetric,
    expected: number,
  ): MatcherReturnType {
    const { callCount, name } = received;
    const pass = callCount === expected;
    return {
      pass,
      message: () =>
        pass
          ? `Expected metric "${name}" NOT to have callCount ${expected}`
          : `Expected metric "${name}" to have callCount ${expected}, but got ${callCount}`,
    };
  },

  toHaveOtelMinCallCount(
    this: ExpectMatcherState,
    received: BaseMetric,
    min: number,
  ): MatcherReturnType {
    const { callCount, name } = received;
    const pass = callCount >= min;
    return {
      pass,
      message: () =>
        pass
          ? `Expected metric "${name}" NOT to have callCount >= ${min}, but got ${callCount}`
          : `Expected metric "${name}" to have callCount >= ${min}, but got ${callCount}`,
    };
  },

  toBeOtelSpanEnded(
    this: ExpectMatcherState,
    received: Span,
  ): MatcherReturnType {
    const { ended, name } = received;
    return {
      pass: ended,
      message: () =>
        ended
          ? `Expected span "${name}" NOT to have ended, but it already ended`
          : `Expected span "${name}" to have ended, but it is still open — call span.end() or exit the using block`,
    };
  },
});
