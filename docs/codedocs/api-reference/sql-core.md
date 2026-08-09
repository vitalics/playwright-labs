---
title: "SQL Core"
description: "API reference for @playwright-labs/sql-core."
---

Source files: [`packages/sql-core/src/index.ts`](/workspace/home/playwright-labs/packages/sql-core/src/index.ts), [`packages/sql-core/src/types.ts`](/workspace/home/playwright-labs/packages/sql-core/src/types.ts), [`packages/sql-core/src/sql-tag.js`](/workspace/home/playwright-labs/packages/sql-core/src/sql-tag.js), [`packages/sql-core/src/adapters/sqlite.ts`](/workspace/home/playwright-labs/packages/sql-core/src/adapters/sqlite.ts), [`packages/sql-core/src/adapters/pg.ts`](/workspace/home/playwright-labs/packages/sql-core/src/adapters/pg.ts), [`packages/sql-core/src/adapters/mysql.ts`](/workspace/home/playwright-labs/packages/sql-core/src/adapters/mysql.ts), [`packages/sql-core/src/SQLType.ts`](/workspace/home/playwright-labs/packages/sql-core/src/SQLType.ts).

## Imports

```ts
import {
  sql,
  type QueryResult,
  type Row,
  type SqlClient,
  type SqlAdapter,
  type SqlStatement,
  type SQLParams,
  type ValidSQL,
} from "@playwright-labs/sql-core";

import { sqliteAdapter } from "@playwright-labs/sql-core/sqlite";
import { pgAdapter } from "@playwright-labs/sql-core/pg";
import { mysqlAdapter } from "@playwright-labs/sql-core/mysql";
```

## Core Runtime API

```ts
export const sql: <const T extends TemplateStringsArray | string | string[]>(
  strings: T,
  ...values: readonly unknown[]
) => ...;
```

`sql` returns:

- `string` for tagged-template or interpolated forms
- `SqlStatement<P>` for plain-string and single-element-array forms when `SQLParams<S>` is valid

```ts
export interface SqlClient {
  query<T = Row, P extends readonly [unknown, ...unknown[]] = readonly [unknown, ...unknown[]]>(
    sql: SqlStatement<P>,
    params: readonly [...P]
  ): Promise<QueryResult<T>>;
  query<T = Row>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  execute<P extends readonly [unknown, ...unknown[]] = readonly [unknown, ...unknown[]]>(
    sql: SqlStatement<P>,
    params: readonly [...P]
  ): Promise<void>;
  execute(sql: string, params?: unknown[]): Promise<void>;
  close(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}
```

## Adapters

```ts
sqliteAdapter(filename: string): SqlAdapter
pgAdapter(config: ClientConfig | string): SqlAdapter
mysqlAdapter(config: ConnectionOptions | string): SqlAdapter
```

## Type Utilities

```ts
type SQLParams<S extends string> = ...
type ValidSQL<S extends string> = ...
type InferSQLParams<S extends string> = SQLParams<S>
type SqlStatement<P extends readonly unknown[] = readonly unknown[]> = string & { readonly __sqlBrand: P }
```

These types are what make the SQL toolchain useful: runtime adapters stay simple, while TypeScript enforces statement structure and parameter counts.
