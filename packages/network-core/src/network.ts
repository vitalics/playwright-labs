import type { CDPSession } from "playwright-core";

export type NetworkCondition = {
  /** Simulate a dropped connection. */
  offline: boolean;
  /** Download speed in bytes/sec; `-1` disables download throttling. */
  downloadThroughput: number;
  /** Upload speed in bytes/sec; `-1` disables upload throttling. */
  uploadThroughput: number;
  /** Minimum latency from request start to response headers, ms. */
  latency: number;
};

/** Kilobits per second → bytes per second. */
export function kbps(value: number): number {
  return (value * 1024) / 8;
}

/** Megabits per second → bytes per second. */
export function mbps(value: number): number {
  return (value * 1024 * 1024) / 8;
}

/** Everything unlimited — restores normal networking. */
export const NO_THROTTLING: NetworkCondition = Object.freeze({
  offline: false,
  downloadThroughput: -1,
  uploadThroughput: -1,
  latency: 0,
});

/** Fully offline network condition. */
export const OFFLINE: NetworkCondition = Object.freeze({
  offline: true,
  downloadThroughput: 0,
  uploadThroughput: 0,
  latency: 0,
});

/**
 * Creates a validated {@link NetworkCondition}. Omitted fields fall back to
 * "no restriction" (`offline: false`, `-1` throughput, `0` latency).
 *
 * ```ts
 * const flaky = createNetworkCondition({ latency: 800, downloadThroughput: kbps(256) });
 * ```
 */
export function createNetworkCondition(
  condition: Partial<NetworkCondition> = {},
): NetworkCondition {
  const resolved: NetworkCondition = {
    offline: condition.offline ?? false,
    downloadThroughput: condition.downloadThroughput ?? -1,
    uploadThroughput: condition.uploadThroughput ?? -1,
    latency: condition.latency ?? 0,
  };
  if (resolved.latency < 0 || !Number.isFinite(resolved.latency)) {
    throw new TypeError(
      `createNetworkCondition: latency must be a finite number >= 0, got ${resolved.latency}`,
    );
  }
  for (const field of ["downloadThroughput", "uploadThroughput"] as const) {
    const value = resolved[field];
    if (!Number.isFinite(value) || (value < 0 && value !== -1)) {
      throw new TypeError(
        `createNetworkCondition: ${field} must be a finite number >= 0 (or -1 to disable throttling), got ${value}`,
      );
    }
  }
  return Object.freeze(resolved);
}

export const NETWORK_PRESETS = Object.freeze({
  GPRS: createNetworkCondition({
    downloadThroughput: kbps(50), // 6_400 B/s
    uploadThroughput: kbps(20), // 2_560 B/s
    latency: 500,
  }),
  Regular2G: createNetworkCondition({
    downloadThroughput: kbps(250), // 32_000 B/s
    uploadThroughput: kbps(50), // 6_400 B/s
    latency: 300,
  }),
  Good2G: createNetworkCondition({
    downloadThroughput: kbps(450), // 57_600 B/s
    uploadThroughput: kbps(150), // 19_200 B/s
    latency: 150,
  }),
  Regular3G: createNetworkCondition({
    downloadThroughput: kbps(750), // 96_000 B/s
    uploadThroughput: kbps(250), // 32_000 B/s
    latency: 100,
  }),
  Good3G: createNetworkCondition({
    downloadThroughput: mbps(1.5), // 196_608 B/s
    uploadThroughput: kbps(750), // 96_000 B/s
    latency: 40,
  }),
  Regular4G: createNetworkCondition({
    downloadThroughput: mbps(4), // 524_288 B/s
    uploadThroughput: mbps(3), // 393_216 B/s
    latency: 20,
  }),
  DSL: createNetworkCondition({
    downloadThroughput: mbps(2), // 262_144 B/s
    uploadThroughput: mbps(1), // 131_072 B/s
    latency: 5,
  }),
  WiFi: createNetworkCondition({
    downloadThroughput: mbps(30), // 3_932_160 B/s
    uploadThroughput: mbps(15), // 1_966_080 B/s
    latency: 2,
  }),
  Offline: OFFLINE,
  NoThrottling: NO_THROTTLING,
} as const satisfies Record<string, NetworkCondition>);

export type NetworkPreset = keyof typeof NETWORK_PRESETS;

/**
 * Network condition emulation over a CDP session (Chromium only).
 *
 * ```ts
 * const session = await context.newCDPSession(page);
 * await using network = new NetworkAPI(session);
 * await network.start("Regular3G");                       // preset by name
 * await network.start(createNetworkCondition({ latency: 800 })); // custom
 * // async-dispose (or stop()) restores normal networking
 * ```
 */
export class NetworkAPI {
  readonly PRESETS = NETWORK_PRESETS;
  #enabled = false;
  #current: NetworkCondition | null = null;

  constructor(readonly session: CDPSession) {}

  /** The condition currently applied, or `null` when not started. */
  get condition(): NetworkCondition | null {
    return this.#current;
  }

  get started(): boolean {
    return this.#current !== null;
  }

  /**
   * Applies a condition (preset name or object, possibly partial — omitted
   * fields mean "no restriction") and returns the resolved
   * {@link NetworkCondition}.
   */
  async start(
    condition: Partial<NetworkCondition> | NetworkPreset,
  ): Promise<NetworkCondition> {
    let resolved: NetworkCondition;
    if (typeof condition === "string") {
      resolved = NETWORK_PRESETS[condition];
    } else {
      resolved = createNetworkCondition(condition);
    }
    if (!resolved) {
      throw new TypeError(
        `NetworkAPI.start: unknown preset "${String(condition)}". Known: ${Object.keys(NETWORK_PRESETS).join(", ")}`,
      );
    }
    if (!this.#enabled) {
      // emulateNetworkConditions requires the Network domain to be enabled
      await this.session.send("Network.enable");
      this.#enabled = true;
    }
    await this.session.send("Network.emulateNetworkConditions", resolved);
    this.#current = resolved;
    return resolved;
  }

  /** Restores normal networking (no throttling, online). */
  async stop(): Promise<void> {
    if (this.#current === null) return; // idempotent, no CDP calls before start
    // Network domain is already enabled — start() ran before us
    await this.session.send("Network.emulateNetworkConditions", NO_THROTTLING);
    this.#current = null;
  }

  async dispose() {
    await this.stop();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.stop();
  }
}
