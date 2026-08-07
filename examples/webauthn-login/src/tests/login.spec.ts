/**
 * Example: @playwright-labs/fixture-webauthn
 *
 * Drives the fake passkey login page in ../../index.html through a real
 * virtual authenticator — register a passkey, then sign in with it, using
 * only page locators (no page.evaluate hacking). This is the pattern for
 * testing your own passkey-enabled login page.
 */
import { expect, test } from "@playwright-labs/fixture-webauthn";

test.beforeEach(async ({ webauthn }) => {
  await webauthn.enable();
  await webauthn.addVirtualAuthenticator({
    protocol: "ctap2",
    transport: "internal",
    hasResidentKey: true,
    hasUserVerification: true,
    isUserVerified: true,
  });
});

test("register then sign in with a passkey", async ({ page, webauthn }) => {
  await page.goto("/");

  await page.getByLabel("Username").fill("alice");

  const [addedEvent] = await Promise.all([
    webauthn.waitForCredentialAdded(),
    page.getByRole("button", { name: "Register passkey" }).click(),
  ]);
  await expect(page.locator("#status")).toHaveText(
    'Registered a passkey for "alice"',
  );
  expect(addedEvent.credential.isResidentCredential).toBe(true);

  const [assertedEvent] = await Promise.all([
    webauthn.waitForCredentialAsserted(),
    page.getByRole("button", { name: "Sign in with passkey" }).click(),
  ]);
  await expect(page.locator("#status")).toHaveText("Welcome back, alice!");
  expect(assertedEvent.credential.credentialId).toBe(
    addedEvent.credential.credentialId,
  );

  const authenticator = webauthn.authenticators[0];
  await expect(authenticator).toHaveCredentials(1);
});

test("signing in without a registered passkey shows an error", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel("Username").fill("nobody");
  await page.getByRole("button", { name: "Sign in with passkey" }).click();

  await expect(page.locator("#status")).toHaveText(
    'No passkey found for "nobody"',
  );
  await expect(page.locator("#status")).toHaveAttribute("data-state", "error");
});

test("two users can each register and sign in with their own passkey", async ({
  page,
  webauthn,
}) => {
  await page.goto("/");

  for (const username of ["alice", "bob"]) {
    await page.getByLabel("Username").fill(username);
    await page.getByRole("button", { name: "Register passkey" }).click();
    await expect(page.locator("#status")).toHaveText(
      `Registered a passkey for "${username}"`,
    );
  }

  expect(webauthn).toHaveVirtualAuthenticators(1);
  await expect(webauthn.authenticators[0]).toHaveCredentials(2);

  for (const username of ["bob", "alice"]) {
    await page.getByLabel("Username").fill(username);
    await page.getByRole("button", { name: "Sign in with passkey" }).click();
    await expect(page.locator("#status")).toHaveText(
      `Welcome back, ${username}!`,
    );
  }
});
