export { expect, test, type Fixture, type UseWebAuthn } from "./fixture.js";
export { WebAuthn } from "./webauthn.js";
export {
  VirtualAuthenticator,
  VirtualAuthenticatorArray,
  matchesCredentialFilter,
} from "./virtual-authenticator.js";
export { isCredential } from "./types.js";
export type {
  AuthenticatorProtocol,
  AuthenticatorTransport,
  Credential,
  CredentialAddedEvent,
  CredentialAssertedEvent,
  CredentialDeletedEvent,
  CredentialExport,
  CredentialFilter,
  CredentialProperties,
  CredentialUpdatedEvent,
  Ctap2Version,
  EnableOptions,
  ResponseOverrideBits,
  VirtualAuthenticatorOptions,
  WaitForEventOptions,
} from "./types.js";
