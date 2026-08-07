# @playwright-labs/fixture-webauthn

WebAuthn/passkey testing fixture for Playwright. Drives a virtual FIDO2/U2F authenticator over the Chrome DevTools Protocol `WebAuthn` domain, so you can test passkey registration and login end to end — no real security key, no mocking `navigator.credentials`.

```ts
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

## Installation

```bash
npm i -D @playwright-labs/fixture-webauthn
```

```bash
pnpm add -D @playwright-labs/fixture-webauthn
```

```bash
yarn add -D @playwright-labs/fixture-webauthn
```

## Chromium only

The CDP `WebAuthn` domain is Chromium-specific. Using this fixture with Firefox/WebKit throws a clear error as soon as `webauthn`/`useWebAuthn()` is first resolved. Scope your Playwright config's `projects` to Chromium-based browsers (`chromium`, or the `chrome`/`msedge` channels) for tests that use it.

## Or use Playwright's built-in `context.credentials` (≥1.61)

Playwright 1.61 added a native virtual WebAuthn authenticator: `context.credentials` — `install()`, `create(rpId, options?)`, `get(options?)`, `delete(id)`. For a plain "register a passkey, then sign in with it" test, that's simpler and needs no extra package.

Reach for this fixture instead when you need something `context.credentials` doesn't expose:

| Need | `context.credentials` | `fixture-webauthn` |
| --- | --- | --- |
| Authenticator `protocol`/`transport`/`ctap2Version` | ❌ (fixed) | ✅ |
| Simulate "user never confirms presence" (`automaticPresenceSimulation: false`) | ❌ | ✅ |
| Force `isUserVerified` on/off | ❌ | ✅ |
| Bogus signature/UV/UP responses (`setResponseOverrideBits`) — RP-validation testing | ❌ | ✅ |
| Multiple independent authenticators per context | ❌ (one implicit authenticator) | ✅ |
| `waitForCredentialAdded`/`Asserted`/`Updated`/`Deleted` event waiters | ❌ | ✅ |
| Minimum Playwright version | 1.61 | 1.57 |

## How it works

A virtual authenticator is a fake FIDO2/U2F device the browser talks to instead of a real one. Once added, the page's own `navigator.credentials.create()` / `.get()` calls are transparently satisfied by it — your application code doesn't need to know it's running under test.

1. `webauthn.enable()` — turns on the CDP `WebAuthn` domain for the page.
2. `webauthn.addVirtualAuthenticator(options)` — creates the fake device and returns a `VirtualAuthenticator` handle.
3. Your page calls `navigator.credentials.create()` (register) or `.get()` (login) as usual — Chromium routes them to the virtual authenticator instead of prompting for a real key.
4. `webauthn.waitForCredentialAdded()` / `waitForCredentialAsserted()` resolve when that happens, so your test can `await` the exact moment the passkey ceremony completed.

## Fixtures

### `webauthn: WebAuthn`

A ready-to-use controller bound to the test's `page`.

### `useWebAuthn(page?): Promise<WebAuthn>`

Factory for a controller bound to any `Page` (e.g. a popup opened during the flow). Every `WebAuthn` created this way — including the default `webauthn` fixture — is disposed automatically after the test, even on failure.

## API

### `WebAuthn`

| Method | Description |
| --- | --- |
| `enable(options?)` | Enables the CDP `WebAuthn` domain. Idempotent. Must be called before `addVirtualAuthenticator()`. |
| `disable()` | Disables the domain and forgets every authenticator created on this session. Idempotent. |
| `isEnabled` | `boolean` getter — whether `enable()` has been called. |
| `authenticators` | `VirtualAuthenticatorArray` getter — every authenticator added and not yet removed. Behaves like a plain `VirtualAuthenticator[]` (indexing, `.length`, `for...of`, `[...spread]`) plus a few extra members — see [`VirtualAuthenticatorArray`](#virtualauthenticatorarray). |
| `addVirtualAuthenticator(options)` | Creates a virtual authenticator. Returns a `VirtualAuthenticator`. Throws if `enable()` wasn't called first. |
| `removeVirtualAuthenticator(idOrAuthenticator)` | Removes an authenticator and every credential on it. |
| `waitForCredentialAdded(options?)` | Resolves on the next `navigator.credentials.create()` completed by any authenticator. |
| `waitForCredentialAsserted(options?)` | Resolves on the next `navigator.credentials.get()` completed by any authenticator. |
| `waitForCredentialUpdated(options?)` | Resolves when a credential is updated, e.g. via `PublicKeyCredential.signalCurrentUserDetails()`. |
| `waitForCredentialDeleted(options?)` | Resolves when a credential is deleted, e.g. via `PublicKeyCredential.signalUnknownCredential()`. |
| `dispose()` | Detaches the underlying CDP session. Called automatically after each test; also available via `Symbol.asyncDispose`. |

```ts
for (const authenticator of webauthn.authenticators) {
  await expect(authenticator).toHaveCredentials(1);
}
```

Every `waitForCredential*` method accepts `{ authenticatorId?, timeoutMs? }` (`timeoutMs` defaults to `30_000`) and rejects on timeout.

`addVirtualAuthenticator(options)` accepts:

| Option | Default | Description |
| --- | --- | --- |
| `protocol` | — (required) | `'u2f'` or `'ctap2'` |
| `transport` | — (required) | `'usb' \| 'nfc' \| 'ble' \| 'cable' \| 'internal'` |
| `ctap2Version` | `'ctap2_0'` | Ignored for `protocol: 'u2f'` |
| `hasResidentKey` | `false` | Support for discoverable/resident credentials |
| `hasUserVerification` | `false` | Whether the authenticator supports user verification (biometrics/PIN) |
| `isUserVerified` | `false` | Whether user verification checks succeed |
| `automaticPresenceSimulation` | `true` | If `false`, user-presence tests never resolve — simulates a user who never taps their key |
| `hasLargeBlob` / `hasCredBlob` / `hasMinPinLength` / `hasPrf` | `false` | Advanced CTAP2 extensions — see the [CDP docs](https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/#type-VirtualAuthenticatorOptions) |
| `defaultBackupEligibility` / `defaultBackupState` | `false` | Default backup-eligibility/state flags for credentials created on this authenticator |

### `VirtualAuthenticator`

| Member | Description |
| --- | --- |
| `id` | The CDP-assigned authenticator id. |
| `addCredential(credential)` | Seeds a credential directly, without a `create()` ceremony — e.g. for an "already has a passkey" fixture state. |
| `getCredential(credentialId)` | Fetches a single credential. |
| `getCredentials()` | Fetches every credential stored on this authenticator. |
| `removeCredential(credentialId)` | Removes a single credential. |
| `clearCredentials()` | Removes every credential on this authenticator. |
| `setUserVerified(isUserVerified)` | Flips whether user verification succeeds. |
| `setAutomaticPresenceSimulation(enabled)` | Flips whether user-presence tests resolve immediately. |
| `setCredentialProperties(credentialId, props)` | Updates `backupEligibility`/`backupState` on a stored credential. |
| `setResponseOverrideBits(overrides)` | Forces the next assertion's response to look bogus (`isBogusSignature`/`isBadUV`/`isBadUP`) — for testing relying-party validation. |
| `exportCredentials(filter?)` | Returns credentials on this authenticator — including private keys — as a JSON-serializable `{ version, credentials }` snapshot. `filter` (e.g. `{ userName }`) narrows it to matching credentials; omit to export all of them. |
| `importCredentials(data, filter?)` | Seeds credentials from a snapshot produced by `exportCredentials()` (object, its `JSON.stringify`'d string, or a `Buffer` — e.g. `fs.readFile(path)` with no encoding) onto this authenticator. `filter` narrows which credentials in `data` get imported. Throws on an unrecognized export `version` or if `data.credentials` doesn't structurally look like `Credential[]` (see `isCredential`) — a malformed/corrupted file fails loudly instead of forwarding garbage to the browser. |
| `remove()` | Removes this authenticator. Also available via `Symbol.asyncDispose`. |

### `VirtualAuthenticatorArray`

The type of `webauthn.authenticators`. A real `Array` of `VirtualAuthenticator` — indexing, `.length`, `for...of`, `[...spread]`, `.map()`/`.filter()`/`.slice()` all work as expected (array-copying methods return a plain `Array`, not another `VirtualAuthenticatorArray`) — plus:

| Member | Description |
| --- | --- |
| `iter()` | Returns an `Iterable<VirtualAuthenticator>` snapshot of the array — a readable alias for `[...array]` when you just need to iterate. |
| `arr()` | Returns the array itself, typed as a mutable `VirtualAuthenticator[]`. |
| `readonlyArr()` | Returns the array itself, typed as `readonly VirtualAuthenticator[]` — for signatures that shouldn't mutate it. |
| `[Symbol.asyncDispose]` | Removes every authenticator in the array (calls each one's `remove()`). |

```ts
// Dispose every authenticator in one shot.
{
  await using authenticators = webauthn.authenticators;
  // ... run assertions ...
} // each authenticator.remove() is called automatically here
```

### Persisting a passkey across test runs

`exportCredentials()`/`importCredentials()` let you register a passkey once and reuse it, instead of repeating the `navigator.credentials.create()` ceremony in every test — the same idea as Playwright's own `storageState`, but for the authenticator's credentials.

```ts
import * as fs from "node:fs/promises";

// One-off setup: register, then save the passkey.
const authenticator = await webauthn.addVirtualAuthenticator({
  protocol: "ctap2",
  transport: "internal",
  hasResidentKey: true,
  hasUserVerification: true,
  isUserVerified: true,
});
// ... perform navigator.credentials.create() on the page ...
const snapshot = await authenticator.exportCredentials({ userName: "dave@example.com" });
await fs.writeFile("Dave-localhost.json", JSON.stringify(snapshot));
```

```ts
// Later runs: seed the same passkey onto a fresh authenticator, skip registration.
const authenticator = await webauthn.addVirtualAuthenticator({
  protocol: "ctap2",
  transport: "internal",
  hasResidentKey: true,
  hasUserVerification: true,
  isUserVerified: true,
});
await authenticator.importCredentials(await fs.readFile("Dave-localhost.json")); // a Buffer — no encoding needed
// ... navigator.credentials.get() on the page now succeeds with the imported passkey ...
```

`filter` also works against a snapshot holding several users — say, one `all-users.json` file the whole suite shares — so a given test can import just the passkey it needs: `authenticator.importCredentials(sharedSnapshot, { userName: "carol@example.com" })`.

`importCredentials()` validates every entry with the exported `isCredential(value): value is Credential` helper before seeding anything — a structural check (right fields, right types) that, unlike a `Symbol` brand, survives `JSON.stringify`/`JSON.parse`, so it still works on data you just loaded from a file. Use it yourself if you're reading/merging snapshot files by hand.

`CredentialFilter` fields, and when to reach for each:

| Field | Use when | Notes |
| --- | --- | --- |
| `userName` | Pulling one person's passkey out of a shared/multi-user snapshot or authenticator (`{ userName: 'dave@example.com' }`) | The most common filter — matches what you registered the credential with |
| `rpId` | The same authenticator (or snapshot) holds credentials for more than one site/origin | Rare inside a single test, common if you reuse one authenticator or one snapshot file across suites |
| `credentialId` | You already have the exact id (e.g. from a `credentialAdded` event or an earlier `getCredentials()` call) and want that one credential, no ambiguity | Most precise, but you need the id up front |
| `userDisplayName` | `userName` isn't unique/stable in your test data but `userDisplayName` is (or vice versa) | Same matching behaviour as `userName`, pick whichever field your test setup actually varies |
| `signCountMin` / `signCountMax` | Selecting a *subset of credentials* by usage while exporting/importing, e.g. "only credentials asserted at least once" (`signCountMin: 1`) or "never used" (`signCountMax: 0`) | `signCount` increments on every real assertion — don't use it to *identify* a specific user's credential, it changes every time that credential is used. Asserting on one known credential's `signCount` directly? Use the `toBeSignCount*` matchers below instead. |

Combine fields for an AND match, e.g. `{ userName: 'dave@example.com', rpId: 'localhost' }` when the same user has passkeys for multiple sites.

The export carries the credential's private key — treat the file like any other secret (e.g. a storage state file): keep it out of version control and scope it to trusted CI storage.

### Matchers

| Call | Passes when |
| --- | --- |
| `expect(webauthn).toBeWebAuthnEnabled()` | `webauthn.enable()` has been called |
| `expect(webauthn).toHaveVirtualAuthenticators(count)` | `webauthn.authenticators.length === count` |
| `await expect(authenticator).toHaveCredentials(count)` | the authenticator has exactly `count` stored credentials |
| `await expect(authenticator).toHaveCredential(credentialId)` | the authenticator has a credential with that id |
| `await expect(authenticator).toMatchCredential(filter)` | the authenticator has a credential matching every given field, e.g. `{ userName: 'dave@example.com' }` |
| `expect(credential).toBeSignCountLessThan(n)` / `LessThanOrEqual` | `credential.signCount` compares as named against `n` |
| `expect(credential).toBeSignCountGreaterThan(n)` / `GreaterThanOrEqual` | `credential.signCount` compares as named against `n` |

The last four take a plain `Credential` (e.g. from `getCredentials()`), not a `VirtualAuthenticator` — handy for asserting a specific passkey was actually used: `expect(credential).toBeSignCountGreaterThan(0)`.

All support `.not`.

## Related packages

- [`@playwright-labs/fixture-lock`](../fixture-lock) — cross-worker resource locking, useful for serializing tests against a single shared test account
- [`@playwright-labs/fixture-gmail`](../fixture-gmail) — read real emails from tests, e.g. for magic-link login flows

## License

MIT
