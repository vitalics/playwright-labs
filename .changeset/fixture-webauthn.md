---
"@playwright-labs/fixture-webauthn": major
---

Initial release of the WebAuthn/passkey fixture package. Provides the `webauthn` fixture and `useWebAuthn()` factory — drive a virtual FIDO2/U2F authenticator over the Chrome DevTools Protocol `WebAuthn` domain to test passkey registration and login end to end, with no real security key and no mocking of `navigator.credentials`. Includes `VirtualAuthenticator` for credential CRUD, `waitForCredentialAdded`/`waitForCredentialAsserted`/`waitForCredentialUpdated`/`waitForCredentialDeleted` event waiters, and `toBeWebAuthnEnabled`/`toHaveVirtualAuthenticators`/`toHaveCredentials`/`toHaveCredential` matchers.

```ts
import { test, expect } from '@playwright-labs/fixture-webauthn';

test('passkey login', async ({ page, webauthn }) => {
  await webauthn.enable();
  await webauthn.addVirtualAuthenticator({
    protocol: 'ctap2',
    transport: 'internal',
    hasResidentKey: true,
    hasUserVerification: true,
    isUserVerified: true,
  });

  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign in with a passkey' }).click();
  await webauthn.waitForCredentialAsserted();

  await expect(page.getByText('Welcome back')).toBeVisible();
});
```
