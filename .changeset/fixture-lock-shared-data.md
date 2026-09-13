---
"@playwright-labs/fixture-lock": minor
---

Lock data is now shared by lock `id` — a test that only knows the `id` can read the data another test (or process) published.

- `LockClient` gains `getData(id)`, and `acquire()` accepts optional data which the backend stores under the lock id (first writer wins). Data survives `release()` — releasing frees the lock, not the data. The fs transport stores it in `{id}.data.json` next to the lock file; the http/ws/ipc servers keep it in memory and expose it via a new `GET_DATA` action / `POST /api/locks/data` endpoint.
- `ResourceOptions.data` is now optional. A `Resource` constructed without `data` pulls the data stored under its `id` from the backend after acquiring the lock (still frozen); `.data` returns `undefined` when nothing was published.
- `useLock` accepts a bare lock id string: `useLock("account-1")` is shorthand for `useLock({ id: "account-1" })` with data resolved from the backend.
