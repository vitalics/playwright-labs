import { expect, test } from "@playwright/test";

import { Resource } from "../src/resource";
import type { LockClient } from "../src/transport";

type Call =
  | { method: "acquire"; id: string; workerId: string; staleMs: number }
  | { method: "release"; id: string; workerId: string };

class FakeLockClient implements LockClient {
  readonly calls: Call[] = [];
  #acquireResults: boolean[];

  constructor(acquireResults: boolean[] = [true]) {
    this.#acquireResults = acquireResults;
  }

  async acquire(id: string, workerId: string, staleMs: number): Promise<boolean> {
    this.calls.push({ method: "acquire", id, workerId, staleMs });
    const result =
      this.#acquireResults.length > 1
        ? this.#acquireResults.shift()
        : this.#acquireResults[0];
    return Boolean(result);
  }

  async release(id: string, workerId: string): Promise<boolean> {
    this.calls.push({ method: "release", id, workerId });
    return true;
  }
}

test.describe("constructor", () => {
  test("throws when id is empty", () => {
    const client = new FakeLockClient();
    expect(() => new Resource({ id: "", data: {}, client })).toThrow(/non-empty string/);
  });

  test("freezes a deep clone of data, immune to external mutation", async () => {
    const client = new FakeLockClient();
    const original = { nested: { count: 1 } };
    const resource = new Resource({ id: "res-1", data: original, client });

    original.nested.count = 999;
    await resource.acquire();

    expect(resource.data).toEqual({ nested: { count: 1 } });
    expect(Object.isFrozen(resource.data)).toBe(true);
  });

  test("defaults workerId from TEST_WORKER_INDEX", async () => {
    const client = new FakeLockClient();
    const resource = new Resource({ id: "res-1", data: {}, client });

    await resource.acquire();

    expect(client.calls[0]).toMatchObject({
      workerId: `worker-${process.env.TEST_WORKER_INDEX ?? 0}`,
    });
  });

  test("accepts a custom workerId", async () => {
    const client = new FakeLockClient();
    const resource = new Resource({ id: "res-1", data: {}, client, workerId: "custom-worker" });

    await resource.acquire();

    expect(client.calls[0]).toMatchObject({ workerId: "custom-worker" });
  });
});

test.describe("data", () => {
  test("throws when read before the lock is acquired", () => {
    const client = new FakeLockClient();
    const resource = new Resource({ id: "res-1", data: { a: 1 }, client });

    expect(() => resource.data).toThrow(/without acquiring a lock/);
  });
});

test.describe("acquire", () => {
  test("succeeds immediately when the client grants the lock", async () => {
    const client = new FakeLockClient([true]);
    const resource = new Resource({ id: "res-1", data: { a: 1 }, client, staleMs: 5000 });

    await resource.acquire();

    expect(resource.isLocked).toBe(true);
    expect(client.calls).toEqual([
      { method: "acquire", id: "res-1", workerId: expect.any(String), staleMs: 5000 },
    ]);
  });

  test("polls until the client grants the lock", async () => {
    const client = new FakeLockClient([false, false, true]);
    const resource = new Resource({ id: "res-1", data: {}, client });

    await resource.acquire({ retryIntervalMs: 10 });

    expect(resource.isLocked).toBe(true);
    expect(client.calls.filter((c) => c.method === "acquire")).toHaveLength(3);
  });

  test("throws a timeout error when the client never grants the lock", async () => {
    const client = new FakeLockClient([false]);
    const resource = new Resource({ id: "res-1", data: {}, client });

    await expect(
      resource.acquire({ timeoutMs: 60, retryIntervalMs: 20 }),
    ).rejects.toThrow(/Timeout.*res-1/);
    expect(resource.isLocked).toBe(false);
  });
});

test.describe("release", () => {
  test("releases an acquired lock", async () => {
    const client = new FakeLockClient();
    const resource = new Resource({ id: "res-1", data: {}, client });
    await resource.acquire();

    await resource.release();

    expect(resource.isLocked).toBe(false);
    expect(client.calls.some((c) => c.method === "release")).toBe(true);
  });

  test("is a no-op when the resource is not locked", async () => {
    const client = new FakeLockClient();
    const resource = new Resource({ id: "res-1", data: {}, client });

    await resource.release();

    expect(client.calls).toHaveLength(0);
  });

  test("does not call the client twice on repeated release", async () => {
    const client = new FakeLockClient();
    const resource = new Resource({ id: "res-1", data: {}, client });
    await resource.acquire();

    await resource.release();
    await resource.release();

    expect(client.calls.filter((c) => c.method === "release")).toHaveLength(1);
  });
});

test.describe("Symbol.asyncDispose", () => {
  test("releases the lock when the `await using` block exits", async () => {
    const client = new FakeLockClient();

    {
      await using resource = new Resource({ id: "res-1", data: {}, client });
      await resource.acquire();
      expect(resource.isLocked).toBe(true);
    }

    expect(client.calls.filter((c) => c.method === "release")).toHaveLength(1);
  });
});
