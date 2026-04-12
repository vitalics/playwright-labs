# @playwright-labs/sql-core

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
