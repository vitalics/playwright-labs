import { expect, test } from "@playwright/test";

import { createGlobalSetup } from "../src/globalSetup";
import globalTeardown from "../src/globalTeardown";
import { HttpLockServer } from "../src/servers/http";
import { HttpLockClient } from "../src/transports/http";

// These tests share process-wide state (globalThis[kPlaywrightLockKey],
// process.env.LOCK_SERVER_URL) — run them one at a time in one worker.
test.describe.serial("globalSetup / globalTeardown", () => {
  let originalLockServerUrl: string | undefined;

  test.beforeEach(() => {
    originalLockServerUrl = process.env.LOCK_SERVER_URL;
  });

  test.afterEach(() => {
    if (originalLockServerUrl === undefined) {
      delete process.env.LOCK_SERVER_URL;
    } else {
      process.env.LOCK_SERVER_URL = originalLockServerUrl;
    }
  });

  test("starts the server and points LOCK_SERVER_URL at it", async () => {
    const server = new HttpLockServer();
    const teardown = await createGlobalSetup(server);

    expect(process.env.LOCK_SERVER_URL).toBeTruthy();

    const client = new HttpLockClient(process.env.LOCK_SERVER_URL!);
    await expect(client.acquire("probe", "w1", 5000)).resolves.toBe(true);

    await teardown();
  });

  test("the returned teardown stops the server", async () => {
    const server = new HttpLockServer();
    const teardown = await createGlobalSetup(server);
    const url = process.env.LOCK_SERVER_URL!;

    await teardown();

    const client = new HttpLockClient(url);
    await expect(client.acquire("probe", "w1", 5000)).rejects.toBeTruthy();
  });

  test("standalone globalTeardown stops the server started by createGlobalSetup", async () => {
    const server = new HttpLockServer();
    await createGlobalSetup(server);
    const url = process.env.LOCK_SERVER_URL!;

    await globalTeardown();

    const client = new HttpLockClient(url);
    await expect(client.acquire("probe", "w1", 5000)).rejects.toBeTruthy();
  });

  test("standalone globalTeardown is a no-op when nothing was set up", async () => {
    await expect(globalTeardown()).resolves.toBeUndefined();
  });

  test("the returned teardown also drops the server's listeners", async () => {
    const server = new HttpLockServer();
    server.on("error", () => {});
    const teardown = await createGlobalSetup(server);

    await teardown();

    expect(server.eventNames()).toEqual([]);
  });

  test("standalone globalTeardown also drops the server's listeners", async () => {
    const server = new HttpLockServer();
    server.on("error", () => {});
    await createGlobalSetup(server);

    await globalTeardown();

    expect(server.eventNames()).toEqual([]);
  });
});
