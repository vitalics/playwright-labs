---
"@playwright-labs/fixture-webauthn": minor
---

`toBeWebAuthnEnabled()` and `toHaveVirtualAuthenticators(count)` now also accept the `Page` a `WebAuthn` was created for (via `useWebAuthn(page)` or the `webauthn` fixture), not just the `WebAuthn` instance itself — handy when the instance isn't in scope where you're asserting.

```ts
test("passkey login", async ({ page, webauthn }) => {
  await webauthn.enable();
  await webauthn.addVirtualAuthenticator({ protocol: "ctap2", transport: "internal" });

  expect(page).toBeWebAuthnEnabled(); // same as expect(webauthn).toBeWebAuthnEnabled()
  expect(page).toHaveVirtualAuthenticators(1);
});
```

Throws a clear error if no `WebAuthn` was ever created for that page. If `useWebAuthn(page)` was called more than once for the same page, resolves to the most recently created `WebAuthn`.
