---
title: "Fixture SQL"
description: "API reference for @playwright-labs/fixture-sql."
---

Source files: [`packages/fixture-sql/src/index.ts`](/workspace/home/playwright-labs/packages/fixture-sql/src/index.ts), [`packages/fixture-sql/src/fixture.ts`](/workspace/home/playwright-labs/packages/fixture-sql/src/fixture.ts), [`packages/fixture-sql/src/matchers.ts`](/workspace/home/playwright-labs/packages/fixture-sql/src/matchers.ts).

## Imports

```ts
import {
  test,
  expect,
  type Fixture,
  type SqlMatchers,
  type QueryResult,
  type Row,
  type SqlAdapter,
  type SqlClient,
  type SqlStatement,
  type StmtParams,
  type SQLParams,
} from "@playwright-labs/fixture-sql";
```

## Fixture API

```ts
export type Fixture = {
  sql: SqlClient;
  useSql(adapter: SqlAdapter): Promise<SqlClient>;
  sqlAdapter: SqlAdapter | undefined;
};
```

`sqlAdapter` is an option fixture, not a live connection. The live `sql` fixture resolves it lazily and throws a clear error if it was never configured with `test.use(...)`.

## Matchers

The package exports `sqlMatchers` as `expect`. The matcher interface is defined in [`packages/fixture-sql/src/matchers.ts`](/workspace/home/playwright-labs/packages/fixture-sql/src/matchers.ts) and targets `QueryResult` objects, row sets, and command metadata.

## Adapter Re-Exports

```ts
import { sqliteAdapter } from "@playwright-labs/fixture-sql/sqlite";
import { pgAdapter } from "@playwright-labs/fixture-sql/pg";
import { mysqlAdapter } from "@playwright-labs/fixture-sql/mysql";
```

These are direct re-exports of the `sql-core` adapters so test code can stay within the fixture package namespace.

## Example

```ts
import { test } from "@playwright-labs/fixture-sql";
import { sqliteAdapter } from "@playwright-labs/fixture-sql/sqlite";

test.use({ sqlAdapter: sqliteAdapter(":memory:") });

test("opens one connection per test", async ({ sql }) => {
  await sql.execute("CREATE TABLE t (id INTEGER PRIMARY KEY)");
});
```
