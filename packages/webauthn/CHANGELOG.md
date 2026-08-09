# @playwright-labs/webauthn

## 1.0.0

### Major Changes

- 9d1115c: Initial release. Extracted the core WebAuthn/passkey primitives out of `@playwright-labs/fixture-webauthn` into their own dependency-light package (no `@playwright/test` peer dependency, just `playwright-core` for `CDPSession` typing):
  - `WebAuthn` — controls the CDP `WebAuthn` domain for a session: `enable()`/`disable()`, `addVirtualAuthenticator()`/`removeVirtualAuthenticator()`, the `authenticators` getter, and `waitForCredentialAdded`/`Asserted`/`Updated`/`Deleted` event waiters.
  - `VirtualAuthenticator` — credential CRUD (`addCredential`/`getCredential(s)`/`removeCredential`/`clearCredentials`), `exportCredentials()`/`importCredentials()` for persisting a passkey across runs, and authenticator behaviour controls (`setUserVerified`, `setAutomaticPresenceSimulation`, `setCredentialProperties`, `setResponseOverrideBits`).
  - `VirtualAuthenticatorArray` — the type of `webauthn.authenticators`; a real array plus `iter()`/`arr()`/`readonlyArr()`/`Symbol.asyncDispose`.
  - `matchesCredentialFilter()` and the `CredentialFilter` type for narrowing exports/imports by `credentialId`/`rpId`/`userName`/`userDisplayName`/`signCountMin`/`signCountMax`.
  - `isCredential()` — a structural type guard for validating untrusted/deserialized credential data.

  ```ts
  import { WebAuthn, VirtualAuthenticator } from "@playwright-labs/webauthn";
  ```

  `@playwright-labs/fixture-webauthn` now depends on this package for its implementation instead of bundling it directly; its own public API is unchanged.
