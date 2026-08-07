import {
  test as baseTest,
  expect as baseExpect,
  type Page,
} from "@playwright/test";

import { WebAuthn } from "./webauthn.js";
import type { VirtualAuthenticator } from "./virtual-authenticator.js";

/**
 * Creates a {@link WebAuthn} controller bound to a page's CDP session.
 * Defaults to the test's own `page`; pass another `Page` (e.g. a popup)
 * to control WebAuthn there instead.
 *
 * Every `WebAuthn` created this way is disposed automatically after the
 * test, even on failure.
 */
export type UseWebAuthn = (page?: Page) => Promise<WebAuthn>;

export type Fixture = {
  useWebAuthn: UseWebAuthn;

  /**
   * A ready-to-use {@link WebAuthn} controller bound to the test's `page`.
   *
   * @example
   * ```ts
   * test('passkey login', async ({ page, webauthn }) => {
   *   await webauthn.enable();
   *   const authenticator = await webauthn.addVirtualAuthenticator({
   *     protocol: 'ctap2',
   *     transport: 'internal',
   *     hasResidentKey: true,
   *     hasUserVerification: true,
   *     isUserVerified: true,
   *   });
   *
   *   await page.goto('/login');
   *   await page.getByRole('button', { name: 'Sign in with a passkey' }).click();
   *   await webauthn.waitForCredentialAsserted();
   * });
   * ```
   */
  webauthn: WebAuthn;
};

export const test = baseTest.extend<Fixture>({
  useWebAuthn: async ({ page, context }, use) => {
    const created: WebAuthn[] = [];

    const useWebAuthn: UseWebAuthn = async (target = page) => {
      let session;
      try {
        session = await context.newCDPSession(target);
      } catch (cause) {
        throw new Error(
          "@playwright-labs/fixture-webauthn requires Chromium — the CDP " +
            '"WebAuthn" domain used to simulate a virtual authenticator is ' +
            "not available in other browsers.",
          { cause },
        );
      }
      const webauthn = new WebAuthn(session);
      created.push(webauthn);
      return webauthn;
    };

    await use(useWebAuthn);

    await Promise.all(created.map((webauthn) => webauthn.dispose()));
  },

  webauthn: async ({ useWebAuthn }, use) => {
    await use(await useWebAuthn());
  },
});

export const expect = baseExpect.extend({
  /**
   * Asserts that `webauthn.enable()` has been called (and `disable()`
   * hasn't since).
   *
   * @example
   * ```ts
   * await webauthn.enable();
   * expect(webauthn).toBeWebAuthnEnabled();
   * ```
   */
  toBeWebAuthnEnabled(received: WebAuthn) {
    const pass = received.isEnabled === true;
    return {
      pass,
      message: () =>
        pass
          ? "Expected WebAuthn domain not to be enabled, but it was"
          : "Expected WebAuthn domain to be enabled, but it was not — call webauthn.enable() first",
    };
  },

  /**
   * Asserts on the number of virtual authenticators currently registered
   * on a `WebAuthn` instance.
   *
   * @example
   * ```ts
   * await webauthn.addVirtualAuthenticator({ protocol: 'ctap2', transport: 'internal' });
   * expect(webauthn).toHaveVirtualAuthenticators(1);
   * ```
   */
  toHaveVirtualAuthenticators(received: WebAuthn, count: number) {
    const actual = received.authenticators.length;
    const pass = actual === count;
    return {
      pass,
      expected: count,
      actual,
      message: () =>
        `Expected WebAuthn to have ${this.utils.printExpected(count)} virtual authenticator(s), got ${this.utils.printReceived(actual)}`,
    };
  },

  /**
   * Asserts on the number of credentials currently stored on a
   * `VirtualAuthenticator`.
   *
   * @example
   * ```ts
   * await expect(authenticator).toHaveCredentials(1);
   * ```
   */
  async toHaveCredentials(received: VirtualAuthenticator, count: number) {
    const credentials = await received.getCredentials();
    const pass = credentials.length === count;
    return {
      pass,
      expected: count,
      actual: credentials.length,
      message: () =>
        `Expected authenticator "${received.id}" to have ${this.utils.printExpected(count)} credential(s), got ${this.utils.printReceived(credentials.length)}`,
    };
  },

  /**
   * Asserts that a specific credential id is stored on a
   * `VirtualAuthenticator`.
   *
   * @example
   * ```ts
   * await expect(authenticator).toHaveCredential(credentialId);
   * ```
   */
  async toHaveCredential(received: VirtualAuthenticator, credentialId: string) {
    const credentials = await received.getCredentials();
    const ids = credentials.map((credential) => credential.credentialId);
    const pass = ids.includes(credentialId);
    return {
      pass,
      expected: credentialId,
      actual: ids,
      message: () =>
        pass
          ? `Expected authenticator "${received.id}" not to have credential ${this.utils.printExpected(credentialId)}, but it did`
          : `Expected authenticator "${received.id}" to have credential ${this.utils.printExpected(credentialId)}, got ${this.utils.printReceived(ids)}`,
    };
  },
});
