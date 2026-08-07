import { randomBytes } from "node:crypto";

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
