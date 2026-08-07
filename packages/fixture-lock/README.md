# Playwright Lock support

Cross-worker and cross-process resource locking for Playwright/test. Useful when multiple workers (or even multiple machines) need exclusive, serialized access to the same external resource — a shared test account, a seat in a rate-limited sandbox, a row in a shared database.

```ts
test("uses the shared account", async ({ useLock }) => {
  const account = await useLock({ id: "account-1", data: { email: "a@b.c" } });
  // account.data is only readable once the lock is acquired
  await login(page, account.data.email);
});
```

The lock is released automatically after the test, even if it fails.

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

A `Resource<T>` wraps a piece of data (`T`) behind a named lock (`id`). `acquire()` polls a lock backend until it gets the lock (or times out); `release()` frees it. The backend is pluggable via a `LockClient` transport, selected from `process.env` by `createLockClientFromEnv()`:

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

- `useLock<T>(options: { id, data, staleMs?, client?, workerId? }): Promise<Resource<T>>` — creates a `Resource`, acquires its lock, and releases it after the test.

```ts
import { test, expect } from "@playwright-labs/fixture-lock";

test("two locks, different resources", async ({ useLock }) => {
  const seatA = await useLock({ id: "seat-a", data: { port: 4001 } });
  const seatB = await useLock({ id: "seat-b", data: { port: 4002 } });
  expect(seatA.data.port).not.toBe(seatB.data.port);
});
```

## API

### `new Resource<T>({ id, data, client?, workerId?, staleMs? })`

- `id` — lock name; concurrent `acquire()` calls with the same `id` serialize against each other.
- `data` — frozen (`structuredClone` + `Object.freeze`) and only readable via `.data` once locked.
- `client` — a `LockClient`; defaults to `createLockClientFromEnv()`.
- `staleMs` (default `30000`) — a lock older than this is treated as abandoned and can be stolen.

### `resource.acquire({ timeoutMs?, retryIntervalMs? }): Promise<void>`

Polls the backend until the lock is acquired, throwing after `timeoutMs` (default `30000`, polling every `retryIntervalMs`, default `100`).

### `resource.release(): Promise<void>`

Frees the lock. Also available via `Symbol.asyncDispose`, so `await using` works:

```ts
await using account = new Resource({ id: "account-1", data });
await account.acquire();
```

## License

MIT
