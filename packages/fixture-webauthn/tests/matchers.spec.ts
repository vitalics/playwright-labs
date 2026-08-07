import { test as baseTest } from "@playwright/test";

import { expect } from "../src/fixture.js";
import { WebAuthn } from "../src/webauthn.js";
import { VirtualAuthenticator } from "../src/virtual-authenticator.js";
import { createFakeSession } from "./helpers/fake-cdp-session.js";

baseTest.describe("custom matchers", () => {
  baseTest.describe("toBeWebAuthnEnabled", () => {
    baseTest("passes once enable() has been called", async () => {
      const session = createFakeSession();
      session.onSend("WebAuthn.enable", () => ({}));
      const webauthn = new WebAuthn(session);
      await webauthn.enable();

      expect(webauthn).toBeWebAuthnEnabled();
    });

    baseTest("fails (via .not) before enable() has been called", () => {
      const webauthn = new WebAuthn(createFakeSession());

      expect(webauthn).not.toBeWebAuthnEnabled();
    });
  });

  baseTest.describe("toHaveVirtualAuthenticators", () => {
    baseTest("counts registered authenticators", async () => {
      const session = createFakeSession();
      session.onSend("WebAuthn.enable", () => ({}));
      session.onSend("WebAuthn.addVirtualAuthenticator", () => ({
        authenticatorId: "auth-1",
      }));
      const webauthn = new WebAuthn(session);
      await webauthn.enable();

      expect(webauthn).toHaveVirtualAuthenticators(0);

      await webauthn.addVirtualAuthenticator({
        protocol: "ctap2",
        transport: "internal",
      });

      expect(webauthn).toHaveVirtualAuthenticators(1);
    });
  });

  baseTest.describe("toHaveCredentials / toHaveCredential", () => {
    function setupAuthenticatorWithCredentials(
      credentials: { credentialId: string }[],
    ) {
      const session = createFakeSession();
      session.onSend("WebAuthn.getCredentials", () => ({ credentials }));
      return new VirtualAuthenticator(session, "auth-1", async () => {});
    }

    baseTest("toHaveCredentials counts stored credentials", async () => {
      const authenticator = setupAuthenticatorWithCredentials([
        { credentialId: "c1" },
      ]);

      await expect(authenticator).toHaveCredentials(1);
    });

    baseTest("toHaveCredential finds a specific credential id", async () => {
      const authenticator = setupAuthenticatorWithCredentials([
        { credentialId: "c1" },
        { credentialId: "c2" },
      ]);

      await expect(authenticator).toHaveCredential("c2");
      await expect(authenticator).not.toHaveCredential("c3");
    });
  });
});
