/**
 * Hand-written types for the Chrome DevTools Protocol `WebAuthn` domain —
 * see https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/.
 *
 * Deliberately not sourced from `devtools-protocol` (which tracks a newer,
 * unreleased Chromium revision than the one Playwright bundles) or from
 * `playwright-core`'s own bundled protocol types (an unlisted, internal
 * import path). Keeping our own copy in sync with the stable, documented
 * subset of the domain avoids depending on either package's exact version.
 */

/** `'u2f'` or `'ctap2'` — the protocol the virtual authenticator speaks. */
export type AuthenticatorProtocol = "u2f" | "ctap2";

/** CTAP2 version advertised by the virtual authenticator. Ignored for `protocol: 'u2f'`. */
export type Ctap2Version = "ctap2_0" | "ctap2_1";

/** Transport advertised by the virtual authenticator. */
export type AuthenticatorTransport =
  | "usb"
  | "nfc"
  | "ble"
  | "cable"
  | "internal";

/** Options passed to {@link WebAuthn.addVirtualAuthenticator}. */
export interface VirtualAuthenticatorOptions {
  protocol: AuthenticatorProtocol;
  /** Defaults to `'ctap2_0'`. Ignored if `protocol === 'u2f'`. */
  ctap2Version?: Ctap2Version;
  transport: AuthenticatorTransport;
  /** Defaults to `false`. */
  hasResidentKey?: boolean;
  /** Defaults to `false`. */
  hasUserVerification?: boolean;
  /**
   * Supports the largeBlob extension (https://w3c.github.io/webauthn#largeBlob).
   * Defaults to `false`.
   */
  hasLargeBlob?: boolean;
  /**
   * Supports the credBlob extension.
   * Defaults to `false`.
   */
  hasCredBlob?: boolean;
  /**
   * Supports the minPinLength extension.
   * Defaults to `false`.
   */
  hasMinPinLength?: boolean;
  /**
   * Supports the prf extension (https://w3c.github.io/webauthn/#prf-extension).
   * Defaults to `false`.
   */
  hasPrf?: boolean;
  /**
   * If `true`, tests of user presence succeed immediately. Otherwise they
   * never resolve. Defaults to `true`.
   */
  automaticPresenceSimulation?: boolean;
  /** Whether user verification succeeds for this authenticator. Defaults to `false`. */
  isUserVerified?: boolean;
  /**
   * Credentials created by this authenticator get the backup-eligibility
   * (BE) flag set to this value. Defaults to `false`.
   */
  defaultBackupEligibility?: boolean;
  /**
   * Credentials created by this authenticator get the backup-state (BS)
   * flag set to this value. Defaults to `false`.
   */
  defaultBackupState?: boolean;
}

/** A WebAuthn credential stored on a virtual authenticator. */
export interface Credential {
  /** Base64-encoded credential id. */
  credentialId: string;
  isResidentCredential: boolean;
  /** Relying Party ID the credential is scoped to. Must be set when adding a credential. */
  rpId?: string;
  /** The ECDSA P-256 private key in PKCS#8 format, base64-encoded. */
  privateKey: string;
  /** Base64-encoded opaque byte sequence (max 64 bytes) mapping the credential to a user. */
  userHandle?: string;
  /** Signature counter, incremented on each successful assertion. */
  signCount: number;
  /** Base64-encoded large blob associated with the credential. */
  largeBlob?: string;
  /** Backup-eligibility (BE) flag for assertions. Defaults to the authenticator's `defaultBackupEligibility`. */
  backupEligibility?: boolean;
  /** Backup-state (BS) flag for assertions. Defaults to the authenticator's `defaultBackupState`. */
  backupState?: boolean;
  /** The credential's `user.name`. */
  userName?: string;
  /** The credential's `user.displayName`. */
  userDisplayName?: string;
}

/** Options accepted by {@link VirtualAuthenticator.setCredentialProperties}. */
export interface CredentialProperties {
  backupEligibility?: boolean;
  backupState?: boolean;
}

/** Options accepted by {@link VirtualAuthenticator.setResponseOverrideBits}. */
export interface ResponseOverrideBits {
  /** Overrides the signature in the authenticator response to be zero. Defaults to `false`. */
  isBogusSignature?: boolean;
  /** Overrides the UV bit in the response flags to zero. Defaults to `false`. */
  isBadUV?: boolean;
  /** Overrides the UP bit in the response flags to zero. Defaults to `false`. */
  isBadUP?: boolean;
}

/** Options accepted by {@link WebAuthn.enable}. */
export interface EnableOptions {
  /**
   * Whether to enable the WebAuthn user interface. Recommended for
   * debugging/demos; disabled (the default) is recommended for automated
   * testing.
   */
  enableUI?: boolean;
}

/** Payload of the `WebAuthn.credentialAdded` event — a credential was added to an authenticator. */
export interface CredentialAddedEvent {
  authenticatorId: string;
  credential: Credential;
}

/** Payload of the `WebAuthn.credentialAsserted` event — a credential was used in an assertion. */
export interface CredentialAssertedEvent {
  authenticatorId: string;
  credential: Credential;
}

/** Payload of the `WebAuthn.credentialUpdated` event — e.g. via `PublicKeyCredential.signalCurrentUserDetails()`. */
export interface CredentialUpdatedEvent {
  authenticatorId: string;
  credential: Credential;
}

/** Payload of the `WebAuthn.credentialDeleted` event — e.g. via `PublicKeyCredential.signalUnknownCredential()`. */
export interface CredentialDeletedEvent {
  authenticatorId: string;
  credentialId: string;
}

export type WebAuthnEventMap = {
  "WebAuthn.credentialAdded": CredentialAddedEvent;
  "WebAuthn.credentialAsserted": CredentialAssertedEvent;
  "WebAuthn.credentialUpdated": CredentialUpdatedEvent;
  "WebAuthn.credentialDeleted": CredentialDeletedEvent;
};

/** Options accepted by every `waitForCredential*` method. */
export interface WaitForEventOptions {
  /** Only resolve for events belonging to this authenticator (id or {@link VirtualAuthenticator} instance). */
  authenticatorId?: string;
  /** Milliseconds to wait before rejecting. Defaults to `30_000`. */
  timeoutMs?: number;
}

/**
 * JSON-serializable snapshot produced by {@link VirtualAuthenticator.exportCredentials}
 * and consumed by {@link VirtualAuthenticator.importCredentials}. Carries the
 * credentials' private keys, so treat it like any other secret (e.g. a
 * storage state file) — anyone with it can assert as that user.
 */
export interface CredentialExport {
  version: 1;
  credentials: Credential[];
}
