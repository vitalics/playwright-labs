import { currentLock, currentLockIds } from "../src/context";
import { expect, test } from "../src/fixture";
import type { LockClient } from "../src/transport";

/** In-memory client that refuses a second holder — like a real backend. */
class ExclusiveLockClient implements LockClient {
  readonly holders = new Map<string, string>();
  readonly store = new Map<string, unknown>();
  acquireCount = 0;
  releaseCount = 0;

  async acquire(id: string, workerId: string, _staleMs?: number, data?: unknown) {
    this.acquireCount++;
    if (this.holders.has(id)) return false;
    this.holders.set(id, workerId);
    if (data !== undefined && !this.store.has(id)) this.store.set(id, data);
    return true;
  }

  async release(id: string) {
    this.releaseCount++;
    return this.holders.delete(id);
  }

  async getData(id: string) {
    return this.store.get(id);
  }
}

test.describe("useLock(options, callback)", () => {
  test("holds the lock only while the callback runs and returns its result", async ({
    useLock,
  }) => {
    const client = new ExclusiveLockClient();

    const email = await useLock({ id: "acc", data: { email: "a@b.c" }, client }, (account) => {
      expect(account.isLocked).toBe(true);
      expect(client.holders.has("acc")).toBe(true);
      return account.data?.email;
    });

    expect(email).toBe("a@b.c");
    expect(client.holders.has("acc")).toBe(false);
  });

  test("releases the lock when the callback throws", async ({ useLock }) => {
    const client = new ExclusiveLockClient();

    await expect(
      useLock({ id: "acc", client }, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(client.holders.has("acc")).toBe(false);
  });

  test("currentLock() reaches the held resource from nested helpers", async ({ useLock }) => {
    const client = new ExclusiveLockClient();

    async function deepHelper() {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return currentLock<{ email: string }>("acc")?.data?.email;
    }

    const email = await useLock({ id: "acc", data: { email: "a@b.c" }, client }, () =>
      deepHelper(),
    );

    expect(email).toBe("a@b.c");
    expect(currentLock("acc")).toBeUndefined();
  });

  test("nested callbacks see every enclosing lock", async ({ useLock }) => {
    const client = new ExclusiveLockClient();

    const ids = await useLock({ id: "outer", client }, () =>
      useLock({ id: "inner", client }, () => currentLockIds()),
    );

    expect(ids.sort()).toEqual(["inner", "outer"]);
    expect(currentLockIds()).toEqual([]);
  });

  test("re-locking a held id inside its callback is re-entrant", async ({ useLock }) => {
    const client = new ExclusiveLockClient();

    await useLock({ id: "acc", client }, async (outer) => {
      const inner = await useLock({ id: "acc", client });
      expect(inner).toBe(outer);

      const result = await useLock("acc", (again) => again === outer);
      expect(result).toBe(true);

      // inner calls did not release the outer lock
      expect(client.holders.has("acc")).toBe(true);
    });

    expect(client.acquireCount).toBe(1);
    expect(client.releaseCount).toBe(1);
  });

  test("parallel callbacks on one id serialize", async ({ useLock }) => {
    const client = new ExclusiveLockClient();
    let active = 0;
    let maxActive = 0;

    const work = () =>
      useLock({ id: "acc", client }, async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 20));
        active--;
      });

    await Promise.all([work(), work(), work()]);
    expect(maxActive).toBe(1);
  });
});
