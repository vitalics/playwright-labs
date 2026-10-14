import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { expect, test } from "@playwright-labs/fixture-lock";

type Account = { email: string; password: string };

const ACCOUNT_ID = "admin-account";

// A marker file that only the current lock holder may create. `wx` fails
// if the file already exists, so if two tests ever held the lock at the
// same time, the second one would throw here.
const holderMarker = path.join(os.tmpdir(), `lock-example-${ACCOUNT_ID}.holder`);

async function withExclusiveMarker(work: () => Promise<void>) {
  await fs.writeFile(holderMarker, String(process.pid), { flag: "wx" });
  try {
    await work();
  } finally {
    await fs.rm(holderMarker, { force: true });
  }
}

// Four tests, four workers, one account. They run in parallel but take
// turns on the account: each `useLock` waits until the previous holder
// releases.
for (const name of ["changes profile", "changes avatar", "changes locale", "changes timezone"]) {
  test(`admin ${name}`, async ({ useLock }) => {
    // Every test passes the same data; the first one to acquire publishes
    // it, later ones get the published copy (first writer wins).
    const account = await useLock<Account>({
      id: ACCOUNT_ID,
      data: { email: "admin@example.com", password: "secret" },
    });

    expect(account.isLocked).toBe(true);
    expect(account.data?.email).toBe("admin@example.com");

    await withExclusiveMarker(async () => {
      // Simulate work on the shared account — e.g. a UI flow that would
      // break if another test logged in with the same user concurrently.
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    // No explicit release — the fixture releases after the test.
  });
}
