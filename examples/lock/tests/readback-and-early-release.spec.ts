import { expect, test } from "@playwright-labs/fixture-lock";

type Seat = { seat: number; region: string };

// Serial so the publishing test runs before the reading one.
test.describe.serial("publish once, read by id", () => {
  test("setup publishes the seat data", async ({ useLock }) => {
    const seat = await useLock<Seat>({ id: "sandbox-seat", data: { seat: 7, region: "eu" } });
    expect(seat.data).toEqual({ seat: 7, region: "eu" });
  });

  test("later test only knows the id", async ({ useLock }) => {
    // Shorthand: no data passed — it is read back from the lock server.
    const seat = await useLock<Seat>("sandbox-seat");
    expect(seat.data).toEqual({ seat: 7, region: "eu" });
  });
});

test("early release lets the next waiter in sooner", async ({ useLock }) => {
  const report = await useLock("report-generator");
  expect(report.isLocked).toBe(true);

  // Done with the shared part — free it now instead of at test teardown.
  await report.release();
  expect(report.isLocked).toBe(false);

  // Slow, lock-free tail of the test; other tests can already take the lock.
  await new Promise((resolve) => setTimeout(resolve, 200));
});

test("unknown id resolves with undefined data", async ({ useLock }) => {
  const nothing = await useLock<Seat>("never-published");
  expect(nothing.isLocked).toBe(true);
  expect(nothing.data).toBeUndefined();
});
