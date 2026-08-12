import {
  test as baseTest,
  expect as baseExpect,
  Page,
  Frame,
  CDPSession,
} from "@playwright/test";
import {
  NetworkAPI,
  NETWORK_PRESETS,
  type NetworkPreset,
  type NetworkCondition,
} from "@playwright-labs/network-core";

/**
 * Creates (or reuses) a {@link NetworkAPI} for a page/frame.
 *
 * Without an argument the default `page` fixture is used. Every created
 * instance is stopped automatically when the test ends.
 *
 * @example
 * ```ts
 * test('slow 3G', async ({ page, useNetwork }) => {
 *   const network = await useNetwork();
 *   await network.start('Regular3G');
 *   await page.goto('/dashboard');
 * });
 * ```
 */
export type UseNetwork = (page?: Page | Frame) => Promise<NetworkAPI>;

/**
 * Tracks the most recent {@link NetworkAPI} created for a given page/frame
 * via `useNetwork`/the `network` fixture, so matchers accept either the
 * instance or the page itself.
 */
const pageToNetwork = new WeakMap<Page | Frame, NetworkAPI>();

function resolveNetwork(received: NetworkAPI | Page | Frame): NetworkAPI {
  if (received instanceof NetworkAPI) return received;
  const network = pageToNetwork.get(received);
  if (!network) {
    throw new Error(
      "No NetworkAPI instance found for this page/frame — call useNetwork(page) " +
        "(or use the `network` fixture) before asserting on it.",
    );
  }
  return network;
}

/** Any restriction active: offline, positive latency, or capped throughput. */
function isThrottled(condition: NetworkCondition): boolean {
  return (
    condition.offline ||
    condition.latency > 0 ||
    condition.downloadThroughput !== -1 ||
    condition.uploadThroughput !== -1
  );
}

export type FixtureOptions = {
  /**
   * Network condition applied automatically before each test — a preset
   * name or a partial condition. `null` (the default) applies nothing.
   * Configurable via `test.use` or the `use` block of the Playwright config.
   *
   * @example
   * ```ts
   * test.describe('slow network', () => {
   *   test.use({ networkPreset: 'Regular3G' });
   *
   *   test('dashboard still renders', async ({ page }) => {
   *     await page.goto('/dashboard'); // already throttled
   *   });
   * });
   * ```
   */
  networkPreset: NetworkPreset | Partial<NetworkCondition> | null;
};

export type Fixture = {
  /**
   * Factory for {@link NetworkAPI} handles. Call with a specific page/frame
   * or without arguments for the default page. Chromium only.
   */
  useNetwork: UseNetwork;
  /**
   * Ready-made {@link NetworkAPI} for the default page — shortcut for
   * `await useNetwork()`.
   *
   * @example
   * ```ts
   * test('offline banner', async ({ page, network }) => {
   *   await network.start('Offline');
   *   await page.reload();
   *   await expect(page.getByRole('alert')).toContainText('offline');
   * });
   * ```
   */
  network: NetworkAPI;
};

export const test = baseTest.extend<
  Fixture & FixtureOptions & { _applyNetworkPreset: void }
>({
  networkPreset: [null, { option: true }],

  useNetwork: async ({ page, context }, use) => {
    const handles = new Map<Page | Frame, NetworkAPI>();

    const useNetwork: UseNetwork = async (target = page) => {
      const existing = handles.get(target);
      if (existing) return existing;

      let session: CDPSession;
      try {
        session = await context.newCDPSession(target);
      } catch (cause) {
        throw new Error(
          "@playwright-labs/fixture-network requires Chromium — the CDP " +
            '"Network" domain used to emulate network conditions is ' +
            "not available in other browsers.",
          { cause },
        );
      }
      const network = new NetworkAPI(session as never);
      handles.set(target, network);
      pageToNetwork.set(target, network);
      return network;
    };

    await use(useNetwork);

    // restore normal networking for every handle created during the test
    await Promise.all([...handles.values()].map((network) => network.stop()));
  },

  network: async ({ useNetwork }, use) => {
    await use(await useNetwork());
  },

  // applies the `networkPreset` option before every test, even when the
  // test requests neither `network` nor `useNetwork`
  _applyNetworkPreset: [
    async ({ networkPreset, useNetwork }, use) => {
      if (networkPreset !== null) {
        const network = await useNetwork();
        await network.start(networkPreset);
      }
      await use();
    },
    { auto: true },
  ],
});

export const expect = baseExpect.extend({
  /**
   * Passes when network emulation is active (any condition applied).
   *
   * ```ts
   * await network.start('Regular3G');
   * expect(network).toBeNetworkStarted();   // or expect(page).toBeStarted()
   * ```
   */
  toBeNetworkStarted(received: NetworkAPI | Page | Frame) {
    const network = resolveNetwork(received);
    const pass = network.started;
    return {
      name: "toBeNetworkStarted",
      pass,
      message: () =>
        pass
          ? `Expected network emulation not to be started, but condition ${this.utils.printReceived(network.condition)} is active`
          : "Expected network emulation to be started, but no condition is applied",
    };
  },

  /**
   * Passes when the applied condition simulates a dropped connection.
   *
   * ```ts
   * await network.start('Offline');
   * expect(network).toBeNetworkOffline();
   * ```
   */
  toBeNetworkOffline(received: NetworkAPI | Page | Frame) {
    const network = resolveNetwork(received);
    const pass = network.condition?.offline === true;
    return {
      name: "toBeNetworkOffline",
      pass,
      actual: network.condition,
      message: () => {
        const expectation = this.isNot ? "not to be" : "to be";
        return `Expected network ${expectation} offline, current condition: ${this.utils.printReceived(network.condition)}`;
      },
    };
  },

  /**
   * Passes when any restriction is active: offline, positive latency,
   * or capped throughput. `NoThrottling` (and "not started") fail.
   *
   * ```ts
   * await network.start('GPRS');
   * expect(network).toBeNetworkThrottled();
   * ```
   */
  toBeNetworkThrottled(received: NetworkAPI | Page | Frame) {
    const network = resolveNetwork(received);
    const condition = network.condition;
    const pass = condition !== null && isThrottled(condition);
    return {
      name: "toBeNetworkThrottled",
      pass,
      actual: condition,
      message: () => {
        const expectation = this.isNot ? "not to be" : "to be";
        return `Expected network ${expectation} throttled, current condition: ${this.utils.printReceived(condition)}`;
      },
    };
  },

  /**
   * Passes when the applied condition matches a preset name or a partial
   * condition (compared field-by-field, omitted fields ignored).
   *
   * ```ts
   * await network.start('Regular3G');
   * expect(network).toHaveNetworkCondition('Regular3G');
   * expect(network).toHaveNetworkCondition({ latency: 100 });
   * ```
   */
  toHaveNetworkCondition(
    received: NetworkAPI | Page | Frame,
    expected: NetworkPreset | Partial<NetworkCondition>,
  ) {
    const network = resolveNetwork(received);
    const expectedCondition: Partial<NetworkCondition> =
      typeof expected === "string" ? NETWORK_PRESETS[expected] : expected;
    if (!expectedCondition) {
      throw new TypeError(
        `toHaveCondition: unknown preset "${String(expected)}". Known: ${Object.keys(NETWORK_PRESETS).join(", ")}`,
      );
    }

    const actual = network.condition;
    const pass =
      actual !== null &&
      Object.entries(expectedCondition).every(
        ([key, value]) => actual[key as keyof NetworkCondition] === value,
      );

    return {
      name: "toHaveNetworkCondition",
      pass,
      expected: expectedCondition,
      actual,
      message: () => {
        const expectation = this.isNot ? "not to match" : "to match";
        return (
          `Expected network condition ${expectation} ${this.utils.printExpected(expectedCondition)}, ` +
          `current: ${this.utils.printReceived(actual)}`
        );
      },
    };
  },
});
