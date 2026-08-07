---
"@playwright-labs/fixture-webauthn": minor
---

`toBeWebAuthnEnabled()` and `toHaveVirtualAuthenticators(count)` now also accept the `Page`/`Frame` a `WebAuthn` was created for (via `useWebAuthn()` or the `webauthn` fixture), not just the `WebAuthn` instance itself — handy when the instance isn't in scope where you're asserting. `useWebAuthn()` itself also now accepts a `Frame`, not just a `Page` — useful when the passkey ceremony runs inside an iframe.

```ts
test("passkey login", async ({ page, webauthn }) => {
  await webauthn.enable();
  await webauthn.addVirtualAuthenticator({ protocol: "ctap2", transport: "internal" });

  expect(page).toBeWebAuthnEnabled(); // same as expect(webauthn).toBeWebAuthnEnabled()
  expect(page).toHaveVirtualAuthenticators(1);
});
```

Throws a clear error if no `WebAuthn` was ever created for it. If `useWebAuthn()` was called more than once for the same `Page`/`Frame`, resolves to the most recently created `WebAuthn`.
