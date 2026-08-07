import type { CDPSession } from "@playwright/test";

import { isCredential } from "./types.js";
import type {
  Credential,
  CredentialExport,
  CredentialFilter,
  CredentialProperties,
  ResponseOverrideBits,
} from "./types.js";

export function matchesCredentialFilter(
  credential: Credential,
  filter: CredentialFilter,
): boolean {
  if (filter.credentialId !== undefined) {
    if (credential.credentialId !== filter.credentialId) return false;
  }
  if (filter.rpId !== undefined) {
    if (credential.rpId !== filter.rpId) return false;
  }
  if (filter.userName !== undefined) {
    if (credential.userName !== filter.userName) return false;
  }
  if (filter.userDisplayName !== undefined) {
    if (credential.userDisplayName !== filter.userDisplayName) return false;
  }
  if (filter.signCountMin !== undefined) {
    if (credential.signCount < filter.signCountMin) return false;
  }
  if (filter.signCountMax !== undefined) {
    if (credential.signCount > filter.signCountMax) return false;
  }
  return true;
}

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
    const { credentials } = await this.#session.send(
      "WebAuthn.getCredentials",
      {
        authenticatorId: this.id,
      },
    );
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
   * Exports credentials on this authenticator — including private keys —
   * as a JSON-serializable snapshot. Write it to disk (or a database, or
   * Playwright's own `storageState`) to seed a passkey into a later run
   * via {@link importCredentials}, instead of repeating the
   * `navigator.credentials.create()` ceremony every time.
   *
   * @param filter - Only export credentials matching every given field —
   * e.g. `{ userName: 'dave@example.com' }` to export just Dave's passkey
   * out of an authenticator holding several users'. Omit to export all of
   * them.
   *
   * @example
   * ```ts
   * const snapshot = await authenticator.exportCredentials({ userName: 'dave@example.com' });
   * await fs.writeFile('Dave-localhost.json', JSON.stringify(snapshot));
   * ```
   */
  async exportCredentials(
    filter?: CredentialFilter,
  ): Promise<CredentialExport> {
    let credentials = await this.getCredentials();
    if (filter) {
      credentials = credentials.filter((credential) =>
        matchesCredentialFilter(credential, filter),
      );
    }
    return { version: CREDENTIAL_EXPORT_VERSION, credentials };
  }

  /**
   * Seeds credentials previously produced by {@link exportCredentials} onto
   * this authenticator, without going through a `navigator.credentials.create()`
   * ceremony. Accepts the export object itself, its `JSON.stringify`'d
   * string, or a `Buffer` — e.g. straight from `fs.readFile(path)` without
   * an encoding.
   *
   * @param filter - Only import credentials matching every given field —
   * useful when `data` is a shared snapshot holding several users' passkeys
   * and this authenticator should only get one of them. Omit to import all
   * of them.
   *
   * @example
   * ```ts
   * const data = await fs.readFile('passkey.json'); // a Buffer
   * await authenticator.importCredentials(data, { userName: 'dave@example.com' });
   * ```
   */
  async importCredentials(
    data: CredentialExport | string | Buffer,
    filter?: CredentialFilter,
  ): Promise<void> {
    let snapshot: CredentialExport;
    if (Buffer.isBuffer(data)) {
      snapshot = JSON.parse(data.toString("utf-8"));
    } else if (typeof data === "string") {
      snapshot = JSON.parse(data);
    } else {
      snapshot = data;
    }
    if (snapshot.version !== CREDENTIAL_EXPORT_VERSION) {
      throw new Error(
        `Unsupported credential export version: ${snapshot.version}. Expected ${CREDENTIAL_EXPORT_VERSION}.`,
      );
    }
    if (
      !Array.isArray(snapshot.credentials) ||
      !snapshot.credentials.every(isCredential)
    ) {
      throw new Error(
        "Malformed credential export: `credentials` must be an array of Credential objects.",
      );
    }
    const credentials = filter
      ? snapshot.credentials.filter((credential) =>
          matchesCredentialFilter(credential, filter),
        )
      : snapshot.credentials;
    await Promise.all(
      credentials.map((credential) => this.addCredential(credential)),
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
  async setResponseOverrideBits(
    overrides: ResponseOverrideBits,
  ): Promise<void> {
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
