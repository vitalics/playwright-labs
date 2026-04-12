import { test, expect } from "@playwright/test";

import { sql } from "../src/sql-tag.js";

test.describe("sql tag", () => {
  test.describe("static (no interpolations)", () => {
    test("returns the literal SQL string unchanged", () => {
      const result = sql`SELECT * FROM users`;
      expect(result).toBe("SELECT * FROM users");
    });

    test("preserves ? placeholders as-is", () => {
      const result = sql`SELECT * FROM users WHERE id = ?`;
      expect(result).toBe("SELECT * FROM users WHERE id = ?");
    });

    test("preserves $N placeholders as-is", () => {
      const result = sql`SELECT * FROM users WHERE id = $1`;
      expect(result).toBe("SELECT * FROM users WHERE id = $1");
    });

    test("handles multi-line SQL", () => {
      const result = sql`
        SELECT id, name
        FROM users
        WHERE active = 1
        ORDER BY name
      `;
      expect(result).toContain("SELECT id, name");
      expect(result).toContain("FROM users");
    });

    test("returns a string at runtime", () => {
      const result = sql`SELECT 1`;
      expect(typeof result).toBe("string");
    });
  });

  test.describe("interpolated (with expressions)", () => {
    test("concatenates a string value inline", () => {
      const table = "orders";
      const result = sql`SELECT * FROM ${table}`;
      expect(result).toBe("SELECT * FROM orders");
    });

    test("concatenates a number value inline", () => {
      const id = 42;
      const result = sql`SELECT * FROM users WHERE id = ${id}`;
      expect(result).toBe("SELECT * FROM users WHERE id = 42");
    });

    test("concatenates multiple interpolations", () => {
      const col = "email";
      const val = "alice@example.com";
      const result = sql`SELECT ${col} FROM users WHERE email = '${val}'`;
      expect(result).toBe("SELECT email FROM users WHERE email = 'alice@example.com'");
    });

    test("returns a plain string", () => {
      const tbl = "users";
      const result = sql`SELECT * FROM ${tbl}`;
      expect(typeof result).toBe("string");
    });
  });

  test.describe("plain string call (sql(...))", () => {
    test("returns the string unchanged", () => {
      const result = sql("SELECT * FROM users");
      expect(result).toBe("SELECT * FROM users");
    });

    test("preserves ? placeholders", () => {
      const result = sql("SELECT * FROM users WHERE id = ?");
      expect(result).toBe("SELECT * FROM users WHERE id = ?");
    });

    test("preserves $N placeholders", () => {
      const result = sql("SELECT * FROM users WHERE id = $1");
      expect(result).toBe("SELECT * FROM users WHERE id = $1");
    });

    test("plain string sql can be passed to execute()", async () => {
      const { sqliteAdapter } = await import("../src/adapters/sqlite.js");
      const client = await sqliteAdapter(":memory:").create();

      await client.execute(sql("CREATE TABLE t (id INTEGER)"));
      await client.execute(sql("INSERT INTO t VALUES (1)"));

      const { rows } = await client.query(sql("SELECT * FROM t"));
      expect(rows).toHaveLength(1);

      await client.close();
    });

    test("plain string sql with params works end-to-end", async () => {
      const { sqliteAdapter } = await import("../src/adapters/sqlite.js");
      const client = await sqliteAdapter(":memory:").create();

      await client.execute(sql("CREATE TABLE t (id INTEGER, val TEXT)"));
      await client.execute(sql("INSERT INTO t VALUES (?, ?)"), [1, "hello"]);

      const { rows } = await client.query<{ val: string }>(
        sql("SELECT val FROM t WHERE id = ?"),
        [1],
      );
      expect(rows[0]!.val).toBe("hello");

      await client.close();
    });
  });

  test.describe("runtime behaviour with SqlClient", () => {
    test("static sql can be passed to execute()", async () => {
      const { sqliteAdapter } = await import("../src/adapters/sqlite.js");
      const client = await sqliteAdapter(":memory:").create();

      await client.execute(sql`CREATE TABLE t (id INTEGER)`);
      await client.execute(sql`INSERT INTO t VALUES (1)`);

      const { rows } = await client.query(sql`SELECT * FROM t`);
      expect(rows).toHaveLength(1);

      await client.close();
    });

    test("static sql with ? params works end-to-end", async () => {
      const { sqliteAdapter } = await import("../src/adapters/sqlite.js");
      const client = await sqliteAdapter(":memory:").create();

      await client.execute(sql`CREATE TABLE t (id INTEGER, val TEXT)`);
      await client.execute(sql`INSERT INTO t VALUES (?, ?)`, [1, "hello"]);

      const { rows } = await client.query<{ val: string }>(
        sql`SELECT val FROM t WHERE id = ?`,
        [1],
      );
      expect(rows[0]!.val).toBe("hello");

      await client.close();
    });
  });
});
