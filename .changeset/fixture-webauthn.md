---
"@playwright-labs/fixture-webauthn": minor
---

Initial release of the WebAuthn/passkey fixture package. Provides the `webauthn` fixture and `useWebAuthn()` factory — drive a virtual FIDO2/U2F authenticator over the Chrome DevTools Protocol `WebAuthn` domain to test passkey registration and login end to end, with no real security key and no mocking of `navigator.credentials`. Includes `VirtualAuthenticator` for credential CRUD, `waitForCredentialAdded`/`waitForCredentialAsserted`/`waitForCredentialUpdated`/`waitForCredentialDeleted` event waiters, and `toBeWebAuthnEnabled`/`toHaveVirtualAuthenticators`/`toHaveCredentials`/`toHaveCredential` matchers.
