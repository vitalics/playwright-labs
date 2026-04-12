/**
 * Integration tests — exercise the full fixture API the way a real user would:
 *   1. test.use({ sqlAdapter }) configured once at the top of the file
 *   2. Every test receives the `sql` fixture (fresh in-memory DB per test)
 *   3. `useSql` is used whenever a test needs additional or custom connections
 */

import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { rm } from "fs/promises";

import { test, expect } from "../src/index.js";
import { sqliteAdapter } from "../src/adapters/sqlite.js";

// One shared adapter; create() opens a new ':memory:' DB for every test.
test.use({ sqlAdapter: sqliteAdapter(":memory:") });

// ---------------------------------------------------------------------------
// Schema helpers shared across tests
// ---------------------------------------------------------------------------

type User = { id: number; name: string; email: string };
type Post = { id: number; user_id: number; title: string; body: string };

async function createSchema(
  sql: Awaited<ReturnType<ReturnType<typeof sqliteAdapter>["create"]>>,
) {
  await sql.execute(`
    CREATE TABLE users (
      id    INTEGER PRIMARY KEY,
      name  TEXT    NOT NULL,
      email TEXT    NOT NULL UNIQUE
    )
  `);
  await sql.execute(`
    CREATE TABLE posts (
      id      INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title   TEXT    NOT NULL,
      body    TEXT    NOT NULL DEFAULT ''
    )
  `);
}

// ---------------------------------------------------------------------------
// 1. CRUD lifecycle
// ---------------------------------------------------------------------------

test.describe("CRUD lifecycle", () => {
  test.beforeEach(async ({ sql }) => {
    await sql.execute(
      "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE)",
    );
  });

  test("inserts and selects a row", async ({ sql }) => {
    await sql.execute("INSERT INTO users VALUES (1, 'Alice', 'alice@example.com')");

    const { rows, rowCount } = await sql.query<User>("SELECT * FROM users");

    expect(rowCount).toBe(1);
    expect(rows[0]!.name).toBe("Alice");
    expect(rows[0]!.email).toBe("alice@example.com");
  });

  test("updates a row and reflects the change", async ({ sql }) => {
    await sql.execute("INSERT INTO users VALUES (1, 'Alice', 'alice@example.com')");
    await sql.execute("UPDATE users SET name = ? WHERE id = ?", ["Alicia", 1]);

    const { rows } = await sql.query<User>("SELECT name FROM users WHERE id = 1");

    expect(rows[0]!.name).toBe("Alicia");
  });

  test("deletes a row", async ({ sql }) => {
    await sql.execute("INSERT INTO users VALUES (1, 'Alice', 'alice@example.com')");
    await sql.execute("INSERT INTO users VALUES (2, 'Bob',   'bob@example.com')");

    await sql.execute("DELETE FROM users WHERE id = 1");

    const { rows, rowCount } = await sql.query<User>("SELECT * FROM users");

    expect(rowCount).toBe(1);
    expect(rows[0]!.id).toBe(2);
  });

  test("full cycle: insert → read → update → delete", async ({ sql }) => {
    // Insert
    await sql.execute("INSERT INTO users VALUES (1, 'Carol', 'carol@example.com')");
    let { rows } = await sql.query<User>("SELECT * FROM users WHERE id = 1");
    expect(rows[0]!.name).toBe("Carol");

    // Update
    await sql.execute("UPDATE users SET email = ? WHERE id = 1", ["c@example.com"]);
    ({ rows } = await sql.query<User>("SELECT email FROM users WHERE id = 1"));
    expect(rows[0]!.email).toBe("c@example.com");

    // Delete
    await sql.execute("DELETE FROM users WHERE id = 1");
    ({ rows } = await sql.query<User>("SELECT * FROM users WHERE id = 1"));
    expect(rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Relational schema with JOINs
// ---------------------------------------------------------------------------

test.describe("relational data", () => {
  test.beforeEach(async ({ sql }) => {
    await createSchema(sql);
    await sql.execute("INSERT INTO users VALUES (1, 'Alice', 'alice@example.com')");
    await sql.execute("INSERT INTO users VALUES (2, 'Bob',   'bob@example.com')");
    await sql.execute("INSERT INTO posts VALUES (1, 1, 'Hello World', 'First post')");
    await sql.execute("INSERT INTO posts VALUES (2, 1, 'Second Post', 'More content')");
    await sql.execute("INSERT INTO posts VALUES (3, 2, 'Bob''s post',  'Hi')");
  });

  test("JOIN returns correct combined rows", async ({ sql }) => {
    type Row = { name: string; title: string };
    const { rows } = await sql.query<Row>(`
      SELECT u.name, p.title
        FROM posts p
        JOIN users u ON u.id = p.user_id
       ORDER BY p.id
    `);

    expect(rows).toHaveLength(3);
    expect(rows[0]!.name).toBe("Alice");
    expect(rows[0]!.title).toBe("Hello World");
    expect(rows[2]!.name).toBe("Bob");
  });

  test("COUNT per user via GROUP BY", async ({ sql }) => {
    type Row = { name: string; post_count: number };
    const { rows } = await sql.query<Row>(`
      SELECT u.name, COUNT(p.id) AS post_count
        FROM users u
        LEFT JOIN posts p ON p.user_id = u.id
       GROUP BY u.id
       ORDER BY u.id
    `);

    expect(rows).toHaveLength(2);
    expect(rows[0]!.post_count).toBe(2); // Alice
    expect(rows[1]!.post_count).toBe(1); // Bob
  });

  test("filtering with WHERE + JOIN", async ({ sql }) => {
    type Row = { title: string };
    const { rows } = await sql.query<Row>(`
      SELECT p.title
        FROM posts p
        JOIN users u ON u.id = p.user_id
       WHERE u.name = ?
    `, ["Alice"]);

    expect(rows).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 3. Aggregations
// ---------------------------------------------------------------------------

test.describe("aggregations", () => {
  test.beforeEach(async ({ sql }) => {
    await sql.execute(
      "CREATE TABLE scores (id INTEGER PRIMARY KEY, player TEXT NOT NULL, value INTEGER NOT NULL)",
    );
    for (let i = 1; i <= 10; i++) {
      await sql.execute("INSERT INTO scores VALUES (?, ?, ?)", [
        i,
        i % 2 === 0 ? "even" : "odd",
        i * 10,
      ]);
    }
  });

  test("COUNT returns total row count", async ({ sql }) => {
    const { rows } = await sql.query<{ total: number }>(
      "SELECT COUNT(*) AS total FROM scores",
    );
    expect(rows[0]!.total).toBe(10);
  });

  test("SUM of values", async ({ sql }) => {
    const { rows } = await sql.query<{ s: number }>(
      "SELECT SUM(value) AS s FROM scores",
    );
    // 10+20+...+100 = 550
    expect(rows[0]!.s).toBe(550);
  });

  test("AVG per group", async ({ sql }) => {
    type Row = { player: string; avg: number };
    const { rows } = await sql.query<Row>(
      "SELECT player, AVG(value) AS avg FROM scores GROUP BY player ORDER BY player",
    );
    // even: 20+40+60+80+100 / 5 = 60; odd: 10+30+50+70+90 / 5 = 50
    const even = rows.find((r) => r.player === "even")!;
    const odd  = rows.find((r) => r.player === "odd")!;
    expect(even.avg).toBe(60);
    expect(odd.avg).toBe(50);
  });

  test("LIMIT + OFFSET paging", async ({ sql }) => {
    const page1 = await sql.query<{ id: number }>(
      "SELECT id FROM scores ORDER BY id LIMIT 3 OFFSET 0",
    );
    const page2 = await sql.query<{ id: number }>(
      "SELECT id FROM scores ORDER BY id LIMIT 3 OFFSET 3",
    );

    expect(page1.rows.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(page2.rows.map((r) => r.id)).toEqual([4, 5, 6]);
  });
});

// ---------------------------------------------------------------------------
// 4. Batch inserts
// ---------------------------------------------------------------------------

test.describe("batch operations", () => {
  test("inserts 100 rows and counts them correctly", async ({ sql }) => {
    await sql.execute("CREATE TABLE log (id INTEGER PRIMARY KEY, msg TEXT)");

    for (let i = 1; i <= 100; i++) {
      await sql.execute("INSERT INTO log VALUES (?, ?)", [i, `entry-${i}`]);
    }

    const { rows } = await sql.query<{ c: number }>(
      "SELECT COUNT(*) AS c FROM log",
    );
    expect(rows[0]!.c).toBe(100);
  });

  test("retrieves the last inserted row correctly", async ({ sql }) => {
    await sql.execute("CREATE TABLE log (id INTEGER PRIMARY KEY, msg TEXT)");

    for (let i = 1; i <= 10; i++) {
      await sql.execute("INSERT INTO log VALUES (?, ?)", [i, `msg-${i}`]);
    }

    const { rows } = await sql.query<{ msg: string }>(
      "SELECT msg FROM log ORDER BY id DESC LIMIT 1",
    );
    expect(rows[0]!.msg).toBe("msg-10");
  });
});

// ---------------------------------------------------------------------------
// 5. Constraint violations
// ---------------------------------------------------------------------------

test.describe("constraint enforcement", () => {
  test.beforeEach(async ({ sql }) => {
    await sql.execute(
      "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE)",
    );
  });

  test("UNIQUE constraint violation throws", async ({ sql }) => {
    await sql.execute("INSERT INTO users VALUES (1, 'a@b.com')");

    await expect(
      sql.execute("INSERT INTO users VALUES (2, 'a@b.com')"),
    ).rejects.toThrow(/unique/i);
  });

  test("NOT NULL constraint violation throws", async ({ sql }) => {
    await expect(
      sql.execute("INSERT INTO users (id) VALUES (1)"),
    ).rejects.toThrow();
  });

  test("valid insert after failed insert succeeds", async ({ sql }) => {
    await sql.execute("INSERT INTO users VALUES (1, 'a@b.com')");

    // This should fail
    await expect(
      sql.execute("INSERT INTO users VALUES (2, 'a@b.com')"),
    ).rejects.toThrow();

    // The connection must still work afterwards
    await sql.execute("INSERT INTO users VALUES (2, 'b@b.com')");
    const { rows } = await sql.query("SELECT * FROM users");
    expect(rows).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 6. Test isolation
// ---------------------------------------------------------------------------

test.describe("test isolation", () => {
  // All three tests use the same adapter but each gets its own in-memory DB.
  test.use({ sqlAdapter: sqliteAdapter(":memory:") });

  test.beforeEach(async ({ sql }) => {
    await sql.execute("CREATE TABLE counter (n INTEGER)");
  });

  test("test A inserts 1 row", async ({ sql }) => {
    await sql.execute("INSERT INTO counter VALUES (1)");
    const { rows } = await sql.query<{ n: number }>("SELECT * FROM counter");
    expect(rows).toHaveLength(1);
  });

  test("test B sees an empty table — no leakage from test A", async ({ sql }) => {
    const { rows } = await sql.query<{ n: number }>("SELECT * FROM counter");
    expect(rows).toHaveLength(0);
  });

  test("test C inserts 2 rows and sees exactly 2", async ({ sql }) => {
    await sql.execute("INSERT INTO counter VALUES (1)");
    await sql.execute("INSERT INTO counter VALUES (2)");
    const { rows } = await sql.query<{ n: number }>("SELECT * FROM counter");
    expect(rows).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 7. useSql + sql used together in the same test
// ---------------------------------------------------------------------------

test.describe("useSql alongside sql", () => {
  test("sql and useSql connections are independent in-memory DBs", async ({
    sql,
    useSql,
  }) => {
    const extra = await useSql(sqliteAdapter(":memory:"));

    await sql.execute("CREATE TABLE a (x INTEGER)");
    await sql.execute("INSERT INTO a VALUES (1)");

    await extra.execute("CREATE TABLE b (y INTEGER)");
    await extra.execute("INSERT INTO b VALUES (99)");

    const fromSql   = await sql.query<{ x: number }>("SELECT x FROM a");
    const fromExtra = await extra.query<{ y: number }>("SELECT y FROM b");

    expect(fromSql.rows[0]!.x).toBe(1);
    expect(fromExtra.rows[0]!.y).toBe(99);

    // Each DB is isolated — the other table must not exist
    await expect(sql.query("SELECT * FROM b")).rejects.toThrow();
    await expect(extra.query("SELECT * FROM a")).rejects.toThrow();
  });

  test("useSql connections share state when pointing to the same file", async ({
    useSql,
  }) => {
    const dbPath = join(tmpdir(), `pw-sql-${randomUUID()}.db`);

    try {
      const writer = await useSql(sqliteAdapter(dbPath));
      const reader = await useSql(sqliteAdapter(dbPath));

      await writer.execute("CREATE TABLE shared (id INTEGER, val TEXT)");
      await writer.execute("INSERT INTO shared VALUES (1, 'hello')");

      // reader opens the same file — it must see the row written by writer
      const { rows } = await reader.query<{ val: string }>(
        "SELECT val FROM shared WHERE id = 1",
      );
      expect(rows[0]!.val).toBe("hello");
    } finally {
      await rm(dbPath, { force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 8. Multiple sequential queries on the same connection
// ---------------------------------------------------------------------------

test.describe("sequential queries on one connection", () => {
  test("schema evolves correctly over a series of operations", async ({
    sql,
  }) => {
    // Step 1 — create and seed
    await sql.execute("CREATE TABLE events (id INTEGER PRIMARY KEY, kind TEXT)");
    for (const [id, kind] of [[1, "login"], [2, "click"], [3, "login"]] as const) {
      await sql.execute("INSERT INTO events VALUES (?, ?)", [id, kind]);
    }

    // Step 2 — query intermediate state
    const { rows: all } = await sql.query("SELECT * FROM events");
    expect(all).toHaveLength(3);

    // Step 3 — add a column with ALTER TABLE
    await sql.execute("ALTER TABLE events ADD COLUMN ts INTEGER DEFAULT 0");
    await sql.execute("UPDATE events SET ts = id * 1000");

    // Step 4 — verify final state
    type Row = { id: number; kind: string; ts: number };
    const { rows: updated } = await sql.query<Row>(
      "SELECT * FROM events ORDER BY id",
    );

    expect(updated[0]!.ts).toBe(1000);
    expect(updated[2]!.ts).toBe(3000);
  });
});
