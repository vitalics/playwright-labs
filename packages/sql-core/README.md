# @playwright-labs/sql-core

Core SQL primitives for TypeScript — typed `sql` tag, driver-agnostic adapters, and a compile-time SQL type system.

## What this package provides

`@playwright-labs/sql-core` is the shared foundation used by `@playwright-labs/fixture-sql`. It can also be used standalone in any TypeScript project that needs:

- A `sql` function that validates SQL structure and infers parameter counts at compile time
- A `SqlClient` / `SqlAdapter` interface that works with PostgreSQL, MySQL, and SQLite
- Ready-made adapter implementations for all three databases
- Type utilities (`SQLParams`, `ValidSQL`) that catch SQL mistakes before tests run

## Features

- **Typed `sql` function** — plain string and array forms return `SqlStatement<P>`, which encodes the parameter count as a phantom brand; the compiler enforces the correct params array at every call site
- **Compile-time SQL validation** — a TypeScript finite-state-machine models SQL grammar; structurally invalid SQL (missing `FROM`, no `SET` in `UPDATE`, gaps in `$N` sequences, …) produces `never` at compile time
- **Driver-agnostic `SqlClient`** — one interface for PostgreSQL, MySQL, and SQLite with typed overloads for parameterised queries
- **Three ready-made adapters** — `sqliteAdapter`, `pgAdapter`, `mysqlAdapter` via optional peer dependencies
- **`?` and `$N` parameter styles** — both MySQL/SQLite (`?`) and PostgreSQL (`$1`, `$2`, …) are supported; `$N` parameters must be sequential (gap like `$3` without `$2` → `never`)
- **ESM + CJS dual build** — works in both module systems

## Installation

```bash
pnpm add @playwright-labs/sql-core
# install the driver you actually use
pnpm add -D better-sqlite3  # SQLite
pnpm add -D pg              # PostgreSQL
pnpm add -D mysql2          # MySQL / MariaDB
```

## Quick start

```ts
import { sql } from '@playwright-labs/sql-core';
import { sqliteAdapter } from '@playwright-labs/sql-core/sqlite';

const client = await sqliteAdapter(':memory:').create();

await client.execute(sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)`);
await client.execute(sql`INSERT INTO users VALUES (?, ?)`, [1, 'Alice']);

const { rows } = await client.query<{ name: string }>(
  sql`SELECT name FROM users WHERE id = ?`,
  [1],
);

console.log(rows[0]!.name); // 'Alice'

await client.close();
```

## The `sql` function

The `sql` export works in three calling forms with different type inference behaviour:

| Form | TypeScript infers | Return type |
|---|---|---|
| `` sql`SELECT …` `` | `TemplateStringsArray` | `string` |
| `sql("SELECT …")` | literal string `S` | `SqlStatement<P>` |
| `sql(["SELECT …"])` | literal tuple `[S]` | `SqlStatement<P>` |
| `` sql`SELECT ${val}` `` | multi-part template | `string` |

TypeScript always infers `TemplateStringsArray` for tagged template `strings` arguments, which prevents literal-type inference. Use the **plain string** or **array** form when compile-time SQL validation is needed.

### Plain string / array forms (type-safe)

```ts
import { sql } from '@playwright-labs/sql-core';

// Plain string — captures literal type, validates SQL, infers params
const q1 = sql("SELECT * FROM users WHERE id = ?");
// typeof q1 → SqlStatement<[unknown]>

// Array form — identical inference via mutable literal tuple
const q2 = sql(["SELECT * FROM users WHERE id = ?"]);
// typeof q2 → SqlStatement<[unknown]>

// TypeScript enforces the params array:
await client.query(q1, [42]);   // ✅ one param — ok
await client.query(q1);         // ❌ compile error — params required
await client.query(q1, [1, 2]); // ❌ compile error — too many params

// Invalid SQL → never (compile error at the call site)
const bad = sql("SELECT * WHERE id = ?");
//    ^^^  never — missing FROM
```

### Tagged template form (syntax highlighting)

```ts
// Returns string — no compile-time param checking
const q3 = sql`SELECT * FROM users WHERE id = ?`;
// typeof q3 → string

// Interpolations return string too
const table = 'users';
const q4 = sql`SELECT * FROM ${table} LIMIT 10`;
// typeof q4 → string  (runtime concatenation)
```

Use the tagged template form for syntax highlighting in editors that support it. For type safety, use `sql("…")` or `sql(["…"])`.

## Type system

### `SQLParams<S>`

Resolves to a tuple of `unknown` whose length equals the number of parameters in `S`. Returns `never` if `S` is structurally invalid SQL or if `$N` parameters are not sequential.

```ts
import type { SQLParams } from '@playwright-labs/sql-core';

type A = SQLParams<'SELECT * FROM users WHERE id = ?'>;
//   ^-- [unknown]

type B = SQLParams<'UPDATE t SET x = $1, y = $2 WHERE id = $3'>;
//   ^-- [unknown, unknown, unknown]

type C = SQLParams<'SELECT *'>;
//   ^-- never  (missing FROM)

type D = SQLParams<'SELECT * FROM t WHERE id = $3'>;
//   ^-- never  ($1 and $2 are missing — gap in sequence)
```

Validated statement forms:

| Statement | Required clauses |
|---|---|
| `SELECT` | `FROM` |
| `UPDATE` | table name, `SET` |
| `DELETE` | `FROM`, table name |
| `INSERT` | `INTO`, `VALUES` or sub-`SELECT` |
| `CREATE` | `TABLE`, table name |

Optional clauses (`JOIN`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, `OFFSET`) are accepted after the required ones.

### `ValidSQL<S>`

`S` if the SQL is structurally valid, `never` otherwise.

```ts
import type { ValidSQL, SQLParams } from '@playwright-labs/sql-core';

function runQuery<S extends string>(sql: ValidSQL<S>, params: SQLParams<S>) { … }

runQuery('SELECT * FROM users', []);  // ✅
runQuery('SELECT *', []);             // ❌ compile error — missing FROM
```

### `SqlStatement<P>`

A branded string type that carries the parameter tuple `P` as a phantom type. Produced by `sql("…")` and `sql(["…"])`; consumed by the typed `SqlClient` overloads.

```ts
import type { SqlStatement } from '@playwright-labs/sql-core';

declare const stmt: SqlStatement<[unknown, unknown]>;
// assignable to string, but plain string is NOT assignable to SqlStatement
```

### `InferSQLParams<S>`

Alias for `SQLParams<S>`.

## Adapters

### SQLite

```ts
import { sqliteAdapter } from '@playwright-labs/sql-core/sqlite';

const client = await sqliteAdapter(':memory:').create();            // in-memory
const client2 = await sqliteAdapter('./path/to/db.sqlite').create(); // file
```

Peer dependency: `better-sqlite3 >=9.0.0`

### PostgreSQL

```ts
import { pgAdapter } from '@playwright-labs/sql-core/pg';

const client = await pgAdapter('postgresql://user:pass@localhost:5432/mydb').create();
const client2 = await pgAdapter({ host: 'localhost', database: 'mydb' }).create();
```

Peer dependency: `pg >=8.0.0`

### MySQL / MariaDB

```ts
import { mysqlAdapter } from '@playwright-labs/sql-core/mysql';

const client = await mysqlAdapter('mysql://user:pass@localhost:3306/mydb').create();
const client2 = await mysqlAdapter({ host: 'localhost', database: 'mydb' }).create();
```

Peer dependency: `mysql2 >=3.0.0`

### Adapter table

| Import path | Driver | Peer dependency |
|---|---|---|
| `@playwright-labs/sql-core/sqlite` | SQLite | `better-sqlite3 >=9.0.0` |
| `@playwright-labs/sql-core/pg` | PostgreSQL | `pg >=8.0.0` |
| `@playwright-labs/sql-core/mysql` | MySQL / MariaDB | `mysql2 >=3.0.0` |

All peer dependencies are optional — install only the driver you use.

## API reference

### `sql`

```ts
// Tagged template — always returns string (no compile-time validation)
sql`SELECT * FROM users WHERE id = ?`  // → string

// Plain string — validates SQL, infers param tuple
sql("SELECT * FROM users WHERE id = ?")  // → SqlStatement<[unknown]>

// Array form — identical to plain string, useful when SQL is stored separately
sql(["SELECT * FROM users WHERE id = ?"])  // → SqlStatement<[unknown]>
sql(["SELECT * FROM ", " WHERE id = ?"])   // → string (multi-element = dynamic)
```

### `SqlClient`

```ts
interface SqlClient {
  // Typed overloads — enforce params array via SqlStatement brand
  query<T = Row, P extends readonly [unknown, ...unknown[]]>(
    sql: SqlStatement<P>,
    params: readonly [...P],
  ): Promise<QueryResult<T>>;

  // Fallback — plain string or no-param statement
  query<T = Row>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;

  execute<P extends readonly [unknown, ...unknown[]]>(
    sql: SqlStatement<P>,
    params: readonly [...P],
  ): Promise<void>;

  execute(sql: string, params?: unknown[]): Promise<void>;

  close(): Promise<void>;
}
```

### `QueryResult<T>`

```ts
interface QueryResult<T> {
  rows: T[];
  rowCount: number;
  command?: string; // e.g. "SELECT", "INSERT 0 1"
}
```

### `SqlAdapter`

```ts
interface SqlAdapter {
  create(): Promise<SqlClient>;
}
```

## Custom adapter

Implement `SqlAdapter` to add support for any other database driver:

```ts
import type { SqlAdapter, SqlClient, QueryResult, Row } from '@playwright-labs/sql-core';

export function myAdapter(url: string): SqlAdapter {
  return {
    async create(): Promise<SqlClient> {
      const conn = await MyDriver.connect(url);
      return {
        async query<T = Row>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
          const result = await conn.query(sql, params);
          return { rows: result.rows as T[], rowCount: result.rowCount };
        },
        async execute(sql: string, params?: unknown[]): Promise<void> {
          await conn.query(sql, params);
        },
        async close(): Promise<void> {
          await conn.end();
        },
      } as SqlClient;
    },
  };
}
```

## License

MIT
