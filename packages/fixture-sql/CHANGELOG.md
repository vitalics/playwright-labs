# @playwright-labs/fixture-sql

## 1.0.2

### Patch Changes

- 2a9f041: Bump `better-sqlite3` dev dependency from `^9.6.0` to `^11.0.0`. 9.6.0's native bindings call V8/Node-API functions removed in newer V8 headers, so it fails to build on Node 24. 11.x builds cleanly and is already what CI and `examples/sql` use.
- 56acdfe: Bump `better-sqlite3` to `^13.0.2` (from `^11.0.0`) and raise the `better-sqlite3` peer dependency minimum to `>=13.0.2`. Versions before the N-API rewrite in 13.x could crash the test worker with `Assertion failed: (env) != nullptr` / `SIGABRT` when a `Statement` was garbage-collected during process teardown; 13.0.2 fixes an unrelated worker-thread-termination abort introduced by that rewrite, so it's the first safe 13.x release. 13.x also ships prebuilt binaries for Linux/macOS/Windows, so no native compilation is needed on CI.
- Updated dependencies [2a9f041]
- Updated dependencies [56acdfe]
  - @playwright-labs/sql-core@1.0.2

## 1.0.1

### Patch Changes

- fef3bff: Docs: fix README inaccuracies across packages.
  - SQL: the `pull` CLI is `@playwright-labs/sql-core`'s, not `fixture-sql`'s — all invocations corrected to `pnpm sql-core pull --adapter … --url … [--out …]` (with a note that pnpm only links bins of direct dependencies); `sql-core` README now documents the CLI; generated-file attribution fixed.
  - `fixture-abort`: fix wrong import package name; document the real fixture names `signal` and `useSignalWithTimeout` (was `abortSignal` / `useAbortSignalWithTimeout` — aligned README, JSDoc, and the validation error message).
  - `fixture-env`: add missing `createEnv` imports (subpath-only export), fix the zod example, remove a non-working `use: { env }` config block.
  - `fixture-faker`: fix a copy-pasted allure import. `fixture-ghost-cursor`: fix the test-composition example (`mergeTests`). `decorators`: fix two dead links.
  - `reporter-otel` / `reporter-email`: point example references to the real `examples/otel-stack` and `examples/reporter-email` directories; fix `FullResult`-based callback docs and tuple destructuring in email template examples.
  - `reporter-prometheus-remote-write`: README metric table now matches the actual emitted metric names; the package barrel now also re-exports `Histogram` and `DEFAULT_BUCKETS` from `prometheus-core`, as documented.

- Updated dependencies [fef3bff]
  - @playwright-labs/sql-core@1.0.1

## 1.0.0

### Major Changes

- 094b14d: Implement SQL feature

  Adds three new packages:

  **`@playwright-labs/sql-core`** — core SQL primitives:
  - `sql` function with three calling forms: tagged template (returns `string`), plain string `sql("…")` and array `sql(["…"])` (both return `SqlStatement<P>`)
  - Compile-time SQL validation via a TypeScript FSM over template-literal types — invalid SQL (missing `FROM`, no `SET` in `UPDATE`, etc.) resolves to `never`
  - `SQLParams<S>` type that infers the parameter tuple from `?` / `$N` placeholders; sequential `$N` validation (`$3` without `$1`/`$2` → `never`)
  - `SqlClient` / `SqlAdapter` driver-agnostic interfaces with typed overloads enforcing correct param arrays via `SqlStatement<P>` phantom brand
  - Adapter implementations: `sqliteAdapter` (better-sqlite3), `pgAdapter` (pg), `mysqlAdapter` (mysql2)
  - `pull` CLI to introspect a live database and generate TypeScript row-type interfaces

  **`@playwright-labs/fixture-sql`** — Playwright test fixture:
  - `sql` fixture that auto-opens a `SqlClient` before each test and closes it after (even on failure)
  - `useSql(adapter)` for additional on-demand connections, all tracked for teardown
  - Custom `expect` matchers: `toBeSqlConnected()`, `toHaveSqlTable()`, `toMatchSchema()`
  - Re-exports all `sql-core` types so a single import covers everything

  **`@playwright-labs/ts-plugin-sql`** — TypeScript language service plugin:
  - Schema-aware SQL keyword, table, and column autocompletion inside `sql` templates
  - Structural diagnostics (squiggly underlines for invalid SQL)
  - Hover info showing column types from your schema
  - Schema from a generated `db-types.ts` file (`schemaFile`) or inline JSON in `tsconfig.json`
  - Re-exports the `sql` function from `sql-core`

### Patch Changes

- Updated dependencies [094b14d]
  - @playwright-labs/sql-core@1.0.0
