---
"@playwright-labs/fixture-lock": minor
---

`useLock` accepts a callback: `useLock(options, async (resource) => { ... })` holds the lock only while the callback runs, releases it right after (even on throw) and resolves with the callback's result.

Inside the callback the held resource is available through `AsyncLocalStorage`: new `currentLock(id)` and `currentLockIds()` exports read it from any nested helper without passing it around. Re-locking an id that an enclosing callback already holds is re-entrant — it returns the held resource instead of deadlocking.
