# @playwright-labs/fixture-lock

## 0.3.0

### Minor Changes

- 6ef7498: `useLock` accepts a callback: `useLock(options, async (resource) => { ... })` holds the lock only while the callback runs, releases it right after (even on throw) and resolves with the callback's result.

  Inside the callback the held resource is available through `AsyncLocalStorage`: new `currentLock(id)` and `currentLockIds()` exports read it from any nested helper without passing it around. Re-locking an id that an enclosing callback already holds is re-entrant — it returns the held resource instead of deadlocking.

- be116c4: Lock data is now shared by lock `id` — a test that only knows the `id` can read the data another test (or process) published.
  - `LockClient` gains `getData(id)`, and `acquire()` accepts optional data which the backend stores under the lock id (first writer wins). Data survives `release()` — releasing frees the lock, not the data. The fs transport stores it in `{id}.data.json` next to the lock file; the http/ws/ipc servers keep it in memory and expose it via a new `GET_DATA` action / `POST /api/locks/data` endpoint.
  - `ResourceOptions.data` is now optional. A `Resource` constructed without `data` pulls the data stored under its `id` from the backend after acquiring the lock (still frozen); `.data` returns `undefined` when nothing was published.
  - `useLock` accepts a bare lock id string: `useLock("account-1")` is shorthand for `useLock({ id: "account-1" })` with data resolved from the backend.

## 0.2.0

### Minor Changes

- bfcdecc: Initial release of the resource-locking fixture package. Provides the `useLock` fixture and `Resource<T>` class — cross-worker and cross-process exclusive locking for a shared resource (e.g. a shared test account or a seat in a rate-limited sandbox), with a pluggable `LockClient` transport (HTTP, WebSocket, IPC, or filesystem, auto-selected from `process.env` via `createLockClientFromEnv()`) and a `globalSetup`/`globalTeardown` pair for running a shared lock server across the whole run.
