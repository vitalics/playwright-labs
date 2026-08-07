---
"@playwright-labs/fixture-webauthn": patch
---

`webauthn.authenticators` now returns a `VirtualAuthenticatorArray` instead of a plain `VirtualAuthenticator[]`. It behaves like a real array — indexing, `.length`, `for...of`, `[...spread]`, `.map()`/`.filter()`/`.slice()` — and adds `iter()` (an `Iterable<VirtualAuthenticator>` alias for `[...array]`), `arr()`/`readonlyArr()` (typed views of the array itself), and `Symbol.asyncDispose` (removes every authenticator in it).

```ts
// Still a real array — indexing, .length, for...of, [...spread] all work as before.
for (const authenticator of webauthn.authenticators) {
  await expect(authenticator).toHaveCredentials(1);
}
expect(webauthn.authenticators).toHaveLength(2);

// New: dispose every authenticator in one shot.
{
  await using authenticators = webauthn.authenticators;
  // ... run assertions ...
} // each authenticator.remove() is called automatically here

// New: readonlyArr()/arr() when you want a typed view instead of the class itself.
function assertNoDuplicateIds(authenticators: readonly VirtualAuthenticator[]) {
  /* ... */
}
assertNoDuplicateIds(webauthn.authenticators.readonlyArr());
```
