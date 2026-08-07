---
"@playwright-labs/fixture-lock": minor
---

Initial release of the resource-locking fixture package. Provides the `useLock` fixture and `Resource<T>` class — cross-worker and cross-process exclusive locking for a shared resource (e.g. a shared test account or a seat in a rate-limited sandbox), with a pluggable `LockClient` transport (HTTP, WebSocket, IPC, or filesystem, auto-selected from `process.env` via `createLockClientFromEnv()`) and a `globalSetup`/`globalTeardown` pair for running a shared lock server across the whole run.
