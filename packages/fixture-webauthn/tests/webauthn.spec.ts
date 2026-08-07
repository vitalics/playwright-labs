import { expect, test } from "@playwright/test";

import { WebAuthn } from "../src/webauthn.js";
import { VirtualAuthenticator } from "../src/virtual-authenticator.js";
import { createFakeSession } from "./helpers/fake-cdp-session.js";

test.describe("WebAuthn", () => {
  test.describe("enable() / disable() / isEnabled", () => {
    test("starts disabled", () => {
      const webauthn = new WebAuthn(createFakeSession());
      expect(webauthn.isEnabled).toBe(false);
    });

    test("enable() sends WebAuthn.enable and flips isEnabled", async () => {
      const session = createFakeSession();
      session.onSend("WebAuthn.enable", () => ({}));
      const webauthn = new WebAuthn(session);

      await webauthn.enable({ enableUI: true });

      expect(webauthn.isEnabled).toBe(true);
      expect(session.sentCommands).toEqual([
        { method: "WebAuthn.enable", params: { enableUI: true } },
      ]);
    });

    test("enable() is idempotent", async () => {
      const session = createFakeSession();
      session.onSend("WebAuthn.enable", () => ({}));
      const webauthn = new WebAuthn(session);

      await webauthn.enable();
      await webauthn.enable();

      expect(session.sentCommands).toHaveLength(1);
    });

    test("disable() sends WebAuthn.disable, flips isEnabled, and clears authenticators", async () => {
      const session = createFakeSession();
      session.onSend("WebAuthn.enable", () => ({}));
      session.onSend("WebAuthn.disable", () => ({}));
      session.onSend("WebAuthn.addVirtualAuthenticator", () => ({
        authenticatorId: "auth-1",
      }));
      const webauthn = new WebAuthn(session);
      await webauthn.enable();
      await webauthn.addVirtualAuthenticator({
        protocol: "ctap2",
        transport: "internal",
      });

      await webauthn.disable();

      expect(webauthn.isEnabled).toBe(false);
      expect(webauthn.authenticators).toEqual([]);
      expect(session.sentCommands.at(-1)).toEqual({
        method: "WebAuthn.disable",
        params: undefined,
      });
    });

    test("disable() when not enabled is a no-op", async () => {
      const session = createFakeSession();
      const webauthn = new WebAuthn(session);

      await webauthn.disable();

      expect(session.sentCommands).toEqual([]);
    });
  });

  test.describe("addVirtualAuthenticator()", () => {
    test("throws a clear error when webauthn isn't enabled yet", async () => {
      const webauthn = new WebAuthn(createFakeSession());

      await expect(
        webauthn.addVirtualAuthenticator({
          protocol: "ctap2",
          transport: "internal",
        }),
      ).rejects.toThrow(/requires webauthn\.enable\(\) to be called first/);
    });

    test("sends the options and returns a tracked VirtualAuthenticator", async () => {
      const session = createFakeSession();
      session.onSend("WebAuthn.enable", () => ({}));
      session.onSend("WebAuthn.addVirtualAuthenticator", (params) => {
        expect(params).toEqual({
          options: {
            protocol: "ctap2",
            transport: "internal",
            hasResidentKey: true,
          },
        });
        return { authenticatorId: "auth-42" };
      });
      const webauthn = new WebAuthn(session);
      await webauthn.enable();

      const authenticator = await webauthn.addVirtualAuthenticator({
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
      });

      expect(authenticator).toBeInstanceOf(VirtualAuthenticator);
      expect(authenticator.id).toBe("auth-42");
      expect(webauthn.authenticators).toEqual([authenticator]);
    });
  });

  test.describe("removeVirtualAuthenticator()", () => {
    async function setupWithOneAuthenticator() {
      const session = createFakeSession();
      session.onSend("WebAuthn.enable", () => ({}));
      session.onSend("WebAuthn.addVirtualAuthenticator", () => ({
        authenticatorId: "auth-1",
      }));
      session.onSend("WebAuthn.removeVirtualAuthenticator", () => ({}));
      const webauthn = new WebAuthn(session);
      await webauthn.enable();
      const authenticator = await webauthn.addVirtualAuthenticator({
        protocol: "ctap2",
        transport: "internal",
      });
      return { session, webauthn, authenticator };
    }

    test("accepts an authenticator id", async () => {
      const { session, webauthn, authenticator } =
        await setupWithOneAuthenticator();

      await webauthn.removeVirtualAuthenticator(authenticator.id);

      expect(webauthn.authenticators).toEqual([]);
      expect(session.sentCommands.at(-1)).toEqual({
        method: "WebAuthn.removeVirtualAuthenticator",
        params: { authenticatorId: "auth-1" },
      });
    });

    test("accepts a VirtualAuthenticator instance", async () => {
      const { webauthn, authenticator } = await setupWithOneAuthenticator();

      await webauthn.removeVirtualAuthenticator(authenticator);

      expect(webauthn.authenticators).toEqual([]);
    });

    test("VirtualAuthenticator.remove() removes itself from webauthn.authenticators", async () => {
      const { webauthn, authenticator } = await setupWithOneAuthenticator();

      await authenticator.remove();

      expect(webauthn.authenticators).toEqual([]);
    });
  });

  test.describe("waitForCredential*()", () => {
    test("waitForCredentialAdded() resolves with the matching event payload", async () => {
      const session = createFakeSession();
      const webauthn = new WebAuthn(session);

      const promise = webauthn.waitForCredentialAdded();
      session.emit("WebAuthn.credentialAdded", {
        authenticatorId: "auth-1",
        credential: { credentialId: "c1" },
      });

      await expect(promise).resolves.toEqual({
        authenticatorId: "auth-1",
        credential: { credentialId: "c1" },
      });
    });

    test("filters by authenticatorId, ignoring events from other authenticators", async () => {
      const session = createFakeSession();
      const webauthn = new WebAuthn(session);

      const promise = webauthn.waitForCredentialAsserted({
        authenticatorId: "auth-target",
      });
      session.emit("WebAuthn.credentialAsserted", {
        authenticatorId: "auth-other",
        credential: { credentialId: "ignored" },
      });
      session.emit("WebAuthn.credentialAsserted", {
        authenticatorId: "auth-target",
        credential: { credentialId: "expected" },
      });

      await expect(promise).resolves.toMatchObject({
        authenticatorId: "auth-target",
        credential: { credentialId: "expected" },
      });
    });

    test("waitForCredentialUpdated() resolves with the matching event payload", async () => {
      const session = createFakeSession();
      const webauthn = new WebAuthn(session);

      const promise = webauthn.waitForCredentialUpdated();
      session.emit("WebAuthn.credentialUpdated", {
        authenticatorId: "auth-1",
        credential: { credentialId: "c1" },
      });

      await expect(promise).resolves.toEqual({
        authenticatorId: "auth-1",
        credential: { credentialId: "c1" },
      });
    });

    test("waitForCredentialDeleted() resolves with the matching event payload", async () => {
      const session = createFakeSession();
      const webauthn = new WebAuthn(session);

      const promise = webauthn.waitForCredentialDeleted();
      session.emit("WebAuthn.credentialDeleted", {
        authenticatorId: "auth-1",
        credentialId: "c1",
      });

      await expect(promise).resolves.toEqual({
        authenticatorId: "auth-1",
        credentialId: "c1",
      });
    });

    test("rejects on timeout and removes its listener", async () => {
      const session = createFakeSession();
      const webauthn = new WebAuthn(session);

      await expect(
        webauthn.waitForCredentialAdded({ timeoutMs: 20 }),
      ).rejects.toThrow(/Timed out after 20ms/);

      expect(session.listenerCount("WebAuthn.credentialAdded")).toBe(0);
    });

    test("removes its listener after resolving", async () => {
      const session = createFakeSession();
      const webauthn = new WebAuthn(session);

      const promise = webauthn.waitForCredentialAdded();
      session.emit("WebAuthn.credentialAdded", {
        authenticatorId: "auth-1",
        credential: { credentialId: "c1" },
      });
      await promise;

      expect(session.listenerCount("WebAuthn.credentialAdded")).toBe(0);
    });
  });

  test.describe("dispose()", () => {
    test("detaches the underlying CDP session", async () => {
      const session = createFakeSession();
      const webauthn = new WebAuthn(session);

      await webauthn.dispose();

      expect(session.detached).toBe(true);
    });

    test("is exposed via Symbol.asyncDispose", async () => {
      const session = createFakeSession();

      {
        await using _webauthn = new WebAuthn(session);
      }

      expect(session.detached).toBe(true);
    });
  });
});
