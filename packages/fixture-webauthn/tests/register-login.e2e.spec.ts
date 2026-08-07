import { randomBytes } from "node:crypto";
import * as fs from "node:fs/promises";

import { expect, test } from "../src/fixture.js";

/**
 * These tests drive `navigator.credentials.create()` / `.get()` through the
 * demo page (`index.html`, served by `vite`) against a real virtual
 * authenticator — the same flow a real passkey-enabled login page exercises.
 */

function randomBase64url(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

declare global {
  interface Window {
    webauthnCreate(options: unknown): Promise<{
      id: string;
      type: string;
      rawId: string;
      response: { clientDataJSON: string; attestationObject: string };
    }>;
    webauthnGet(options: unknown): Promise<{
      id: string;
      type: string;
      rawId: string;
      response: { clientDataJSON: string; authenticatorData: string };
    }>;
  }
}

test.describe("register + login with a virtual passkey", () => {
  test("full round trip: create() then get() with the same authenticator", async ({
    page,
    webauthn,
  }) => {
    await webauthn.enable();
    const authenticator = await webauthn.addVirtualAuthenticator({
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    });

    await page.goto("/");
    await page.waitForFunction(() => typeof window.webauthnCreate === "function");

    const [addedEvent, credential] = await Promise.all([
      webauthn.waitForCredentialAdded(),
      page.evaluate(
        (options) => window.webauthnCreate(options),
        {
          challenge: randomBase64url(),
          rp: { name: "fixture-webauthn demo", id: "localhost" },
          user: {
            id: randomBase64url(16),
            name: "alice@example.com",
            displayName: "Alice",
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          authenticatorSelection: {
            residentKey: "required",
            userVerification: "required",
          },
          attestation: "none",
        },
      ),
    ]);

    expect(credential.type).toBe("public-key");
    expect(credential.id).toBeTruthy();
    expect(addedEvent.authenticatorId).toBe(authenticator.id);
    await expect(authenticator).toHaveCredentials(1);
    await expect(authenticator).toHaveCredential(
      (await authenticator.getCredentials())[0].credentialId,
    );

    const [assertedEvent, assertion] = await Promise.all([
      webauthn.waitForCredentialAsserted(),
      page.evaluate(
        (options) => window.webauthnGet(options),
        {
          challenge: randomBase64url(),
          rpId: "localhost",
          allowCredentials: [{ type: "public-key", id: credential.rawId }],
          userVerification: "required",
        },
      ),
    ]);

    expect(assertion.id).toBe(credential.id);
    expect(assertedEvent.authenticatorId).toBe(authenticator.id);
    expect(assertedEvent.credential.signCount).toBeGreaterThan(0);
  });

  test("export a credential and re-import it into a fresh authenticator, then sign in with it", async ({
    page,
    webauthn,
  }) => {
    await webauthn.enable();
    const original = await webauthn.addVirtualAuthenticator({
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    });

    await page.goto("/");
    await page.waitForFunction(() => typeof window.webauthnCreate === "function");

    const [, credential] = await Promise.all([
      webauthn.waitForCredentialAdded(),
      page.evaluate(
        (options) => window.webauthnCreate(options),
        {
          challenge: randomBase64url(),
          rp: { name: "fixture-webauthn demo", id: "localhost" },
          user: {
            id: randomBase64url(16),
            name: "carol@example.com",
            displayName: "Carol",
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          authenticatorSelection: {
            residentKey: "required",
            userVerification: "required",
          },
          attestation: "none",
        },
      ),
    ]);

    // Simulate persisting the passkey between test runs.
    const exported = await original.exportCredentials();
    await original.remove();

    // A brand new authenticator — as if this were a fresh run/machine.
    const restored = await webauthn.addVirtualAuthenticator({
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    });
    await restored.importCredentials(JSON.parse(JSON.stringify(exported)));
    await expect(restored).toHaveCredentials(1);

    const [assertedEvent, assertion] = await Promise.all([
      webauthn.waitForCredentialAsserted(),
      page.evaluate(
        (options) => window.webauthnGet(options),
        {
          challenge: randomBase64url(),
          rpId: "localhost",
          allowCredentials: [{ type: "public-key", id: credential.rawId }],
          userVerification: "required",
        },
      ),
    ]);

    expect(assertion.id).toBe(credential.id);
    expect(assertedEvent.authenticatorId).toBe(restored.id);
  });

  test("persists a passkey to a real file and imports it back in a later run", async ({
    page,
    webauthn,
  }, testInfo) => {
    const passkeyFile = testInfo.outputPath("passkey.json");

    await webauthn.enable();
    const original = await webauthn.addVirtualAuthenticator({
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    });

    await page.goto("/");
    await page.waitForFunction(() => typeof window.webauthnCreate === "function");

    const [, credential] = await Promise.all([
      webauthn.waitForCredentialAdded(),
      page.evaluate(
        (options) => window.webauthnCreate(options),
        {
          challenge: randomBase64url(),
          rp: { name: "fixture-webauthn demo", id: "localhost" },
          user: {
            id: randomBase64url(16),
            name: "dave@example.com",
            displayName: "Dave",
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          authenticatorSelection: {
            residentKey: "required",
            userVerification: "required",
          },
          attestation: "none",
        },
      ),
    ]);

    // Write the passkey to a real file, as a test suite would between runs.
    await fs.writeFile(
      passkeyFile,
      JSON.stringify(await original.exportCredentials()),
    );
    await original.remove();

    // A later run: a fresh authenticator reads the same file back and signs in
    // with it — no navigator.credentials.create() this time.
    const restored = await webauthn.addVirtualAuthenticator({
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    });
    // No encoding — fs.readFile() resolves with a Buffer here.
    await restored.importCredentials(await fs.readFile(passkeyFile));
    await expect(restored).toHaveCredentials(1);

    const [assertedEvent, assertion] = await Promise.all([
      webauthn.waitForCredentialAsserted(),
      page.evaluate(
        (options) => window.webauthnGet(options),
        {
          challenge: randomBase64url(),
          rpId: "localhost",
          allowCredentials: [{ type: "public-key", id: credential.rawId }],
          userVerification: "required",
        },
      ),
    ]);

    expect(assertion.id).toBe(credential.id);
    expect(assertedEvent.authenticatorId).toBe(restored.id);
  });

  test("registration rejects when the (simulated) user never confirms presence", async ({
    page,
    webauthn,
  }) => {
    await webauthn.enable();
    await webauthn.addVirtualAuthenticator({
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      // The user never taps their key — presence never resolves.
      automaticPresenceSimulation: false,
    });

    await page.goto("/");
    await page.waitForFunction(() => typeof window.webauthnCreate === "function");

    await expect(
      page.evaluate(
        (options) => window.webauthnCreate(options),
        {
          challenge: randomBase64url(),
          rp: { name: "fixture-webauthn demo", id: "localhost" },
          user: {
            id: randomBase64url(16),
            name: "bob@example.com",
            displayName: "Bob",
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          timeout: 1_000,
        },
      ),
    ).rejects.toThrow();
  });
});
