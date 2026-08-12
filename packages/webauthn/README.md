# @playwright-labs/webauthn

Core WebAuthn/passkey primitives — drive a virtual FIDO2/U2F authenticator over the Chrome DevTools Protocol `WebAuthn` domain, so you can test passkey registration and login end to end. No real security key, no mocking `navigator.credentials`.

## What this package provides

`@playwright-labs/webauthn` is the shared foundation used by [`@playwright-labs/fixture-webauthn`](../fixture-webauthn) (the `webauthn` fixture, `useWebAuthn()`, and the `expect` matchers). It has no `@playwright/test` dependency — just `playwright-core` for the `CDPSession` type — so you can also use it standalone, e.g. from a plain script or a different test runner:

- `WebAuthn` — controls the CDP `WebAuthn` domain for a page's CDP session: enable/disable, add/remove virtual authenticators, wait for credential events
- `VirtualAuthenticator` — credential CRUD, `exportCredentials()`/`importCredentials()` for persisting a passkey across runs, and authenticator behaviour controls (user verification, presence simulation, bogus-response overrides)
- `VirtualAuthenticatorArray` — the array type returned by `webauthn.authenticators`
- `matchesCredentialFilter()` / `CredentialFilter` — narrow exports/imports/lookups by `credentialId`/`rpId`/`userName`/`userDisplayName`/`signCountMin`/`signCountMax`
- `isCredential()` — structural type guard for validating untrusted/deserialized credential data

If you're testing with Playwright Test, reach for [`@playwright-labs/fixture-webauthn`](../fixture-webauthn) instead — it wraps this package as a `test.extend` fixture and adds `expect` matchers, so you don't have to wire up the CDP session or disposal yourself.

## Installation

```bash
npm i @playwright-labs/webauthn
```

```bash
pnpm add @playwright-labs/webauthn
```

```bash
yarn add @playwright-labs/webauthn
```

## Quick start

```ts
import { WebAuthn } from "@playwright-labs/webauthn";

test("passkey login", async ({ page, context }) => {
  const session = await context.newCDPSession(page);
  const webauthn = new WebAuthn(session);
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

  await webauthn.dispose(); // or: await using webauthn = new WebAuthn(session);
});
```

## Chromium only

The CDP `WebAuthn` domain is Chromium-specific. `context.newCDPSession()` throws on Firefox/WebKit, so scope this to Chromium-based browsers (`chromium`, or the `chrome`/`msedge` channels).

## How it works

A virtual authenticator is a fake FIDO2/U2F device the browser talks to instead of a real one. Once added, the page's own `navigator.credentials.create()` / `.get()` calls are transparently satisfied by it — your application code doesn't need to know it's running under test.

1. `webauthn.enable()` — turns on the CDP `WebAuthn` domain for the session.
2. `webauthn.addVirtualAuthenticator(options)` — creates the fake device and returns a `VirtualAuthenticator` handle.
3. Your page calls `navigator.credentials.create()` (register) or `.get()` (login) as usual — Chromium routes them to the virtual authenticator instead of prompting for a real key.
4. `webauthn.waitForCredentialAdded()` / `waitForCredentialAsserted()` resolve when that happens, so you can `await` the exact moment the passkey ceremony completed.

## API

### `WebAuthn`

| Method | Description |
| --- | --- |
| `new WebAuthn(session)` | Wraps a `CDPSession` (e.g. from `context.newCDPSession(page)`). |
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
| `dispose()` | Detaches the underlying CDP session. Also available via `Symbol.asyncDispose`. |

```ts
for (const authenticator of webauthn.authenticators) {
  console.log(await authenticator.getCredentials());
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
  // ...
} // each authenticator.remove() is called automatically here
```

### Persisting a passkey across test runs

`exportCredentials()`/`importCredentials()` let you register a passkey once and reuse it, instead of repeating the `navigator.credentials.create()` ceremony in every run — the same idea as Playwright's own `storageState`, but for the authenticator's credentials.

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

`filter` also works against a snapshot holding several users — say, one `all-users.json` file the whole suite shares — so you can import just the passkey you need: `authenticator.importCredentials(sharedSnapshot, { userName: "carol@example.com" })`.

`importCredentials()` validates every entry with the exported `isCredential(value): value is Credential` helper before seeding anything — a structural check (right fields, right types) that, unlike a `Symbol` brand, survives `JSON.stringify`/`JSON.parse`, so it still works on data you just loaded from a file. Use it yourself if you're reading/merging snapshot files by hand.

`CredentialFilter` fields, and when to reach for each:

| Field | Use when | Notes |
| --- | --- | --- |
| `userName` | Pulling one person's passkey out of a shared/multi-user snapshot or authenticator (`{ userName: 'dave@example.com' }`) | The most common filter — matches what you registered the credential with |
| `rpId` | The same authenticator (or snapshot) holds credentials for more than one site/origin | Rare inside a single test, common if you reuse one authenticator or one snapshot file across suites |
| `credentialId` | You already have the exact id (e.g. from a `credentialAdded` event or an earlier `getCredentials()` call) and want that one credential, no ambiguity | Most precise, but you need the id up front |
| `userDisplayName` | `userName` isn't unique/stable in your test data but `userDisplayName` is (or vice versa) | Same matching behaviour as `userName`, pick whichever field your test setup actually varies |
| `signCountMin` / `signCountMax` | Selecting a *subset of credentials* by usage while exporting/importing, e.g. "only credentials asserted at least once" (`signCountMin: 1`) or "never used" (`signCountMax: 0`) | `signCount` increments on every real assertion — don't use it to *identify* a specific user's credential, it changes every time that credential is used. |

Combine fields for an AND match, e.g. `{ userName: 'dave@example.com', rpId: 'localhost' }` when the same user has passkeys for multiple sites.

The export carries the credential's private key — treat the file like any other secret (e.g. a storage state file): keep it out of version control and scope it to trusted CI storage.

`matchesCredentialFilter(credential, filter)` — the underlying predicate used by `exportCredentials`/`importCredentials`, exported in case you need to filter a list of `Credential`s yourself.

## Related packages

- [`@playwright-labs/fixture-webauthn`](../fixture-webauthn) — the Playwright Test integration: `webauthn`/`useWebAuthn()` fixtures and `expect` matchers (`toBeWebAuthnEnabled`, `toHaveVirtualAuthenticators`, `toHaveCredentials`, ...) built on this package

## License

MIT
