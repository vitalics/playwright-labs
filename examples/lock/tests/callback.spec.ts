import { currentLock, expect, test } from "@playwright-labs/fixture-lock";

type Account = { email: string };

// A helper deep in the call stack — it never receives the resource, it
// reads it from AsyncLocalStorage via currentLock().
async function signIn(): Promise<string> {
  const account = currentLock<Account>("billing-account");
  if (!account) throw new Error("signIn() must run inside useLock('billing-account', ...)");
  await new Promise((resolve) => setTimeout(resolve, 100));
  return `signed in as ${account.data?.email}`;
}

test("callback scopes the lock to one step", async ({ useLock }) => {
  const status = await useLock<Account, string>(
    { id: "billing-account", data: { email: "billing@example.com" } },
    () => signIn(),
  );
  expect(status).toBe("signed in as billing@example.com");

  // Released already — the rest of the test runs without holding it.
  expect(currentLock("billing-account")).toBeUndefined();
});

test("helpers fail loudly outside the lock", async () => {
  await expect(signIn()).rejects.toThrow("must run inside useLock");
});
