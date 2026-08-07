import type { CDPSession } from "@playwright/test";

import {
  VirtualAuthenticator,
  VirtualAuthenticatorArray,
} from "./virtual-authenticator.js";
import type {
  EnableOptions,
  VirtualAuthenticatorOptions,
  WaitForEventOptions,
  WebAuthnEventMap,
} from "./types.js";

const DEFAULT_WAIT_TIMEOUT_MS = 30_000;

/**
 * Controls the Chrome DevTools Protocol `WebAuthn` domain for a single page.
 * Lets tests register and drive virtual FIDO2/U2F authenticators instead of
 * a real security key or platform authenticator.
 *
 * Get one via the `webauthn` fixture (bound to the test's `page`) or the
 * `useWebAuthn(page)` factory (for other pages/popups).
 */
export class WebAuthn implements AsyncDisposable {
  #session: CDPSession;
  #enabled = false;
  #authenticators = new Map<string, VirtualAuthenticator>();

  constructor(session: CDPSession) {
    this.#session = session;
  }

  /** Whether {@link enable} has been called (and {@link disable} hasn't since). */
  get isEnabled(): boolean {
    return this.#enabled;
  }

  /** Every virtual authenticator created via {@link addVirtualAuthenticator} that hasn't been removed. */
  get authenticators(): VirtualAuthenticatorArray {
    return new VirtualAuthenticatorArray(this.#authenticators.values());
  }

  /**
   * Enables the WebAuthn domain. Must be called before
   * {@link addVirtualAuthenticator}. Safe to call more than once.
   */
  async enable(options?: EnableOptions): Promise<void> {
    if (this.#enabled) return;
    await this.#session.send("WebAuthn.enable", {
      enableUI: options?.enableUI,
    });
    this.#enabled = true;
  }

  /**
   * Disables the WebAuthn domain. Every virtual authenticator created on
   * this session is forgotten. Safe to call more than once.
   */
  async disable(): Promise<void> {
    if (!this.#enabled) return;
    await this.#session.send("WebAuthn.disable");
    this.#enabled = false;
    this.#authenticators.clear();
  }

  /**
   * Creates and registers a virtual authenticator that the browser will use
   * to satisfy `navigator.credentials.create()` / `.get()` calls made by
   * the page.
   *
   * @throws if {@link enable} hasn't been called yet
   *
   * @example
   * ```ts
   * await webauthn.enable();
   * const authenticator = await webauthn.addVirtualAuthenticator({
   *   protocol: 'ctap2',
   *   transport: 'internal',
   *   hasResidentKey: true,
   *   hasUserVerification: true,
   *   isUserVerified: true,
   * });
   * ```
   */
  async addVirtualAuthenticator(
    options: VirtualAuthenticatorOptions,
  ): Promise<VirtualAuthenticator> {
    this.#assertEnabled("addVirtualAuthenticator");
    const { authenticatorId } = await this.#session.send(
      "WebAuthn.addVirtualAuthenticator",
      { options },
    );
    const authenticator = new VirtualAuthenticator(
      this.#session,
      authenticatorId,
      () => this.removeVirtualAuthenticator(authenticatorId),
    );
    this.#authenticators.set(authenticatorId, authenticator);
    return authenticator;
  }

  /** Removes a virtual authenticator (and every credential on it). Accepts an id or a {@link VirtualAuthenticator}. */
  async removeVirtualAuthenticator(
    authenticator: string | VirtualAuthenticator,
  ): Promise<void> {
    const id =
      typeof authenticator === "string" ? authenticator : authenticator.id;
    await this.#session.send("WebAuthn.removeVirtualAuthenticator", {
      authenticatorId: id,
    });
    this.#authenticators.delete(id);
  }

  /**
   * Resolves the next time any authenticator receives a new credential,
   * e.g. via `navigator.credentials.create()`.
   */
  waitForCredentialAdded(options?: WaitForEventOptions) {
    return this.#waitForEvent("WebAuthn.credentialAdded", options);
  }

  /**
   * Resolves the next time any authenticator asserts a credential,
   * e.g. via `navigator.credentials.get()`.
   */
  waitForCredentialAsserted(options?: WaitForEventOptions) {
    return this.#waitForEvent("WebAuthn.credentialAsserted", options);
  }

  /**
   * Resolves the next time a credential is updated, e.g. via
   * `PublicKeyCredential.signalCurrentUserDetails()`.
   */
  waitForCredentialUpdated(options?: WaitForEventOptions) {
    return this.#waitForEvent("WebAuthn.credentialUpdated", options);
  }

  /**
   * Resolves the next time a credential is deleted, e.g. via
   * `PublicKeyCredential.signalUnknownCredential()`.
   */
  waitForCredentialDeleted(options?: WaitForEventOptions) {
    return this.#waitForEvent("WebAuthn.credentialDeleted", options);
  }

  /**
   * Detaches the underlying CDP session. Called automatically by the
   * `webauthn`/`useWebAuthn` fixture after each test.
   */
  async dispose(): Promise<void> {
    await this.#session.detach().catch(() => {});
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.dispose();
  }

  #assertEnabled(method: string): void {
    if (!this.#enabled) {
      throw new Error(
        `webauthn.${method}() requires webauthn.enable() to be called first.`,
      );
    }
  }

  #waitForEvent<K extends keyof WebAuthnEventMap>(
    event: K,
    options?: WaitForEventOptions,
  ): Promise<WebAuthnEventMap[K]> {
    const { authenticatorId, timeoutMs = DEFAULT_WAIT_TIMEOUT_MS } =
      options ?? {};

    return new Promise<WebAuthnEventMap[K]>((resolve, reject) => {
      const onEvent = (payload: WebAuthnEventMap[K]) => {
        if (authenticatorId && payload.authenticatorId !== authenticatorId) {
          return;
        }
        clearTimeout(timer);
        this.#session.off(event, onEvent);
        resolve(payload);
      };
      const timer = setTimeout(() => {
        this.#session.off(event, onEvent);
        reject(
          new Error(`Timed out after ${timeoutMs}ms waiting for "${event}"`),
        );
      }, timeoutMs);
      this.#session.on(event, onEvent);
    });
  }
}
