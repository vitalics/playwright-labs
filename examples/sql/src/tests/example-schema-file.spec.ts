/**
 * Approach 2: schema loaded from a TypeScript file (db-types.ts).
 *
 * The tsconfig plugin entry uses:
 *   { "name": "@playwright-labs/ts-plugin-sql", "tag": "sql", "schemaFile": "./src/db-types.ts" }
 *
 * The schemaFile is produced by the `fixture-sql pull` CLI:
 *   npx fixture-sql pull -a sqlite -u ./example.db -o src/db-types.ts
 *
 * It must export:
 *   - `export type Tables = { tableName: RowInterface; ... }`
 *   - `export interface SomeRow { col: type; ... }` for each table
 *
 * The plugin reads the file via the TypeScript AST at plugin-init time,
 * so autocomplete/diagnostics reflect the exact same types as your app code.
 *
 * Both plugin instances use tag: "sql". The second one (schemaFile) wraps the
 * first (inline schema) in tsserver's plugin chain and takes precedence for
 * completions. Both use the same sql`...` syntax, so VS Code's built-in SQL
 * syntax highlighting works out of the box.
 */

import { test, expect } from "@playwright-labs/fixture-sql";
import { sqliteAdapter } from "@playwright-labs/fixture-sql/sqlite";
import { sql } from "@playwright-labs/ts-plugin-sql";

test.use({ sqlAdapter: sqliteAdapter(":memory:") });

test.beforeEach(async ({ sql: db }) => {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      email      TEXT    NOT NULL UNIQUE,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS posts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      title      TEXT    NOT NULL,
      body       TEXT    NOT NULL DEFAULT '',
      published  INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
});

test("schemaFile: select users", async ({ sql: db }) => {
  // Completions here come from src/db-types.ts (via schemaFile plugin),
  // not from the inline schema. Columns: id, name, email, created_at.
  await db.execute(sql`
    INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')
  `);

  const { rows } = await db.query<{ id: number; name: string }>(
    sql`SELECT id, name FROM users ORDER BY id`,
  );

  expect(rows).toHaveLength(1);
  expect(rows[0]!.name).toBe("Alice");
});

test("schemaFile: join with posts", async ({ sql: db }) => {
  await db.execute(sql`INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com')`);

  const { rows: users } = await db.query<{ id: number }>(
    sql`SELECT id FROM users WHERE email = ?`,
    ["bob@example.com"],
  );
  const userId = users[0]!.id;

  await db.execute(
    sql`INSERT INTO posts (user_id, title, body, published) VALUES (?, 'Hello', 'Body text', 1)`,
    [userId],
  );

  // Table names and columns come from db-types.ts:
  //   Tables = { users: UsersRow; posts: PostsRow; ... }
  const { rows } = await db.query<{ title: string; name: string }>(sql`
    SELECT posts.title, users.name
    FROM posts
    JOIN users ON users.id = posts.user_id
    WHERE posts.published = 1
  `);

  expect(rows).toHaveLength(1);
  expect(rows[0]!.title).toBe("Hello");
  expect(rows[0]!.name).toBe("Bob");
});
