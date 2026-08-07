import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { expect, test } from "@playwright/test";

import { createLockClientFromEnv } from "../src/env";
import { FsLockClient } from "../src/transports/fs";
import { HttpLockClient } from "../src/transports/http";
import { IpcLockClient } from "../src/transports/ipc";
import { WebSocketLockClient } from "../src/transports/ws";

const ENV_KEYS = [
  "LOCK_WS_URL",
  "LOCK_SOCKET_PATH",
  "LOCK_SERVER_URL",
  "LOCK_FS_DIR",
] as const;

let envSnapshot: Record<string, string | undefined>;

test.beforeEach(() => {
  envSnapshot = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
});

test.afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = envSnapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("falls back to FsLockClient when nothing is configured", () => {
  expect(createLockClientFromEnv()).toBeInstanceOf(FsLockClient);
});

test("uses HttpLockClient when LOCK_SERVER_URL is set", () => {
  process.env.LOCK_SERVER_URL = "http://127.0.0.1:1234";
  expect(createLockClientFromEnv()).toBeInstanceOf(HttpLockClient);
});

test("uses IpcLockClient when LOCK_SOCKET_PATH is set", () => {
  process.env.LOCK_SOCKET_PATH = "/tmp/lock.sock";
  expect(createLockClientFromEnv()).toBeInstanceOf(IpcLockClient);
});

test("uses WebSocketLockClient when LOCK_WS_URL is set", () => {
  process.env.LOCK_WS_URL = "ws://127.0.0.1:1234";
  expect(createLockClientFromEnv()).toBeInstanceOf(WebSocketLockClient);
});

test("prefers LOCK_WS_URL over LOCK_SOCKET_PATH and LOCK_SERVER_URL", () => {
  process.env.LOCK_WS_URL = "ws://127.0.0.1:1234";
  process.env.LOCK_SOCKET_PATH = "/tmp/lock.sock";
  process.env.LOCK_SERVER_URL = "http://127.0.0.1:1234";
  expect(createLockClientFromEnv()).toBeInstanceOf(WebSocketLockClient);
});

test("prefers LOCK_SOCKET_PATH over LOCK_SERVER_URL", () => {
  process.env.LOCK_SOCKET_PATH = "/tmp/lock.sock";
  process.env.LOCK_SERVER_URL = "http://127.0.0.1:1234";
  expect(createLockClientFromEnv()).toBeInstanceOf(IpcLockClient);
});

test("uses LOCK_FS_DIR to configure the filesystem transport", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "fixture-lock-env-"));
  process.env.LOCK_FS_DIR = dir;

  try {
    const client = createLockClientFromEnv();
    expect(client).toBeInstanceOf(FsLockClient);

    await client.acquire("probe-id", "w1", 5000);
    await expect(fs.stat(path.join(dir, "probe-id.lock"))).resolves.toBeTruthy();
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
