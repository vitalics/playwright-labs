# Playwright Lock support

Cross-worker and cross-process resource locking for Playwright/test. Useful when multiple workers (or even multiple machines) need exclusive, serialized access to the same external resource — a shared test account, a seat in a rate-limited sandbox, a row in a shared database.

```ts
test("uses the shared account", async ({ useLock }) => {
  const account = await useLock({ id: "account-1", data: { email: "a@b.c" } });
  // account.data is only readable once the lock is acquired
  await login(page, account.data.email);
  // released automatically after the test — or free it early:
  await account.release();
});
```

The lock is released automatically after the test, even if it fails. If you are done with the resource before the test ends, call `await resource.release()` yourself — the automatic release then becomes a no-op, and other waiting tests (or workers) can acquire the same `id` sooner:

```ts
test("another test", async ({ useLock }) => {
  // waits until the lock on "account-1" is free again — no need to pass
  // data again, it is read back from the backend by id
  const sameAccount = await useLock("account-1");
  await page.goto("/login");
  await page.locator(".accountId").fill(sameAccount.data.email);
});
```

The first resource to acquire an `id` with `data` publishes it to the lock backend (first writer wins), where it survives `release()`. Any later test — in another worker or even another process — that locks the same `id` can omit `data` and gets the published copy back.

### Typing shared data

`useLock` is generic. When `data` is passed inline, the type is inferred from it; when reading data back by `id`, pass the type explicitly — otherwise `T` falls back to `unknown`:

```ts
type SharedAccount = { email: string };

test("typed readback", async ({ useLock }) => {
  const account = await useLock<SharedAccount>("account-1");
  // account.data: Readonly<SharedAccount> | undefined
  await page.locator(".accountId").fill(account.data!.email);
});
```

`.data` is `Readonly<T> | undefined` — `undefined` when nothing was published under that `id` — so use `!`, `?.`, or a guard before reading fields.

## Same `id` in multiple tests

When several tests call `useLock` with the same `id` — in one worker or across many — the calls **serialize**: only one test holds the lock at a time, the rest wait inside `acquire()` until it is free.

```ts
// test A (worker 1)                     // test B (worker 2)
const a = await useLock({               const b = await useLock("shared-account");
  id: "shared-account",                 // ...waits until A releases,
  data: { email: "a@b.c" },             // then gets data back by id
});                                     b.data; // { email: "a@b.c" }
```

Rules to keep in mind:

- **Mutual exclusion** — at most one holder per `id` at any moment, no matter how many tests/workers/machines ask for it.
- **Waiting has a limit** — a waiting `useLock` throws after `timeoutMs` (default `30s`). If a shared resource can be held longer than that, pass a bigger timeout via `resource.acquire({ timeoutMs })`, or split the resource into more `id`s.
- **First writer wins for `data`** — only the first acquire that carries `data` publishes it; later calls with the same `id` and their own `data` do **not** overwrite it. Prefer publishing data in exactly one place (e.g. a single setup test) and reading it by `id` everywhere else.
- **Early release unblocks others sooner** — `await resource.release()` inside the test hands the lock to the next waiter immediately instead of at test teardown.
- **Crashed holders don't block forever** — a lock older than `staleMs` (default `30s`) is treated as abandoned and can be stolen by a waiter.

## Installation

```bash
npm i -D @playwright/test @playwright-labs/fixture-lock
```

```bash
pnpm add -D @playwright/test @playwright-labs/fixture-lock
```

```bash
yarn add -D @playwright/test @playwright-labs/fixture-lock
```

## How it works

A `Resource<T>` wraps a piece of data (`T`) behind a named lock (`id`). `acquire()` polls a lock backend until it gets the lock (or times out); `release()` frees it. When a resource acquires a lock with `data`, the backend stores that data under the lock `id` — first writer wins, and the data survives `release()`. A resource constructed without `data` reads the stored data back from the backend after acquiring (`.data` is `undefined` if nothing was published). The fs transport keeps data in a `{id}.data.json` file next to the lock file; the server transports keep it in memory alongside the locks. The backend is pluggable via a `LockClient` transport, selected from `process.env` by `createLockClientFromEnv()`:

| Env var           | Transport             | Needs a server? |
| ------------------ | ---------------------- | ---------------- |
| `LOCK_WS_URL`      | `WebSocketLockClient`  | yes (`WebSocketLockServer`) |
| `LOCK_SOCKET_PATH` | `IpcLockClient`        | yes (`IpcLockServer`) |
| `LOCK_SERVER_URL`  | `HttpLockClient`       | yes (`HttpLockServer`) |
| _(none)_           | `FsLockClient`         | no — locks via lock files under `LOCK_FS_DIR` (default: OS tmp dir) |

The filesystem transport needs no setup and works across processes on one machine. For locking across multiple machines (e.g. sharded CI runners), start one of the servers and point every runner at it.

### Running a shared server

`globalSetup` starts an `HttpLockServer` once for the whole run and sets `LOCK_SERVER_URL` so every worker's `useLock` talks to it:

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  globalSetup: require.resolve("@playwright-labs/fixture-lock/global-setup"),
});
```

`globalSetup` returns its own teardown function — Playwright calls it automatically after the run. If your setup wires `globalSetup` and `globalTeardown` as two separate config entries instead, use the standalone `globalTeardown` export; it reads the same server instance back off `globalThis`.

## Fixture

- `useLock<T>(options: { id?, data?, staleMs?, client?, workerId? }): Promise<Resource<T>>` — creates a `Resource`, acquires its lock, and releases it after the test. Call `resource.release()` inside the test to free the lock early. `data` is optional: omit it to read back data published under the same `id` by another test or process. A bare string is shorthand for `{ id }`: `useLock("account-1")`.

```ts
import { test, expect } from "@playwright-labs/fixture-lock";

test("two locks, different resources", async ({ useLock }) => {
  const seatA = await useLock({ id: "seat-a", data: { port: 4001 } });
  const seatB = await useLock({ id: "seat-b", data: { port: 4002 } });
  expect(seatA.data.port).not.toBe(seatB.data.port);
});
```

## API

### `new Resource<T>({ id, data?, client?, workerId?, staleMs? })`

- `id` — lock name; concurrent `acquire()` calls with the same `id` serialize against each other.
- `data` — optional. When given, it is frozen (`structuredClone` + `Object.freeze`) and published to the backend on acquire (first writer wins — an `id` that already has data keeps the original). When omitted, the resource pulls the data stored under its `id` from the backend after acquiring. Only readable via `.data` once locked; `undefined` when nothing was published.
- `client` — a `LockClient`; defaults to `createLockClientFromEnv()`.
- `staleMs` (default `30000`) — a lock older than this is treated as abandoned and can be stolen.

### `resource.acquire({ timeoutMs?, retryIntervalMs? }): Promise<void>`

Polls the backend until the lock is acquired, throwing after `timeoutMs` (default `30000`, polling every `retryIntervalMs`, default `100`).

### `resource.release(): Promise<void>`

Frees the lock — but not the data published under its `id`, which stays in the backend for later acquirers. Safe to call multiple times and safe to call mid-test — the fixture's automatic release after the test then does nothing. Also available via `Symbol.asyncDispose`, so `await using` works:

```ts
await using account = new Resource({ id: "account-1", data });
await account.acquire();
```

## License

MIT
