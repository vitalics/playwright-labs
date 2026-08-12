import { test, expect } from "@playwright/test";
import type { CDPSession } from "playwright-core";

import {
  NETWORK_PRESETS,
  NO_THROTTLING,
  OFFLINE,
  NetworkAPI,
  createNetworkCondition,
  kbps,
  mbps,
  type NetworkCondition,
} from "../src/index.js";

type SentCommand = { method: string; params?: unknown };

function fakeSession(): { session: CDPSession; sent: SentCommand[] } {
  const sent: SentCommand[] = [];
  const session = {
    send: async (method: string, params?: unknown) => {
      sent.push({ method, params });
      return {};
    },
  } as unknown as CDPSession;
  return { session, sent };
}

test.describe("throughput helpers", () => {
  test("kbps/mbps convert to bytes per second", () => {
    expect(kbps(50)).toBe(6_400);
    expect(kbps(250)).toBe(32_000);
    expect(mbps(1.5)).toBe(196_608);
    expect(mbps(30)).toBe(3_932_160);
  });
});

test.describe("createNetworkCondition", () => {
  test("defaults are unrestricted", () => {
    expect(createNetworkCondition()).toEqual(NO_THROTTLING);
  });

  test("partial input keeps other fields unrestricted", () => {
    const condition = createNetworkCondition({ latency: 800 });
    expect(condition).toEqual({
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 800,
    });
  });

  test("result is frozen", () => {
    const condition = createNetworkCondition({ latency: 1 });
    expect(Object.isFrozen(condition)).toBe(true);
  });

  test("negative latency throws", () => {
    expect(() => createNetworkCondition({ latency: -1 })).toThrow(TypeError);
  });

  test("NaN and Infinity throw", () => {
    expect(() => createNetworkCondition({ latency: NaN })).toThrow(TypeError);
    expect(() =>
      createNetworkCondition({ downloadThroughput: Infinity }),
    ).toThrow(TypeError);
  });

  test("-1 throughput allowed, other negatives throw", () => {
    expect(
      createNetworkCondition({ uploadThroughput: -1 }).uploadThroughput,
    ).toBe(-1);
    expect(() => createNetworkCondition({ uploadThroughput: -2 })).toThrow(
      TypeError,
    );
  });
});

test.describe("NETWORK_PRESETS", () => {
  test("Regular2G download is 32000 B/s (250 Kbps)", () => {
    // the old hand-written literal said 3200 — regression guard
    expect(NETWORK_PRESETS.Regular2G.downloadThroughput).toBe(32_000);
  });

  test("all presets are valid frozen conditions", () => {
    for (const [name, preset] of Object.entries(NETWORK_PRESETS)) {
      expect(Object.isFrozen(preset), name).toBe(true);
      expect(() => createNetworkCondition(preset), name).not.toThrow();
    }
  });

  test("Offline preset is offline", () => {
    expect(NETWORK_PRESETS.Offline).toEqual(OFFLINE);
    expect(NETWORK_PRESETS.Offline.offline).toBe(true);
  });
});

test.describe("NetworkAPI", () => {
  test("start enables Network domain once and applies the condition", async () => {
    const { session, sent } = fakeSession();
    const api = new NetworkAPI(session);

    const applied = await api.start("Regular3G");

    expect(sent.map((c) => c.method)).toEqual([
      "Network.enable",
      "Network.emulateNetworkConditions",
    ]);
    expect(sent[1].params).toEqual(NETWORK_PRESETS.Regular3G);
    expect(applied).toBe(NETWORK_PRESETS.Regular3G);
    expect(api.condition).toBe(NETWORK_PRESETS.Regular3G);
    expect(api.started).toBe(true);

    // second start: no second Network.enable
    await api.start("WiFi");
    expect(sent.filter((c) => c.method === "Network.enable")).toHaveLength(1);
  });

  test("start accepts a custom condition object and returns the frozen resolve", async () => {
    const { session, sent } = fakeSession();
    const api = new NetworkAPI(session);

    const applied = await api.start({
      offline: false,
      downloadThroughput: kbps(128),
      uploadThroughput: kbps(64),
      latency: 250,
    });

    expect(applied.latency).toBe(250);
    expect(Object.isFrozen(applied)).toBe(true);
    expect(sent.at(-1)?.params).toEqual(applied);
  });

  test("unknown preset name throws with the list of known ones", async () => {
    const { session } = fakeSession();
    const api = new NetworkAPI(session);
    await expect(api.start("LTE" as never)).rejects.toThrow(/unknown preset "LTE".*Regular3G/);
  });

  test("invalid custom condition rejects before any CDP call", async () => {
    const { session, sent } = fakeSession();
    const api = new NetworkAPI(session);
    await expect(
      api.start({ offline: false, downloadThroughput: -5, uploadThroughput: -1, latency: 0 }),
    ).rejects.toThrow(TypeError);
    expect(sent).toHaveLength(0);
  });

  test("stop restores NO_THROTTLING and clears state", async () => {
    const { session, sent } = fakeSession();
    const api = new NetworkAPI(session);

    await api.start("GPRS");
    await api.stop();

    expect(sent.at(-1)).toEqual({
      method: "Network.emulateNetworkConditions",
      params: NO_THROTTLING,
    });
    expect(api.condition).toBeNull();
    expect(api.started).toBe(false);
  });

  test("stop before start is a no-op", async () => {
    const { session, sent } = fakeSession();
    const api = new NetworkAPI(session);
    await api.stop();
    await api.stop();
    expect(sent).toHaveLength(0);
  });

  test("async dispose stops emulation", async () => {
    const { session, sent } = fakeSession();
    {
      await using api = new NetworkAPI(session);
      await api.start("Offline");
    }
    expect(sent.at(-1)?.params).toEqual(NO_THROTTLING);
  });

  test("offline preset round: start Offline then stop goes back online", async () => {
    const { session, sent } = fakeSession();
    const api = new NetworkAPI(session);

    await api.start("Offline");
    expect(
      (sent.at(-1)?.params as NetworkCondition).offline,
    ).toBe(true);

    await api.stop();
    expect(
      (sent.at(-1)?.params as NetworkCondition).offline,
    ).toBe(false);
  });
});
