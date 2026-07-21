---
title: Type-Safe SQL in Tests with fixture-sql and ts-plugin-sql
impact: LOW-MEDIUM
impactDescription: catches SQL mistakes at compile time and eliminates leaked connections in database-backed tests
tags: sql, sqlite, postgres, mysql, type-safety, fixtures, ts-plugin
---

## Type-Safe SQL in Tests with fixture-sql and ts-plugin-sql

**Impact: LOW-MEDIUM (catches SQL mistakes at compile time and eliminates leaked connections in database-backed tests)**

End-to-end tests that touch a database usually fail in two boring ways: a query string with a typo that only blows up at runtime, and a connection opened in `beforeEach` that never closes because the test threw before `afterEach` ran. The three-package SQL system fixes both. `@playwright-labs/sql-core` provides a typed `sql` function whose `SqlStatement<P>` phantom brand encodes the parameter count at the type level — structurally invalid SQL resolves to `never` at compile time. `@playwright-labs/fixture-sql` wires connections into Playwright's fixture lifecycle so every connection auto-closes, even on failure. `@playwright-labs/ts-plugin-sql` adds schema-aware autocomplete, diagnostics, and hover inside your editor, driven by a `db-types.ts` file generated from your live database via the `sql-core pull` CLI.

## When to Use

- **Use fixture-sql when**: Any test reads or writes a real database — seeding data, asserting persisted state, or verifying migrations
- **Use `sql("…")` / `sql(["…"])` when**: You want the compiler to validate SQL structure and enforce the params array length before the test ever runs
- **Use the tagged template `` sql`…` `` when**: You want editor syntax highlighting and ts-plugin-sql completions, and compile-time param checking is not needed (the template form returns plain `string`)
- **Add ts-plugin-sql when**: The team writes SQL by hand and you want table/column autocomplete and structural diagnostics inside the editor
- **Consider alternatives when**: Tests only stub HTTP or use an in-memory app — a database fixture is overhead you do not need
- **Required for**: Suites where a leaked connection exhausts the database pool in CI, or where schema drift between the app and test queries causes runtime-only failures

## Guidelines

### Do

- Import `test` and `expect` from `@playwright-labs/fixture-sql` and set the adapter once per file: `test.use({ sqlAdapter: pgAdapter(url) })`
- Use `sql("…")` or `sql(["…"])` for any query with parameters — the `SqlStatement<P>` brand makes TypeScript enforce the params tuple
- Generate row types from the live database with `pnpm sql-core pull --adapter <sqlite|pg|mysql> --url <url> --out ./src/db-types.ts` and pass them to `db.query<UsersRow>(...)`
- Point ts-plugin-sql's `schemaFile` option at the same generated file so editor autocomplete and your test types never drift apart
- Re-run the `pull` CLI in CI (or on schema migration) to keep generated types in sync with the real schema
- Use `useSql(adapter)` when a test needs a second connection — it is registered for automatic teardown like the primary `sql` fixture
- Prefer `sqliteAdapter(':memory:')` for the fastest possible isolation — every test gets a brand-new database with zero cleanup

### Don't

- Don't concatenate values into query strings — use `?` (SQLite/MySQL) or `$1, $2, …` (PostgreSQL) placeholders with a params array
- Don't manage connections with `beforeEach`/`afterEach` — a mid-test failure skips your `close()` and leaks the connection
- Don't expect compile-time validation from the tagged template form `` sql`…` `` — TypeScript infers `TemplateStringsArray` for tagged templates, so it always returns `string`
- Don't use `$N` placeholders out of order — `$3` without `$1` and `$2` resolves to `never` at compile time by design
- Don't run `pnpm sql-core pull` with `sql-core` installed only as a transitive dependency — pnpm links bins of direct dependencies only, so install it as a direct devDependency
- Don't hand-write row interfaces that duplicate the schema — they go stale silently; generate them with the `pull` CLI instead

### Tool Usage Patterns

- **Install**: `pnpm add -D @playwright-labs/fixture-sql @playwright-labs/sql-core @playwright-labs/ts-plugin-sql` plus the driver you use — `better-sqlite3 >=9.0.0`, `pg >=8.0.0`, or `mysql2 >=3.0.0`
- **Adapters**: `sqliteAdapter` from `@playwright-labs/fixture-sql/sqlite`, `pgAdapter` from `@playwright-labs/fixture-sql/pg`, `mysqlAdapter` from `@playwright-labs/fixture-sql/mysql` — all accept a connection URL or a config object
- **Fixtures**: `sql: SqlClient` (auto-opened/auto-closed), `useSql(adapter): Promise<SqlClient>` (extra connections), `sqlAdapter: SqlAdapter` (configuration option)
- **Type utilities**: `SQLParams<S>`, `ValidSQL<S>`, `InferSQLParams<S>`, `SqlStatement<P>` — re-exported from `@playwright-labs/fixture-sql`
- **Client API**: `db.query<T>(stmt, params)` → `{ rows, rowCount, command? }`; `db.execute(stmt, params)`; `db.close()`
- **CLI**: `pnpm sql-core pull --adapter sqlite|pg|mysql --url <url> [--out <file>]` (short flags `-a`, `-u`, `-o`); npm users run `npx playwright-labs-sql-core pull ...`
- **Editor plugin**: `{ "name": "@playwright-labs/ts-plugin-sql", "tag": "sql", "schemaFile": "./src/db-types.ts" }` in `tsconfig.json` `compilerOptions.plugins`

## Edge Cases and Constraints

### Limitations

- The tagged template form cannot be type-checked — TypeScript always widens tagged template arguments to `TemplateStringsArray`, so literal-type inference is impossible. This is a language limitation, not a package bug. Use `sql("…")` or `sql(["…"])` when validation matters.
- The compile-time validator models a subset of SQL grammar: `SELECT` requires `FROM`, `UPDATE` requires a table and `SET`, `DELETE` requires `FROM` and a table, `INSERT` requires `INTO` plus `VALUES` or a sub-`SELECT`, `CREATE` requires `TABLE` and a name. Optional clauses (`JOIN`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, `OFFSET`) are accepted after the required ones. Exotic statements outside this grammar resolve to `never`.
- ts-plugin-sql runs inside `tsserver` — it provides editor features only and has no effect on `tsc` builds or CI type-checking. Compile-time safety comes from `sql-core`'s type system, not from the plugin.
- All three database drivers are optional peer dependencies — a missing driver surfaces as an import error, not a config warning. Install exactly the one you use.

### Edge Cases

1. **Multi-element array form**: `sql(["SELECT * FROM ", " WHERE id = ?"])` returns plain `string` — a multi-element array means dynamic SQL, so validation is skipped intentionally.
2. **VS Code not showing completions**: The plugin only loads when the editor uses the workspace TypeScript version. Run **TypeScript: Select TypeScript Version → Use Workspace Version**.
3. **`schemaFile` vs `schema`**: When both options are present in the plugin config, `schemaFile` wins. Use the inline `schema` object only for small projects without a live database to introspect.
4. **CLI prints to stdout**: Without `--out`, generated types go to stdout — pipe or redirect them, or always pass `--out ./src/db-types.ts` in scripts.

### What Breaks If Ignored

- **Raw string queries**: A missing `FROM`, a wrong column name, or a mismatched params array fails at runtime — in CI, minutes after the commit, instead of at the keystroke
- **Manual connection management**: A test that throws before `afterEach` leaks its connection; under parallel workers this exhausts the database pool and fails unrelated tests with timeout errors
- **Stale hand-written types**: The app adds a column or changes a nullability, tests keep compiling against the old shape, and `rows[0].email` is `undefined` at runtime with no type error

**Incorrect (raw strings, manual lifecycle, no generated types):**

```typescript
import { test, expect } from "@playwright/test";
import pg from "pg";

let client: pg.Client;

test.beforeEach(async () => {
  client = new pg.Client(process.env.DATABASE_URL);
  await client.connect();
});

test.afterEach(async () => {
  await client.end(); // ❌ never runs if the test throws before teardown is reached in CI worker shutdown
});

test("loads a user", async () => {
  const id = 1;
  // ❌ string concatenation — SQL injection vector, no param checking
  const res = await client.query(`SELECT * FROM users WHERE id = ${id}`);
  // ❌ rows is `any[]` — a renamed column compiles fine and fails at runtime
  expect(res.rows[0].emial).toBe("alice@example.com");
});
```

**Why this fails:**
- `SELECT * FROM users WHERE id = ${id}` is an injection vector and bypasses every parameter check
- `res.rows` is untyped — `emial` (typo) compiles cleanly and produces `undefined` at runtime
- `beforeEach`/`afterEach` lifecycle breaks the moment a test throws mid-query or a worker is recycled — the connection leaks
- Nothing ties the test's row shape to the real schema; drift is invisible

**Correct (fixture lifecycle + typed `sql` + generated row types):**

```typescript
// Generate types once (and on every schema change):
//   pnpm sql-core pull --adapter pg --url postgresql://user:pass@localhost/mydb --out ./src/db-types.ts
import { test, expect } from "@playwright-labs/fixture-sql";
import { pgAdapter } from "@playwright-labs/fixture-sql/pg";
import { sql } from "@playwright-labs/fixture-sql";
import type { UsersRow } from "./db-types.js";

test.use({ sqlAdapter: pgAdapter(process.env.DATABASE_URL!) });

test("loads a user", async ({ sql: db }) => {
  // ✅ compile-time validated: correct structure, exactly one param enforced
  const { rows } = await db.query<UsersRow>(
    sql("SELECT id, name, email FROM users WHERE id = $1"),
    [1],
  );
  // ✅ rows is UsersRow[] — a typo'd property is a compile error
  expect(rows[0]!.email).toBe("alice@example.com");
  // ✅ connection closes automatically even if the expect above throws
});
```

**Why this works:**
- `sql("…")` returns `SqlStatement<[unknown]>` — calling `db.query(stmt)` without params, or with two params, is a compile error
- Invalid SQL (`sql("SELECT * WHERE id = $1")` — missing `FROM`) resolves to `never` and fails at the call site, before any test runs
- The `sql` fixture is owned by Playwright's teardown — the connection closes even on failure, and each test gets its own client
- `UsersRow` is generated from the live database by the `pull` CLI, so types track the real schema

## Common Mistakes

### Mistake 1: Expecting type safety from the tagged template form

```typescript
import { sql } from "@playwright-labs/fixture-sql";

// ❌ returns plain string — no param checking, no structural validation
const stmt = sql`SELECT * FROM users WHERE id = ?`;
await db.query(stmt); // compiles fine — missing param not caught
```

**Why this is wrong**: TypeScript infers `TemplateStringsArray` for tagged template arguments, which prevents literal-type inference. The template form always returns `string`, so the typed `query` overloads never engage.

**How to fix**:

```typescript
// ✅ plain string form returns SqlStatement<[unknown]>
const stmt = sql("SELECT * FROM users WHERE id = ?");
await db.query(stmt, [1]); // params enforced at compile time

// Array form is identical — useful when SQL is stored separately
const stmt2 = sql(["SELECT * FROM users WHERE id = ?"]);
```

Use the tagged template form deliberately — for editor syntax highlighting and ts-plugin-sql completions — not by accident.

### Mistake 2: Leaking connections with manual lifecycle

```typescript
test("two databases", async () => {
  const primary = await pgAdapter(primaryUrl).create();
  const replica = await pgAdapter(replicaUrl).create();
  // ❌ if anything below throws, neither connection closes
  await primary.execute("INSERT INTO events (id, type) VALUES ($1, $2)", [1, "login"]);
  const { rows } = await replica.query("SELECT * FROM events");
  expect(rows).toHaveLength(1);
  await primary.close();
  await replica.close();
});
```

**Why this is wrong**: The first assertion failure or unexpected throw skips every `close()` below it. Under `fullyParallel` with several workers, leaked connections accumulate until the database refuses new ones.

**How to fix**:

```typescript
test("two databases", async ({ useSql }) => {
  // ✅ both connections registered for automatic teardown
  const primary = await useSql(pgAdapter(primaryUrl));
  const replica = await useSql(pgAdapter(replicaUrl));

  await primary.execute(
    sql("INSERT INTO events (id, type) VALUES ($1, $2)"),
    [1, "login"],
  );
  const { rows } = await replica.query(sql("SELECT * FROM events"));
  expect(rows).toHaveLength(1);
});
```

### Mistake 3: `pnpm sql-core` command not found

```bash
# ❌ fails — sql-core is present only as a transitive dependency of fixture-sql
pnpm sql-core pull --adapter sqlite --url ./dev.db --out ./src/db-types.ts
# ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "sql-core" not found
```

**Why this is wrong**: pnpm only links bins of *direct* dependencies into `node_modules/.bin`. `fixture-sql` depends on `sql-core`, but that does not expose its CLI to your scripts.

**How to fix**:

```bash
# ✅ install as a direct devDependency
pnpm add -D @playwright-labs/sql-core
pnpm sql-core pull --adapter sqlite --url ./dev.db --out ./src/db-types.ts

# npm users can skip the explicit install:
npx playwright-labs-sql-core pull --adapter sqlite --url ./dev.db --out ./src/db-types.ts
```

### Mistake 4: Gaps in `$N` parameter sequences

```typescript
// ❌ resolves to never — $1 and $2 are missing, so the statement is rejected
const stmt = sql("SELECT * FROM users WHERE a = $1 AND c = $3");
```

**Why this is wrong**: The type system requires `$N` placeholders to be sequential — `$3` without `$2` means the params tuple is ambiguous, so `SQLParams<S>` returns `never` and the call site fails to compile. This is the validator working as designed, not a false positive.

**How to fix**:

```typescript
// ✅ sequential placeholders compile and enforce a 3-element params tuple
const stmt = sql("SELECT * FROM users WHERE a = $1 AND b = $2 AND c = $3");
await db.query(stmt, ["x", "y", "z"]);
```

## Advanced Patterns

### Full pipeline: live schema → generated types → editor intelligence → typed tests

```bash
# 1. Introspect the live database (run on schema changes / in CI)
pnpm sql-core pull --adapter pg --url $DATABASE_URL --out ./src/db-types.ts
```

```json
// 2. tsconfig.json — enable schema-aware editor features
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@playwright-labs/ts-plugin-sql",
        "tag": "sql",
        "schemaFile": "./src/db-types.ts"
      }
    ]
  }
}
```

```typescript
// 3. tests/users.spec.ts — compile-time safety plus editor autocomplete
import { test, expect } from "@playwright-labs/fixture-sql";
import { pgAdapter } from "@playwright-labs/fixture-sql/pg";
import { sql } from "@playwright-labs/ts-plugin-sql"; // same sql function, re-exported
import type { UsersRow } from "../src/db-types.js";

test.use({ sqlAdapter: pgAdapter(process.env.DATABASE_URL!) });

test("typed query with IDE support", async ({ sql: db }) => {
  const { rows, rowCount } = await db.query<UsersRow>(
    sql("SELECT id, name, email FROM users WHERE id = $1"),
    [1],
  );
  expect(rowCount).toBe(1);
  expect(rows[0]!.name).toBe("Alice");
});
```

The generated file declares one interface per table plus a `Tables` map keyed by table name — import the row types in tests and point `schemaFile` at the same file, so the editor and the compiler always agree.

### Per-test schema isolation on a shared PostgreSQL instance

```typescript
import { randomUUID } from "node:crypto";
import { test } from "@playwright-labs/fixture-sql";
import { pgAdapter } from "@playwright-labs/fixture-sql/pg";

test.use({ sqlAdapter: pgAdapter(process.env.DATABASE_URL!) });

test.beforeEach(async ({ sql: db }) => {
  const schema = `test_${randomUUID().replace(/-/g, "")}`;
  await db.execute(`CREATE SCHEMA ${schema}`);
  await db.execute(`SET search_path TO ${schema}`);
});
```

**When to use this pattern**: Suites running against one shared Postgres in CI where tests must not see each other's rows. For SQLite, prefer `sqliteAdapter(':memory:')` — isolation is free. For a file-backed SQLite seeded before the suite, use `sqliteAdapter('./fixtures/seed.db')`.

## Integration with Other Best Practices

- **Ensure Test Isolation for Parallel Execution**: The `sql` fixture gives every test its own client by default, which is the database half of test isolation. Combine with per-test schemas (above) when the database itself is shared, and never share a module-level `SqlClient` between tests.
- **Use Custom Fixtures for Reusable Test Setup and Teardown**: Extend the `fixture-sql` `test` object with your own fixtures (seed helpers, row factories) instead of wrapping connections in custom `beforeEach` blocks — you keep auto-close and add reuse on top.
- **Use test.describe for Logical Test Grouping**: Override `sqlAdapter` per describe block — e.g. a read-only suite pointed at a replica — while the rest of the file uses the primary database.
- **Scale considerations**: At 100+ database-backed tests, connection churn dominates. Keep one adapter per file via `test.use()`, prefer `:memory:` SQLite where the dialect allows, and add the `pull` CLI to CI so schema drift fails the type-check job before the e2e job starts.

## Expected Input/Output

**Input scenario**: A test queries `users` with a parameterised `SELECT` using `sql("…")` and a generated `UsersRow` type.

**Expected outcome**: TypeScript enforces the params tuple, `db.query<UsersRow>` returns `rows: UsersRow[]`, and the connection closes automatically after the test — pass or fail.

**Failure scenario**: The query is written as a raw template string, or the params array is missing.

**Expected error**: For `sql("SELECT * WHERE id = ?")` — a compile error at the call site because the statement is `never` (missing `FROM`). For `db.query(stmt)` where `stmt: SqlStatement<[unknown]>` — a compile error: params argument required. Neither error waits for a test run.

Reference: [@playwright-labs/sql-core](https://github.com/vitalics/playwright-labs/tree/main/packages/sql-core), [@playwright-labs/fixture-sql](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-sql), [@playwright-labs/ts-plugin-sql](https://github.com/vitalics/playwright-labs/tree/main/packages/ts-plugin-sql)
