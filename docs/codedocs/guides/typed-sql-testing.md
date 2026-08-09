---
title: "Typed SQL Testing"
description: "Combine sql-core, fixture-sql, and ts-plugin-sql for typed queries, managed test connections, and editor support."
---

This guide follows the same three-package split used by the repo itself: type your statements with `sql-core`, manage connections with `fixture-sql`, and turn on editor intelligence with `ts-plugin-sql`.

<Steps>
<Step>

### Install the runtime and editor packages

```bash
pnpm add -D @playwright/test @playwright-labs/fixture-sql @playwright-labs/ts-plugin-sql better-sqlite3 typescript
```

</Step>
<Step>

### Enable the TypeScript plugin

The example under [`examples/sql/README.md`](/workspace/home/playwright-labs/examples/sql/README.md) shows both inline schema and `schemaFile` approaches. Start with a schema file because it scales better:

```json
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

</Step>
<Step>

### Configure a test-scoped adapter

```ts
import { test, expect } from "@playwright-labs/fixture-sql";
import { sqliteAdapter } from "@playwright-labs/fixture-sql/sqlite";
import { sql } from "@playwright-labs/ts-plugin-sql";

test.use({ sqlAdapter: sqliteAdapter(":memory:") });

test("creates and queries rows", async ({ sql: db }) => {
  await db.execute(sql("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)"));
  await db.execute(sql("INSERT INTO users VALUES (?, ?)"), [1, "Ada"]);

  const result = await db.query<{ name: string }>(
    sql("SELECT name FROM users WHERE id = ?"),
    [1],
  );

  expect(result.rows[0]?.name).toBe("Ada");
});
```

</Step>
<Step>

### Keep the generated schema in sync

`db-types.ts` in [`examples/sql/src/db-types.ts`](/workspace/home/playwright-labs/examples/sql/src/db-types.ts) represents the format that the SQL tooling expects:

```ts
export interface UsersRow {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export type Tables = {
  users: UsersRow;
};
```

</Step>
</Steps>

<Callout type="warn">The tagged-template form ``sql`SELECT ...` `` is useful for editor syntax highlighting, but the strongest compile-time parameter inference comes from `sql("...")` or `sql(["..."])` as implemented in `packages/sql-core/src/sql-tag.js`.</Callout>
