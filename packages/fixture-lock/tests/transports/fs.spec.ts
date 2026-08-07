import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { expect, test } from "@playwright/test";

import { FsLockClient } from "../../src/transports/fs";

let dir: string;
let client: FsLockClient;

test.beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "fixture-lock-fs-"));
  client = new FsLockClient(dir);
});

test.afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

test("acquire creates a lock file and succeeds when the resource is free", async () => {
  await expect(client.acquire("res-1", "w1", 5000)).resolves.toBe(true);
  await expect(fs.stat(path.join(dir, "res-1.lock"))).resolves.toBeTruthy();
});

test("acquire fails while another worker holds a fresh lock", async () => {
  await client.acquire("res-1", "w1", 5000);
  await expect(client.acquire("res-1", "w2", 5000)).resolves.toBe(false);
});

test("release deletes the lock file, freeing it for the next acquire", async () => {
  await client.acquire("res-1", "w1", 5000);
  await expect(client.release("res-1")).resolves.toBe(true);
  await expect(client.acquire("res-1", "w2", 5000)).resolves.toBe(true);
});

test("release on a lock nobody holds still succeeds", async () => {
  await expect(client.release("never-locked")).resolves.toBe(true);
});

test("a stale lock is stolen within a single acquire() call", async () => {
  await client.acquire("res-1", "w1", 20);
  await new Promise((resolve) => setTimeout(resolve, 40));

  await expect(client.acquire("res-1", "w2", 20)).resolves.toBe(true);
});

test("creates the lock directory when it does not exist yet", async () => {
  const nestedDir = path.join(dir, "nested", "locks");
  const nestedClient = new FsLockClient(nestedDir);

  await expect(nestedClient.acquire("res-1", "w1", 5000)).resolves.toBe(true);
});

test("defaults to a directory under the OS tmpdir", async () => {
  const defaultClient = new FsLockClient();
  const id = `fixture-lock-default-${Date.now()}`;

  try {
    await expect(defaultClient.acquire(id, "w1", 5000)).resolves.toBe(true);
  } finally {
    await defaultClient.release(id);
  }
});
