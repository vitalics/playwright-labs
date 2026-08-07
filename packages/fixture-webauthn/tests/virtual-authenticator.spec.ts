import { expect, test } from "@playwright/test";

import { VirtualAuthenticator } from "../src/virtual-authenticator.js";
import { createFakeSession } from "./helpers/fake-cdp-session.js";

function setup() {
  const session = createFakeSession();
  const authenticator = new VirtualAuthenticator(
    session,
    "auth-1",
    async () => {},
  );
  return { session, authenticator };
}

test.describe("VirtualAuthenticator", () => {
  test("exposes its id", () => {
    const { authenticator } = setup();
    expect(authenticator.id).toBe("auth-1");
  });

  test("addCredential() sends the credential with the authenticator id", async () => {
    const { session, authenticator } = setup();
    session.onSend("WebAuthn.addCredential", () => ({}));
    const credential = {
      credentialId: "c1",
      isResidentCredential: true,
      privateKey: "key",
      signCount: 0,
    };

    await authenticator.addCredential(credential);

    expect(session.sentCommands).toEqual([
      {
        method: "WebAuthn.addCredential",
        params: { authenticatorId: "auth-1", credential },
      },
    ]);
  });

  test("getCredential() unwraps the response", async () => {
    const { session, authenticator } = setup();
    const credential = {
      credentialId: "c1",
      isResidentCredential: true,
      privateKey: "key",
      signCount: 0,
    };
    session.onSend("WebAuthn.getCredential", (params) => {
      expect(params).toEqual({ authenticatorId: "auth-1", credentialId: "c1" });
      return { credential };
    });

    await expect(authenticator.getCredential("c1")).resolves.toEqual(credential);
  });

  test("getCredentials() unwraps the response", async () => {
    const { session, authenticator } = setup();
    const credentials = [
      {
        credentialId: "c1",
        isResidentCredential: true,
        privateKey: "key",
        signCount: 0,
      },
    ];
    session.onSend("WebAuthn.getCredentials", (params) => {
      expect(params).toEqual({ authenticatorId: "auth-1" });
      return { credentials };
    });

    await expect(authenticator.getCredentials()).resolves.toEqual(credentials);
  });

  test("removeCredential() sends the credential id", async () => {
    const { session, authenticator } = setup();
    session.onSend("WebAuthn.removeCredential", () => ({}));

    await authenticator.removeCredential("c1");

    expect(session.sentCommands).toEqual([
      {
        method: "WebAuthn.removeCredential",
        params: { authenticatorId: "auth-1", credentialId: "c1" },
      },
    ]);
  });

  test("clearCredentials() sends only the authenticator id", async () => {
    const { session, authenticator } = setup();
    session.onSend("WebAuthn.clearCredentials", () => ({}));

    await authenticator.clearCredentials();

    expect(session.sentCommands).toEqual([
      { method: "WebAuthn.clearCredentials", params: { authenticatorId: "auth-1" } },
    ]);
  });

  test("setUserVerified() sends the flag", async () => {
    const { session, authenticator } = setup();
    session.onSend("WebAuthn.setUserVerified", () => ({}));

    await authenticator.setUserVerified(true);

    expect(session.sentCommands).toEqual([
      {
        method: "WebAuthn.setUserVerified",
        params: { authenticatorId: "auth-1", isUserVerified: true },
      },
    ]);
  });

  test("setAutomaticPresenceSimulation() sends the flag", async () => {
    const { session, authenticator } = setup();
    session.onSend("WebAuthn.setAutomaticPresenceSimulation", () => ({}));

    await authenticator.setAutomaticPresenceSimulation(false);

    expect(session.sentCommands).toEqual([
      {
        method: "WebAuthn.setAutomaticPresenceSimulation",
        params: { authenticatorId: "auth-1", enabled: false },
      },
    ]);
  });

  test("setCredentialProperties() merges ids and properties", async () => {
    const { session, authenticator } = setup();
    session.onSend("WebAuthn.setCredentialProperties", () => ({}));

    await authenticator.setCredentialProperties("c1", { backupState: true });

    expect(session.sentCommands).toEqual([
      {
        method: "WebAuthn.setCredentialProperties",
        params: { authenticatorId: "auth-1", credentialId: "c1", backupState: true },
      },
    ]);
  });

  test("setResponseOverrideBits() merges the authenticator id and overrides", async () => {
    const { session, authenticator } = setup();
    session.onSend("WebAuthn.setResponseOverrideBits", () => ({}));

    await authenticator.setResponseOverrideBits({ isBadUV: true });

    expect(session.sentCommands).toEqual([
      {
        method: "WebAuthn.setResponseOverrideBits",
        params: { authenticatorId: "auth-1", isBadUV: true },
      },
    ]);
  });

  test.describe("remove()", () => {
    test("delegates to the onRemove callback", async () => {
      const session = createFakeSession();
      let called = false;
      const authenticator = new VirtualAuthenticator(session, "auth-1", async () => {
        called = true;
      });

      await authenticator.remove();

      expect(called).toBe(true);
    });

    test("is exposed via Symbol.asyncDispose", async () => {
      const session = createFakeSession();
      let called = false;

      {
        await using _authenticator = new VirtualAuthenticator(
          session,
          "auth-1",
          async () => {
            called = true;
          },
        );
      }

      expect(called).toBe(true);
    });
  });
});
