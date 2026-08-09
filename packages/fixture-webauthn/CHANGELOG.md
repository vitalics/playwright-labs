# @playwright-labs/fixture-webauthn

## 1.1.1

### Patch Changes

- 9d1115c: Internal refactor: `WebAuthn`, `VirtualAuthenticator`, `VirtualAuthenticatorArray`, `matchesCredentialFilter`, `isCredential`, and the credential/authenticator types now live in the new `@playwright-labs/webauthn` package and are re-exported from here. No change to this package's public API — `import { test, expect, WebAuthn, ... } from "@playwright-labs/fixture-webauthn"` keeps working exactly as before.
- Updated dependencies [9d1115c]
  - @playwright-labs/webauthn@1.0.0

## 1.1.0

### Minor Changes

- 6491330: Add `VirtualAuthenticator.exportCredentials()`/`importCredentials()` — export a credential's private key and metadata as a JSON-serializable snapshot, then seed it onto a fresh authenticator later. Lets tests register a passkey once and reuse it across runs (e.g. persisted to a file), instead of repeating the `navigator.credentials.create()` ceremony every time — the same idea as Playwright's own `storageState`, scoped to this fixture's virtual authenticators.

  Both methods accept an optional `CredentialFilter` (`{ credentialId?, rpId?, userName?, userDisplayName?, signCountMin?, signCountMax? }`) to narrow which credentials are exported/imported — e.g. `authenticator.exportCredentials({ userName: 'dave@example.com' })` to pull just one user's passkey out of an authenticator holding several, or to import only one user's passkey out of a snapshot shared across a test suite.

  `importCredentials()` validates the snapshot's `credentials` with the new exported `isCredential(value): value is Credential` structural type guard before seeding anything, throwing a clear error on a malformed/corrupted file instead of forwarding garbage to the browser. Unlike a `Symbol` brand, this survives `JSON.stringify`/`JSON.parse`.

  `importCredentials()` also now accepts a `Buffer` directly — e.g. `fs.readFile(path)` with no encoding — no need to add `'utf8'` yourself.

  Also adds matchers: `toMatchCredential(filter)` for asserting a credential matching a `CredentialFilter` exists on an authenticator, and `toBeSignCountLessThan`/`toBeSignCountLessThanOrEqual`/`toBeSignCountGreaterThan`/`toBeSignCountGreaterThanOrEqual` for asserting on a specific `Credential`'s usage count directly.

- cd40859: `toBeWebAuthnEnabled()` and `toHaveVirtualAuthenticators(count)` now also accept the `Page`/`Frame` a `WebAuthn` was created for (via `useWebAuthn()` or the `webauthn` fixture), not just the `WebAuthn` instance itself — handy when the instance isn't in scope where you're asserting. `useWebAuthn()` itself also now accepts a `Frame`, not just a `Page` — useful when the passkey ceremony runs inside an iframe.

  ```ts
  test("passkey login", async ({ page, webauthn }) => {
    await webauthn.enable();
    await webauthn.addVirtualAuthenticator({
      protocol: "ctap2",
      transport: "internal",
    });

    expect(page).toBeWebAuthnEnabled(); // same as expect(webauthn).toBeWebAuthnEnabled()
    expect(page).toHaveVirtualAuthenticators(1);
  });
  ```

  Throws a clear error if no `WebAuthn` was ever created for it. If `useWebAuthn()` was called more than once for the same `Page`/`Frame`, resolves to the most recently created `WebAuthn`.

### Patch Changes

- cd40859: `webauthn.authenticators` now returns a `VirtualAuthenticatorArray` instead of a plain `VirtualAuthenticator[]`. It behaves like a real array — indexing, `.length`, `for...of`, `[...spread]`, `.map()`/`.filter()`/`.slice()` — and adds `iter()` (an `Iterable<VirtualAuthenticator>` alias for `[...array]`), `arr()`/`readonlyArr()` (typed views of the array itself), and `Symbol.asyncDispose` (removes every authenticator in it).

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
  function assertNoDuplicateIds(
    authenticators: readonly VirtualAuthenticator[],
  ) {
    /* ... */
  }
  assertNoDuplicateIds(webauthn.authenticators.readonlyArr());
  ```

- c1935c0: Document when to use Playwright's native `context.credentials` (added in 1.61) instead of this package's CDP-based `webauthn` fixture.

## 1.0.0

### Major Changes

- 6bdf522: Initial release of the WebAuthn/passkey fixture package. Provides the `webauthn` fixture and `useWebAuthn()` factory — drive a virtual FIDO2/U2F authenticator over the Chrome DevTools Protocol `WebAuthn` domain to test passkey registration and login end to end, with no real security key and no mocking of `navigator.credentials`. Includes `VirtualAuthenticator` for credential CRUD, `waitForCredentialAdded`/`waitForCredentialAsserted`/`waitForCredentialUpdated`/`waitForCredentialDeleted` event waiters, and `toBeWebAuthnEnabled`/`toHaveVirtualAuthenticators`/`toHaveCredentials`/`toHaveCredential` matchers.

  ```ts
  import { test, expect } from "@playwright-labs/fixture-webauthn";

  test("passkey login", async ({ page, webauthn }) => {
    await webauthn.enable();
    await webauthn.addVirtualAuthenticator({
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    });

    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in with a passkey" }).click();
    await webauthn.waitForCredentialAsserted();

    await expect(page.getByText("Welcome back")).toBeVisible();
  });
  ```
