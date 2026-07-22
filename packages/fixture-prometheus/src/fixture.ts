import {
  expect as baseExpect,
  test as baseTest,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  TestInfo,
  TestType,
} from "@playwright/test";

import {
  Counter,
  Event,
  Gauge,
  Histogram,
  PROM_ATTACHMENT_NAME,
} from "@playwright-labs/prometheus-core";

/**
 * Worker-local registry of shared ("global") metrics, keyed by
 * `${kind}:${name}`. Each Playwright worker is a separate process, so
 * "global" means global to the worker process — metrics registered here are
 * shared by every test running in the same worker, never across workers.
 */
const globalMetrics = new Map<string, Counter | Histogram>();

/**
 * Returns the cached global metric for `kind` + `name`, creating it on first
 * access. Creation options therefore apply only at first creation — later
 * calls with the same name return the already-registered instance.
 *
 * @throws when the same name was already registered with the other kind.
 */
function getGlobalMetric<T extends Counter | Histogram>(
  kind: "counter" | "histogram",
  name: string,
  create: () => T,
): T {
  const existing = globalMetrics.get(`${kind}:${name}`);
  if (existing) {
    return existing as T;
  }
  const otherKind = kind === "counter" ? "histogram" : "counter";
  if (globalMetrics.has(`${otherKind}:${name}`)) {
    throw new Error(
      `Global metric "${name}" is already registered as a ${otherKind}`,
    );
  }
  const metric = create();
  globalMetrics.set(`${kind}:${name}`, metric);
  return metric;
}

/**
 * Flushes every registered global metric. Drained metrics without new samples
 * no-op, so untouched globals emit nothing.
 */
function flushGlobalMetrics() {
  for (const metric of globalMetrics.values()) {
    metric.collect();
  }
}

/** Options accepted by {@link PromRWFixture.useGlobalHistogram}. */
export interface GlobalHistogramOptions {
  /**
   * Bucket upper bounds. Defaults to Prometheus' `DEFAULT_BUCKETS`
   * (`[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]`).
   */
  buckets?: number[];
  /** Extra labels spread onto every child series of the histogram. */
  labels?: Record<string, string>;
}

export interface PromRWFixture {
  /**
   * Creates a Counter metric with the specified name and optional labels.
   * @param name - The name of the counter metric.
   * @param labels - Optional key-value pairs for metric labeling.
   * @returns A Counter instance that can be used to track incremental values.
   * @example
   * ```ts
   * test('track API request count', async ({ useCounterMetric, page }) => {
   *   // Create a counter metric for API requests
   *   const apiRequestCounter = useCounterMetric(
   *     'api_requests', {
   *       endpoint: '/users' // endpoint is a custom label
   *     });
   *
   *   // Increment counter when API is called
   *   await page.goto('/users');
   *   apiRequestCounter.inc();
   *
   *   // Increment by specific amount
   *   await page.click('.load-more-users');
   *   apiRequestCounter.inc(5);
   *
   *   // Add additional labels and collect metrics
   *   apiRequestCounter.labels({ status: 'success' }).collect();
   * });
   * ```
   */
  useCounterMetric: <
    const Name extends string = string,
    const Labels extends Record<string, string> = Record<string, string>
  >(
    name: Name,
    labels?: Labels
  ) => Counter<Name, Labels>;
  /**
   * Creates a Gauge metric with the specified name and optional labels.
   * @param name - The name of the gauge metric.
   * @param labels - Optional key-value pairs for metric labeling.
   * @returns A Gauge instance that can be used to track values that can go up and down.
   * @example
   * ```ts
   * test('track active users', async ({ useGaugeMetric, page }) => {
   *   // Create a gauge metric for active users
   *   const activeUsersGauge = useGaugeMetric('active_users', { region: 'us-east' });
   *
   *   // Set gauge to initial value
   *   activeUsersGauge.set(10);
   *
   *   // Increment gauge when users log in
   *   await page.goto('/login');
   *   await page.fill('#username', 'testuser');
   *   await page.fill('#password', 'password');
   *   await page.click('#login-button');
   *   activeUsersGauge.inc();
   *
   *   // Decrement gauge when users log out
   *   await page.click('#logout-button');
   *   activeUsersGauge.dec();
   *
   *   // Reset to zero and collect metrics
   *   activeUsersGauge.zero().collect();
   * });
   * ```
   */
  useGaugeMetric: (name: string, labels?: Record<string, string>) => Gauge;
  /**
   * Returns a process-wide shared **Counter** — the same instance is reused by
   * every test that asks for the same `name`, so the value accumulates across
   * tests. "Global" is scoped to the Playwright worker: each worker is a
   * separate process with its own registry.
   *
   * The counter is automatically flushed (`collect()`) at the test's fixture
   * teardown — together with every other registered global metric — so there
   * is no need to call `collect()` manually. Manual `collect()` mid-test is
   * still possible; thanks to drain semantics only new samples are emitted.
   *
   * `labels` apply only when the counter is first created; later calls with
   * the same name return the already-registered instance. Registering the
   * same name via {@link useGlobalHistogram} throws.
   *
   * @param name - The name of the counter metric.
   * @param labels - Optional key-value pairs for metric labeling.
   * @example
   * ```ts
   * test('home page', async ({ useGlobalCounter, page }) => {
   *   const urlCalls = useGlobalCounter('url_calls');
   *   await page.goto('/');
   *   urlCalls.inc();
   * });
   *
   * test('users page', async ({ useGlobalCounter, page }) => {
   *   const urlCalls = useGlobalCounter('url_calls'); // same instance
   *   await page.goto('/users');
   *   urlCalls.inc(); // now counts 2 page visits across both tests
   * });
   * ```
   */
  useGlobalCounter: <
    const Name extends string = string,
    const Labels extends Record<string, string> = Record<string, string>
  >(
    name: Name,
    labels?: Labels
  ) => Counter<Name, Labels>;
  /**
   * Returns a process-wide shared **Histogram** — the same instance is reused
   * by every test that asks for the same `name`, so observations accumulate
   * across tests. "Global" is scoped to the Playwright worker: each worker is
   * a separate process with its own registry.
   *
   * The histogram is automatically flushed (`collect()`) at the test's
   * fixture teardown — together with every other registered global metric —
   * so there is no need to call `collect()` manually. Manual `collect()`
   * mid-test is still possible.
   *
   * `options` (`buckets` / `labels`) apply only when the histogram is first
   * created; later calls with the same name return the already-registered
   * instance. Registering the same name via {@link useGlobalCounter} throws.
   *
   * @param name - The name of the histogram metric.
   * @param options - Optional bucket bounds and labels.
   * @example
   * ```ts
   * test('dashboard load time', async ({ useGlobalHistogram, page }) => {
   *   const loadTime = useGlobalHistogram('page_load_seconds', {
   *     buckets: [0.1, 0.5, 1, 2.5, 5],
   *   });
   *   const start = Date.now();
   *   await page.goto('/dashboard');
   *   loadTime.observe((Date.now() - start) / 1000);
   * });
   * ```
   */
  useGlobalHistogram: (
    name: string,
    options?: GlobalHistogramOptions
  ) => Histogram;
}

/**
 * Extended Playwright `test` with Prometheus metric fixtures.
 *
 * Requires `@playwright-labs/reporter-prometheus-remote-write` to be
 * configured as a reporter in `playwright.config.ts` so the emitted metrics
 * are collected and pushed to Prometheus via the remote-write endpoint.
 *
 * @example
 * ```ts
 * // playwright.config.ts
 * export default defineConfig({
 *   reporter: [
 *     ['@playwright-labs/reporter-prometheus-remote-write', {
 *       serverUrl: 'http://localhost:9090/api/v1/write',
 *     }],
 *   ],
 * });
 *
 * // my.spec.ts
 * import { test, expect } from '@playwright-labs/fixture-prometheus';
 *
 * test('track API request count', async ({ useCounterMetric, page }) => {
 *   const apiRequestCounter = useCounterMetric('api_requests', {
 *     endpoint: '/users',
 *   });
 *   await page.goto('/users');
 *   apiRequestCounter.inc();
 *   apiRequestCounter.collect();
 * });
 * ```
 */
/**
 * Internal fixture that routes `Event.emit()` through the current test's
 * attachments instead of stdout, so transport events never leak into the
 * console output. Every public fixture depends on it, which guarantees the
 * writer is still installed when their teardown flushes buffered data.
 */
type PromInternalFixtures = { _promSink: void };

export const test: TestType<
  PlaywrightTestArgs & PlaywrightTestOptions & PromRWFixture,
  PlaywrightWorkerArgs & PlaywrightWorkerOptions
> = baseTest.extend<PromRWFixture & PromInternalFixtures>({
  _promSink: [
    async ({}, use, testInfo: TestInfo) => {
      Event.setWriter((event) => {
        testInfo.attachments.push({
          name: PROM_ATTACHMENT_NAME,
          contentType: "application/json",
          body: Buffer.from(JSON.stringify(event)),
        });
      });
      await use();
      Event.setWriter(undefined);
    },
    { auto: true, box: true },
  ],

  useCounterMetric: [
    async ({ _promSink }, use) => {
      await use(
        <
          Name extends string = string,
          Labels extends Record<string, string> = Record<string, string>
        >(
          name: Name,
          labels?: Labels
        ) => {
          if (labels && typeof labels === "object" && labels !== null) {
            return new Counter<Name, Labels>({ name, ...labels });
          }
          return new Counter<Name, Labels>({ name, ...({} as Labels) });
        }
      );
    },
    { box: true },
  ],
  useGaugeMetric: [
    async ({ _promSink }, use) => {
      await use((name, labels) => {
        return new Gauge({ name, ...labels });
      });
    },
    { box: true },
  ],
  useGlobalCounter: [
    async ({ _promSink }, use) => {
      await use(
        <
          Name extends string = string,
          Labels extends Record<string, string> = Record<string, string>
        >(
          name: Name,
          labels?: Labels
        ) =>
          getGlobalMetric("counter", name, () => {
            if (labels && typeof labels === "object" && labels !== null) {
              return new Counter<Name, Labels>({ name, ...labels });
            }
            return new Counter<Name, Labels>({ name, ...({} as Labels) });
          })
      );
      // Auto-flush: drain every registered global metric after the test.
      flushGlobalMetrics();
    },
    { box: true },
  ],
  useGlobalHistogram: [
    async ({ _promSink }, use) => {
      await use((name, options) =>
        getGlobalMetric(
          "histogram",
          name,
          () =>
            new Histogram({
              name,
              ...options?.labels,
              buckets: options?.buckets,
            })
        )
      );
      // Auto-flush: drain every registered global metric after the test.
      flushGlobalMetrics();
    },
    { box: true },
  ],
});

export const expect = baseExpect.extend({});
