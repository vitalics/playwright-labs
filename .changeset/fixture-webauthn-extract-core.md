---
"@playwright-labs/fixture-webauthn": patch
---

Internal refactor: `WebAuthn`, `VirtualAuthenticator`, `VirtualAuthenticatorArray`, `matchesCredentialFilter`, `isCredential`, and the credential/authenticator types now live in the new `@playwright-labs/webauthn` package and are re-exported from here. No change to this package's public API — `import { test, expect, WebAuthn, ... } from "@playwright-labs/fixture-webauthn"` keeps working exactly as before.
