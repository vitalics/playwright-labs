/**
 * Example: @playwright-labs/fixture-sql + @playwright-labs/ts-plugin-sql
 *
 * The `sql` tag here is the runtime utility from ts-plugin-sql.
 * The TypeScript language service plugin (configured in tsconfig.json) provides:
 *   - Keyword autocomplete inside sql`...`
 *   - Table/column name suggestions based on the inline schema in tsconfig.json
 *   - Structural SQL diagnostics (missing FROM, SET, etc.)
 *   - Hover tooltips showing column types
 *
 * The `test` and `sqliteAdapter` come from @playwright-labs/fixture-sql,
 * giving us automatic connection lifecycle management.
 */

import { test, expect } from "@playwright-labs/fixture-sql";
import { sqliteAdapter } from "@playwright-labs/fixture-sql/sqlite";
import { sql } from "@playwright-labs/ts-plugin-sql";

// Use an in-memory SQLite database for all tests in this file.
test.use({ sqlAdapter: sqliteAdapter(":memory:") });

// ─── Schema setup ─────────────────────────────────────────────────────────────

test.beforeEach(async ({ sql: db }) => {
  // Create tables
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      email      TEXT    NOT NULL UNIQUE,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(sql`SELECT * from users`);

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

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id    INTEGER NOT NULL REFERENCES posts(id),
      user_id    INTEGER NOT NULL REFERENCES users(id),
      text       TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

test("insert and query users", async ({ sql: db }) => {
  await db.execute(sql`
    INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')
  `);
  await db.execute(sql`
    INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com')
  `);

  const { rows } = await db.query<{ id: number; name: string; email: string }>(
    sql`SELECT id, name, email FROM users ORDER BY id`,
  );

  expect(rows).toHaveLength(2);
  expect(rows[0]!.name).toBe("Alice");
  expect(rows[1]!.name).toBe("Bob");
});

test("parameterised query", async ({ sql: db }) => {
  await db.execute(sql`
    INSERT INTO users (name, email) VALUES ('Carol', 'carol@example.com')
  `);

  const { rows } = await db.query<{ name: string }>(
    sql`SELECT name FROM users WHERE email = ?`,
    ["carol@example.com"],
  );

  expect(rows).toHaveLength(1);
  expect(rows[0]!.name).toBe("Carol");
});

test("join users and posts", async ({ sql: db }) => {
  await db.execute(
    sql`INSERT INTO users (name, email) VALUES ('Dave', 'dave@example.com')`,
  );

  const s = sql`SELECT id FROM users WHERE email = ?`

  const { rows: users } = await db.query(
    s, ['dave@example.com']
  );
  const userId = users[0]!.id;

  await db.execute(
    sql`
    INSERT INTO posts (user_id, title, body, published)
    VALUES (?, 'Hello World', 'My first post', 1)
  `,
    [userId],
  );

  await db.execute(
    sql`
    INSERT INTO posts (user_id, title, body, published)
    VALUES (?, 'Draft', 'Not ready yet', 0)
  `,
    [userId],
  );

  const { rows } = await db.query<{ title: string; name: string }>(sql`
    SELECT posts.title, users.name
    FROM posts
    JOIN users ON users.id = posts.user_id
    WHERE posts.published = 1
  `);

  expect(rows).toHaveLength(1);
  expect(rows[0]!.title).toBe("Hello World");
  expect(rows[0]!.name).toBe("Dave");
});

test("update with SET clause", async ({ sql: db }) => {
  await db.execute(
    sql`INSERT INTO users (name, email) VALUES ('Eve', 'eve@example.com')`,
  );

  await db.execute(
    sql`
    UPDATE users SET name = ? WHERE email = ?
  `,
    ["Eve Updated", "eve@example.com"],
  );

  const { rows } = await db.query<{ name: string }>(
    sql`SELECT name FROM users WHERE email = ?`,
    ["eve@example.com"],
  );

  expect(rows[0]!.name).toBe("Eve Updated");
});

test("delete from table", async ({ sql: db }) => {
  await db.execute(
    sql`INSERT INTO users (name, email) VALUES ('Frank', 'frank@example.com')`,
  );

  await db.execute(sql`DELETE FROM users WHERE email = ?`, [
    "frank@example.com",
  ]);

  const { rows } = await db.query(sql`SELECT * FROM users WHERE email = ?`, [
    "frank@example.com",
  ]);

  expect(rows).toHaveLength(0);
});

test("aggregate COUNT", async ({ sql: db }) => {
  await db.execute(
    sql`INSERT INTO users (name, email) VALUES ('G1', 'g1@example.com')`,
  );
  await db.execute(
    sql`INSERT INTO users (name, email) VALUES ('G2', 'g2@example.com')`,
  );
  await db.execute(
    sql`INSERT INTO users (name, email) VALUES ('G3', 'g3@example.com')`,
  );

  const { rows } = await db.query<{ total: number }>(
    sql`SELECT COUNT(*) AS total FROM users`,
  );

  expect(rows[0]!.total).toBe(3);
});
