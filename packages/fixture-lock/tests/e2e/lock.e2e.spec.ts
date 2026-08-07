import { expect, test } from "../../src/fixture";
import { createGlobalSetup } from "../../src/globalSetup";
import { HttpLockServer } from "../../src/servers/http";

// Full e2e: real HttpLockServer (started the same way globalSetup.ts does
// it for a real run), real HttpLockClient wired purely through
// LOCK_SERVER_URL (no fakes, no injected `client`), racing real concurrent
// workers for the same resource id through the public `useLock` fixture.
let stopServer: () => Promise<void>;

test.beforeAll(async () => {
  stopServer = await createGlobalSetup(new HttpLockServer());
});

test.afterAll(async () => {
  await stopServer();
});

test("concurrent workers serialize access to the same locked resource", async ({
  useLock,
}) => {
  const WORKER_COUNT = 8;
  let active = 0;
  let maxActive = 0;
  let completed = 0;

  await Promise.all(
    Array.from({ length: WORKER_COUNT }, async (_, i) => {
      const account = await useLock({
        id: "shared-account",
        data: { seat: i },
        workerId: `worker-${i}`,
        staleMs: 5000,
      });

      // critical section: never more than one worker in here at once
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 15));
      active--;
      completed++;

      await account.release();
    }),
  );

  expect(maxActive).toBe(1);
  expect(completed).toBe(WORKER_COUNT);
});

test("each worker sees its own data once it holds the lock", async ({
  useLock,
}) => {
  const seen: number[] = [];

  await Promise.all(
    Array.from({ length: 4 }, async (_, i) => {
      const account = await useLock({
        id: "shared-account",
        data: { seat: i },
      });
      seen.push(account.data.seat);
      await account.release();
    }),
  );

  expect(seen.sort()).toEqual([0, 1, 2, 3]);
});
