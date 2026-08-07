---
"@playwright-labs/fixture-webauthn": minor
---

Add `VirtualAuthenticator.exportCredentials()`/`importCredentials()` — export a credential's private key and metadata as a JSON-serializable snapshot, then seed it onto a fresh authenticator later. Lets tests register a passkey once and reuse it across runs (e.g. persisted to a file), instead of repeating the `navigator.credentials.create()` ceremony every time — the same idea as Playwright's own `storageState`, scoped to this fixture's virtual authenticators.
