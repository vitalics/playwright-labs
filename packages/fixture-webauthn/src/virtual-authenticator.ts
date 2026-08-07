import type { CDPSession } from "@playwright/test";

import type {
  Credential,
  CredentialExport,
  CredentialProperties,
  ResponseOverrideBits,
} from "./types.js";

const CREDENTIAL_EXPORT_VERSION = 1;

/**
 * A single virtual FIDO2/U2F authenticator created via
 * {@link WebAuthn.addVirtualAuthenticator}. Manages the credentials stored
 * on it and its simulated user-presence/user-verification behaviour.
 */
export class VirtualAuthenticator {
  #session: CDPSession;
  #onRemove: () => Promise<void>;

  /** The CDP-assigned id of this authenticator. */
  readonly id: string;

  constructor(session: CDPSession, id: string, onRemove: () => Promise<void>) {
    this.#session = session;
    this.id = id;
    this.#onRemove = onRemove;
  }

  /**
   * Registers a credential directly on the authenticator, without going
   * through `navigator.credentials.create()`. Useful for seeding a
   * "already logged in with a passkey" state.
   */
  async addCredential(credential: Credential): Promise<void> {
    await this.#session.send("WebAuthn.addCredential", {
      authenticatorId: this.id,
      credential,
    });
  }

  /** Fetches a single credential by id. */
  async getCredential(credentialId: string): Promise<Credential> {
    const { credential } = await this.#session.send("WebAuthn.getCredential", {
      authenticatorId: this.id,
      credentialId,
    });
    return credential;
  }

  /** Fetches every credential currently stored on this authenticator. */
  async getCredentials(): Promise<Credential[]> {
    const { credentials } = await this.#session.send("WebAuthn.getCredentials", {
      authenticatorId: this.id,
    });
    return credentials;
  }

  /** Removes a single credential by id. */
  async removeCredential(credentialId: string): Promise<void> {
    await this.#session.send("WebAuthn.removeCredential", {
      authenticatorId: this.id,
      credentialId,
    });
  }

  /** Removes every credential stored on this authenticator. */
  async clearCredentials(): Promise<void> {
    await this.#session.send("WebAuthn.clearCredentials", {
      authenticatorId: this.id,
    });
  }

  /**
   * Exports every credential on this authenticator — including private
   * keys — as a JSON-serializable snapshot. Write it to disk (or a
   * database, or Playwright's own `storageState`) to seed a passkey into a
   * later run via {@link importCredentials}, instead of repeating the
   * `navigator.credentials.create()` ceremony every time.
   *
   * @example
   * ```ts
   * const snapshot = await authenticator.exportCredentials();
   * await fs.writeFile('passkey.json', JSON.stringify(snapshot));
   * ```
   */
  async exportCredentials(): Promise<CredentialExport> {
    const credentials = await this.getCredentials();
    return { version: CREDENTIAL_EXPORT_VERSION, credentials };
  }

  /**
   * Seeds credentials previously produced by {@link exportCredentials} onto
   * this authenticator, without going through a `navigator.credentials.create()`
   * ceremony. Accepts the export object itself or its `JSON.stringify`'d form.
   *
   * @example
   * ```ts
   * const snapshot = JSON.parse(await fs.readFile('passkey.json', 'utf8'));
   * await authenticator.importCredentials(snapshot);
   * ```
   */
  async importCredentials(data: CredentialExport | string): Promise<void> {
    const snapshot: CredentialExport =
      typeof data === "string" ? JSON.parse(data) : data;
    if (snapshot.version !== CREDENTIAL_EXPORT_VERSION) {
      throw new Error(
        `Unsupported credential export version: ${snapshot.version}. Expected ${CREDENTIAL_EXPORT_VERSION}.`,
      );
    }
    await Promise.all(
      snapshot.credentials.map((credential) => this.addCredential(credential)),
    );
  }

  /** Sets whether user verification (biometrics/PIN) succeeds for this authenticator. */
  async setUserVerified(isUserVerified: boolean): Promise<void> {
    await this.#session.send("WebAuthn.setUserVerified", {
      authenticatorId: this.id,
      isUserVerified,
    });
  }

  /**
   * Sets whether tests of user presence resolve immediately (`true`, the
   * default) or hang until resolved another way (`false`) — useful for
   * simulating a user who never taps their security key.
   */
  async setAutomaticPresenceSimulation(enabled: boolean): Promise<void> {
    await this.#session.send("WebAuthn.setAutomaticPresenceSimulation", {
      authenticatorId: this.id,
      enabled,
    });
  }

  /** Updates backup-eligibility/backup-state/CMTG-key properties of a stored credential. */
  async setCredentialProperties(
    credentialId: string,
    properties: CredentialProperties,
  ): Promise<void> {
    await this.#session.send("WebAuthn.setCredentialProperties", {
      authenticatorId: this.id,
      credentialId,
      ...properties,
    });
  }

  /** Forces the next assertion's response to look bogus/bad-UV/bad-UP — for testing relying-party validation. */
  async setResponseOverrideBits(overrides: ResponseOverrideBits): Promise<void> {
    await this.#session.send("WebAuthn.setResponseOverrideBits", {
      authenticatorId: this.id,
      ...overrides,
    });
  }

  /** Removes this authenticator (and every credential on it) from the browser. */
  async remove(): Promise<void> {
    await this.#onRemove();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.remove();
  }
}
