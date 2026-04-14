import {
  test as baseTest,
  type PlaywrightTestArgs,
  type PlaywrightTestOptions,
  type PlaywrightWorkerArgs,
  type PlaywrightWorkerOptions,
  type TestType,
} from "@playwright/test";

import {
  Counter,
  Histogram,
  UpDownCounter,
  type MetricOptions,
} from "@playwright-labs/otel-core";
import { Span } from "@playwright-labs/otel-core";

export { Counter, Histogram, UpDownCounter, type MetricOptions, Span };

/**
 * Fixture interface providing OTel metric factories and span creation.
 *
 * All metrics and spans are automatically flushed/ended by the fixture
 * teardown after each test — no need to call `collect()` / `end()` manually.
 * Use explicit calls (or `using` blocks) when you need deterministic control
 * over when the data is forwarded.
 *
 * Requires {@link https://www.npmjs.com/package/@playwright-labs/reporter-otel | @playwright-labs/reporter-otel}
 * to be configured as a reporter so the emitted events are collected and sent
 * to the OTel backend.
 */
export interface OtelFixture {
  /**
   * Creates an OTel **Counter** — a monotonically increasing value.
   *
   * The counter is automatically flushed to the reporter at the end of
   * the test.  Use `using` for scope-bound flushing:
   * ```ts
   * using requests = useCounter('api_requests');
   * ```
   *
   * @param name - Metric name as it will appear in your OTel backend.
   * @param options - Optional description and unit.
   *
   * @example
   * ```ts
   * test('track requests', async ({ useCounter, page }) => {
   *   const requests = useCounter('api_requests', { unit: 'requests' });
   *   await page.goto('/users');
   *   requests.add(1, { endpoint: '/users', status: '200' });
   *   expect(requests).toHaveOtelCallCount(1);
   * });
   * ```
   */
  useCounter: (name: string, options?: MetricOptions) => Counter;

  /**
   * Creates an OTel **Histogram** — a distribution of values.
   *
   * @param name - Metric name as it will appear in your OTel backend.
   * @param options - Optional description and unit.
   *
   * @example
   * ```ts
   * test('track load time', async ({ useHistogram, page }) => {
   *   const duration = useHistogram('page_load', { unit: 'ms' });
   *   const start = Date.now();
   *   await page.goto('/dashboard');
   *   duration.record(Date.now() - start, { route: '/dashboard' });
   * });
   * ```
   */
  useHistogram: (name: string, options?: MetricOptions) => Histogram;

  /**
   * Creates an OTel **UpDownCounter** — a value that can increase or decrease.
   * Use for queue depths, active connections, in-flight operations, etc.
   *
   * @param name - Metric name as it will appear in your OTel backend.
   * @param options - Optional description and unit.
   *
   * @example
   * ```ts
   * test('track in-flight', async ({ useUpDownCounter, page }) => {
   *   const inFlight = useUpDownCounter('http_in_flight');
   *   inFlight.add(1);
   *   await page.goto('/api');
   *   inFlight.add(-1);
   * });
   * ```
   */
  useUpDownCounter: (name: string, options?: MetricOptions) => UpDownCounter;

  /**
   * Creates a named **Span** nested under the current test span.
   *
   * The span is automatically ended by the fixture teardown if you do not
   * call `end()` explicitly.  For precise timing, end spans as soon as the
   * operation completes.  Spans also support the `using` keyword:
   * ```ts
   * {
   *   using span = useSpan('db.query');
   *   // ...operation...
   * } // span.end() called automatically
   * ```
   *
   * @param name - Span name as it will appear in your OTel tracing backend.
   *
   * @example
   * ```ts
   * test('track checkout', async ({ useSpan, page }) => {
   *   const span = useSpan('checkout.flow');
   *   await page.goto('/checkout');
   *   span.setAttribute('cart.items', 3);
   *   span.end();
   *   expect(span).toBeOtelSpanEnded();
   * });
   * ```
   */
  useSpan: (name: string) => Span;
}

/**
 * Extended Playwright `test` with OTel metric and span fixtures.
 *
 * Pair with `@playwright-labs/reporter-otel` in `playwright.config.ts` so
 * emitted events are forwarded to your OTel backend.
 *
 * @example
 * ```ts
 * // playwright.config.ts
 * export default defineConfig({
 *   reporter: [['@playwright-labs/reporter-otel', { host: 'otel-collector' }]],
 * });
 *
 * // my.spec.ts
 * import { test, expect } from '@playwright-labs/fixture-otel';
 *
 * test('my test', async ({ useCounter, useSpan, page }) => {
 *   const clicks = useCounter('button_clicks');
 *   const span = useSpan('page.interaction');
 *   await page.getByRole('button').click();
 *   clicks.add(1, { button: 'submit' });
 *   span.end();
 *   expect(clicks).toBeOtelMetricCollected();
 *   expect(span).toBeOtelSpanEnded();
 * });
 * ```
 */
export const test: TestType<
  PlaywrightTestArgs & PlaywrightTestOptions & OtelFixture,
  PlaywrightWorkerArgs & PlaywrightWorkerOptions
> = baseTest.extend<OtelFixture>({
  useCounter: [
    async ({}, use) => {
      const created: Counter[] = [];
      await use((name, options) => {
        const counter = new Counter(name, options);
        created.push(counter);
        return counter;
      });
      created.forEach((m) => m.collect());
    },
    { box: true },
  ],

  useHistogram: [
    async ({}, use) => {
      const created: Histogram[] = [];
      await use((name, options) => {
        const histogram = new Histogram(name, options);
        created.push(histogram);
        return histogram;
      });
      created.forEach((m) => m.collect());
    },
    { box: true },
  ],

  useUpDownCounter: [
    async ({}, use) => {
      const created: UpDownCounter[] = [];
      await use((name, options) => {
        const counter = new UpDownCounter(name, options);
        created.push(counter);
        return counter;
      });
      created.forEach((m) => m.collect());
    },
    { box: true },
  ],

  useSpan: [
    async ({}, use) => {
      const created: Span[] = [];
      await use((name) => {
        const span = new Span(name);
        created.push(span);
        return span;
      });
      // Auto-end any spans that weren't explicitly closed
      created.forEach((s) => s.end());
    },
    { box: true },
  ],
});
