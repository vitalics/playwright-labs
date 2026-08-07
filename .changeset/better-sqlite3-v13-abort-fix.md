---
"@playwright-labs/sql-core": patch
"@playwright-labs/fixture-sql": patch
---

Bump `better-sqlite3` to `^13.0.2` (from `^11.0.0`) and raise the `better-sqlite3` peer dependency minimum to `>=13.0.2`. Versions before the N-API rewrite in 13.x could crash the test worker with `Assertion failed: (env) != nullptr` / `SIGABRT` when a `Statement` was garbage-collected during process teardown; 13.0.2 fixes an unrelated worker-thread-termination abort introduced by that rewrite, so it's the first safe 13.x release. 13.x also ships prebuilt binaries for Linux/macOS/Windows, so no native compilation is needed on CI.
