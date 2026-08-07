import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { expect, test } from "../src/fixture";
import type { LockClient } from "../src/transport";

class FakeLockClient implements LockClient {
  readonly acquireCalls: { id: string; workerId: string }[] = [];
  readonly releaseCalls: { id: string; workerId: string }[] = [];

  async acquire(id: string, workerId: string): Promise<boolean> {
    this.acquireCalls.push({ id, workerId });
    return true;
  }

  async release(id: string, workerId: string): Promise<boolean> {
    this.releaseCalls.push({ id, workerId });
    return true;
  }
}

test.describe("useLock (fake client)", () => {
  test("acquires the lock and exposes data once locked", async ({ useLock }) => {
    const client = new FakeLockClient();
    const resource = await useLock({ id: "res-1", data: { n: 1 }, client });

    expect(resource.isLocked).toBe(true);
    expect(resource.data).toEqual({ n: 1 });
    expect(client.acquireCalls).toEqual([{ id: "res-1", workerId: expect.any(String) }]);
  });

  test("tracks multiple independent locks in the same test", async ({ useLock }) => {
    const client = new FakeLockClient();
    const a = await useLock({ id: "res-a", data: { name: "a" }, client });
    const b = await useLock({ id: "res-b", data: { name: "b" }, client });

    expect(a.data).toEqual({ name: "a" });
    expect(b.data).toEqual({ name: "b" });
    expect(client.acquireCalls).toHaveLength(2);
  });
});

// This describe block relies on tests running serially, in one worker,
// against the same filesystem lock directory — it proves the fixture
// releases its locks after each test, not just within resource.spec.ts's
// unit tests.
test.describe.serial("useLock (real fs transport, proves auto-release)", () => {
  let lockDir: string;
  let originalLockFsDir: string | undefined;

  test.beforeAll(async () => {
    lockDir = await fs.mkdtemp(path.join(os.tmpdir(), "fixture-lock-fixture-"));
    originalLockFsDir = process.env.LOCK_FS_DIR;
    process.env.LOCK_FS_DIR = lockDir;
  });

  test.afterAll(async () => {
    if (originalLockFsDir === undefined) delete process.env.LOCK_FS_DIR;
    else process.env.LOCK_FS_DIR = originalLockFsDir;
    await fs.rm(lockDir, { recursive: true, force: true });
  });

  test("first test acquires the shared resource", async ({ useLock }) => {
    const resource = await useLock({ id: "shared-res", data: { turn: 1 } });
    expect(resource.isLocked).toBe(true);
  });

  test("second test can acquire the same resource — proof it was released", async ({
    useLock,
  }) => {
    const resource = await useLock({ id: "shared-res", data: { turn: 2 } });
    expect(resource.isLocked).toBe(true);
    expect(resource.data).toEqual({ turn: 2 });
  });
});
