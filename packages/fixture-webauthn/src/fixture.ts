import {
  test as baseTest,
  expect as baseExpect,
  type Page,
  type CDPSession,
  type Frame,
} from "@playwright/test";

import {
  WebAuthn,
  matchesCredentialFilter,
  type VirtualAuthenticator,
  type Credential,
  type CredentialFilter,
} from "@playwright-labs/webauthn";

/**
 * Creates a {@link WebAuthn} controller bound to a page's CDP session.
 * Defaults to the test's own `page`; pass another `Page` (e.g. a popup)
 * to control WebAuthn there instead.
 *
 * Every `WebAuthn` created this way is disposed automatically after the
 * test, even on failure.
 */
export type UseWebAuthn = (page?: Page | Frame) => Promise<WebAuthn>;

/** Tracks the most recent `WebAuthn` created for a given `Page` via `useWebAuthn`/the `webauthn` fixture, so matchers can accept either. */
const pageToWebAuthn = new WeakMap<Page | Frame, WebAuthn>();

function resolveWebAuthn(received: WebAuthn | Page | Frame): WebAuthn {
  if (received instanceof WebAuthn) return received;
  const webauthn = pageToWebAuthn.get(received);
  if (!webauthn) {
    throw new Error(
      "No WebAuthn instance found for this page/frame — call useWebAuthn(page) (or use the `webauthn` fixture) before asserting on it.",
    );
  }
  return webauthn;
}

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
      let session: CDPSession;
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
      pageToWebAuthn.set(target, webauthn);
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
   * hasn't since). Accepts a `WebAuthn` instance, or the `Page`/`Frame` it
   * was created for (via `useWebAuthn(page)`/the `webauthn` fixture).
   *
   * @example
   * ```ts
   * await webauthn.enable();
   * expect(webauthn).toBeWebAuthnEnabled();
   * expect(page).toBeWebAuthnEnabled(); // equivalent
   * ```
   */
  toBeWebAuthnEnabled(received: WebAuthn | Page | Frame) {
    const webauthn = resolveWebAuthn(received);
    const pass = webauthn.isEnabled === true;
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
   * on a `WebAuthn` instance. Accepts a `WebAuthn` instance, or the
   * `Page`/`Frame` it was created for (via `useWebAuthn(page)`/the
   * `webauthn` fixture).
   *
   * @example
   * ```ts
   * await webauthn.addVirtualAuthenticator({ protocol: 'ctap2', transport: 'internal' });
   * expect(webauthn).toHaveVirtualAuthenticators(1);
   * expect(page).toHaveVirtualAuthenticators(1); // equivalent
   * ```
   */
  toHaveVirtualAuthenticators(
    received: WebAuthn | Page | Frame,
    count: number,
  ) {
    const webauthn = resolveWebAuthn(received);
    const actual = webauthn.authenticators.length;
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

  /**
   * Asserts that a `VirtualAuthenticator` holds at least one credential
   * matching every given field — a partial match, unlike `toHaveCredential`'s
   * exact id check. Useful once an authenticator holds several users'
   * passkeys.
   *
   * @example
   * ```ts
   * await expect(authenticator).toMatchCredential({ userName: 'dave@example.com' });
   * ```
   */
  async toMatchCredential(
    received: VirtualAuthenticator,
    filter: CredentialFilter,
  ) {
    const credentials = await received.getCredentials();
    const pass = credentials.some((credential) =>
      matchesCredentialFilter(credential, filter),
    );
    return {
      pass,
      expected: filter,
      actual: credentials,
      message: () =>
        pass
          ? `Expected authenticator "${received.id}" not to have a credential matching ${this.utils.printExpected(filter)}, but it did`
          : `Expected authenticator "${received.id}" to have a credential matching ${this.utils.printExpected(filter)}, got ${this.utils.printReceived(credentials)}`,
    };
  },

  /**
   * Asserts that a `Credential`'s `signCount` is strictly less than the
   * given value — e.g. to check a passkey has never been asserted yet
   * (`toBeSignCountLessThan(1)`).
   */
  toBeSignCountLessThan(received: Credential, count: number) {
    const pass = received.signCount < count;
    return {
      pass,
      expected: count,
      actual: received.signCount,
      message: () =>
        pass
          ? `Expected credential signCount not to be less than ${this.utils.printExpected(count)}, got ${this.utils.printReceived(received.signCount)}`
          : `Expected credential signCount to be less than ${this.utils.printExpected(count)}, got ${this.utils.printReceived(received.signCount)}`,
    };
  },

  /** Asserts that a `Credential`'s `signCount` is less than or equal to the given value. */
  toBeSignCountLessThanOrEqual(received: Credential, count: number) {
    const pass = received.signCount <= count;
    return {
      pass,
      expected: count,
      actual: received.signCount,
      message: () =>
        pass
          ? `Expected credential signCount not to be less than or equal to ${this.utils.printExpected(count)}, got ${this.utils.printReceived(received.signCount)}`
          : `Expected credential signCount to be less than or equal to ${this.utils.printExpected(count)}, got ${this.utils.printReceived(received.signCount)}`,
    };
  },

  /**
   * Asserts that a `Credential`'s `signCount` is strictly greater than the
   * given value — e.g. to check a passkey has actually been asserted
   * (`toBeSignCountGreaterThan(0)`).
   */
  toBeSignCountGreaterThan(received: Credential, count: number) {
    const pass = received.signCount > count;
    return {
      pass,
      expected: count,
      actual: received.signCount,
      message: () =>
        pass
          ? `Expected credential signCount not to be greater than ${this.utils.printExpected(count)}, got ${this.utils.printReceived(received.signCount)}`
          : `Expected credential signCount to be greater than ${this.utils.printExpected(count)}, got ${this.utils.printReceived(received.signCount)}`,
    };
  },

  /** Asserts that a `Credential`'s `signCount` is greater than or equal to the given value. */
  toBeSignCountGreaterThanOrEqual(received: Credential, count: number) {
    const pass = received.signCount >= count;
    return {
      pass,
      expected: count,
      actual: received.signCount,
      message: () =>
        pass
          ? `Expected credential signCount not to be greater than or equal to ${this.utils.printExpected(count)}, got ${this.utils.printReceived(received.signCount)}`
          : `Expected credential signCount to be greater than or equal to ${this.utils.printExpected(count)}, got ${this.utils.printReceived(received.signCount)}`,
    };
  },
});
