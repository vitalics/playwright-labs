export { expect, test, type Fixture, type UseWebAuthn } from "./fixture.js";
export { WebAuthn } from "./webauthn.js";
export { VirtualAuthenticator } from "./virtual-authenticator.js";
export type {
  AuthenticatorProtocol,
  AuthenticatorTransport,
  Credential,
  CredentialAddedEvent,
  CredentialAssertedEvent,
  CredentialDeletedEvent,
  CredentialExport,
  CredentialProperties,
  CredentialUpdatedEvent,
  Ctap2Version,
  EnableOptions,
  ResponseOverrideBits,
  VirtualAuthenticatorOptions,
  WaitForEventOptions,
} from "./types.js";
