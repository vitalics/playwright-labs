---
"@playwright-labs/ts-plugin-sql": patch
"@playwright-labs/fixture-sql": patch
"@playwright-labs/sql-core": patch
"@playwright-labs/fixture-abort": patch
"@playwright-labs/fixture-env": patch
"@playwright-labs/fixture-faker": patch
"@playwright-labs/fixture-ghost-cursor": patch
"@playwright-labs/decorators": patch
"@playwright-labs/reporter-otel": patch
"@playwright-labs/reporter-email": patch
"@playwright-labs/reporter-prometheus-remote-write": patch
---

Docs: fix README inaccuracies across packages.

- SQL: the `pull` CLI is `@playwright-labs/sql-core`'s, not `fixture-sql`'s — all invocations corrected to `pnpm sql-core pull --adapter … --url … [--out …]` (with a note that pnpm only links bins of direct dependencies); `sql-core` README now documents the CLI; generated-file attribution fixed.
- `fixture-abort`: fix wrong import package name; document the real fixture names `signal` and `useSignalWithTimeout` (was `abortSignal` / `useAbortSignalWithTimeout` — aligned README, JSDoc, and the validation error message).
- `fixture-env`: add missing `createEnv` imports (subpath-only export), fix the zod example, remove a non-working `use: { env }` config block.
- `fixture-faker`: fix a copy-pasted allure import. `fixture-ghost-cursor`: fix the test-composition example (`mergeTests`). `decorators`: fix two dead links.
- `reporter-otel` / `reporter-email`: point example references to the real `examples/otel-stack` and `examples/reporter-email` directories; fix `FullResult`-based callback docs and tuple destructuring in email template examples.
- `reporter-prometheus-remote-write`: README metric table now matches the actual emitted metric names; the package barrel now also re-exports `Histogram` and `DEFAULT_BUCKETS` from `prometheus-core`, as documented.
