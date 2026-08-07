---
"@playwright-labs/fixture-webauthn": minor
---

Add `VirtualAuthenticator.exportCredentials()`/`importCredentials()` — export a credential's private key and metadata as a JSON-serializable snapshot, then seed it onto a fresh authenticator later. Lets tests register a passkey once and reuse it across runs (e.g. persisted to a file), instead of repeating the `navigator.credentials.create()` ceremony every time — the same idea as Playwright's own `storageState`, scoped to this fixture's virtual authenticators.

Both methods accept an optional `CredentialFilter` (`{ credentialId?, rpId?, userName?, userDisplayName?, signCountMin?, signCountMax? }`) to narrow which credentials are exported/imported — e.g. `authenticator.exportCredentials({ userName: 'dave@example.com' })` to pull just one user's passkey out of an authenticator holding several, or to import only one user's passkey out of a snapshot shared across a test suite.

`importCredentials()` validates the snapshot's `credentials` with the new exported `isCredential(value): value is Credential` structural type guard before seeding anything, throwing a clear error on a malformed/corrupted file instead of forwarding garbage to the browser. Unlike a `Symbol` brand, this survives `JSON.stringify`/`JSON.parse`.

Also adds matchers: `toMatchCredential(filter)` for asserting a credential matching a `CredentialFilter` exists on an authenticator, and `toBeSignCountLessThan`/`toBeSignCountLessThanOrEqual`/`toBeSignCountGreaterThan`/`toBeSignCountGreaterThanOrEqual` for asserting on a specific `Credential`'s usage count directly.
