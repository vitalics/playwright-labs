import { test, expect } from "@playwright/test";

import { sqliteAdapter } from "../../src/adapters/sqlite.js";

test.describe("sqliteAdapter", () => {
  test.describe("create()", () => {
    test("returns a SqlClient", async () => {
      const client = await sqliteAdapter(":memory:").create();

      expect(client).toHaveProperty("query");
      expect(client).toHaveProperty("execute");
      expect(client).toHaveProperty("close");

      await client.close();
    });

    test("each create() call opens an independent connection", async () => {
      const adapter = sqliteAdapter(":memory:");
      const a = await adapter.create();
      const b = await adapter.create();

      await a.execute("CREATE TABLE items (id INTEGER PRIMARY KEY, val TEXT)");
      await a.execute("INSERT INTO items VALUES (1, 'only-in-a')");

      // b is a separate in-memory DB — it has no 'items' table
      await expect(b.query("SELECT * FROM items")).rejects.toThrow();

      await a.close();
      await b.close();
    });
  });

  test.describe("execute()", () => {
    test("runs DDL without error", async () => {
      const client = await sqliteAdapter(":memory:").create();

      await expect(
        client.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)"),
      ).resolves.toBeUndefined();

      await client.close();
    });

    test("runs INSERT without error", async () => {
      const client = await sqliteAdapter(":memory:").create();
      await client.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)");

      await expect(
        client.execute("INSERT INTO users VALUES (?, ?)", [1, "Alice"]),
      ).resolves.toBeUndefined();

      await client.close();
    });

    test("runs UPDATE without error", async () => {
      const client = await sqliteAdapter(":memory:").create();
      await client.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)");
      await client.execute("INSERT INTO users VALUES (1, 'Alice')");

      await expect(
        client.execute("UPDATE users SET name = ? WHERE id = ?", ["Bob", 1]),
      ).resolves.toBeUndefined();

      await client.close();
    });

    test("throws on invalid SQL", async () => {
      const client = await sqliteAdapter(":memory:").create();

      await expect(client.execute("THIS IS NOT SQL")).rejects.toThrow();

      await client.close();
    });
  });

  test.describe("query()", () => {
    test("returns rows and rowCount", async () => {
      const client = await sqliteAdapter(":memory:").create();
      await client.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)");
      await client.execute("INSERT INTO users VALUES (1, 'Alice')");
      await client.execute("INSERT INTO users VALUES (2, 'Bob')");

      const result = await client.query("SELECT * FROM users ORDER BY id");

      expect(result.rows).toHaveLength(2);
      expect(result.rowCount).toBe(2);
      await client.close();
    });

    test("returns typed rows", async () => {
      const client = await sqliteAdapter(":memory:").create();
      await client.execute("CREATE TABLE products (id INTEGER, price REAL)");
      await client.execute("INSERT INTO products VALUES (42, 9.99)");

      type Product = { id: number; price: number };
      const { rows } = await client.query<Product>("SELECT * FROM products");

      expect(rows[0]!.id).toBe(42);
      expect(rows[0]!.price).toBeCloseTo(9.99);
      await client.close();
    });

    test("binds positional parameters", async () => {
      const client = await sqliteAdapter(":memory:").create();
      await client.execute("CREATE TABLE tags (id INTEGER, label TEXT)");
      await client.execute("INSERT INTO tags VALUES (1, 'alpha')");
      await client.execute("INSERT INTO tags VALUES (2, 'beta')");

      const { rows } = await client.query("SELECT * FROM tags WHERE id = ?", [2]);

      expect(rows).toHaveLength(1);
      expect((rows[0] as { label: string }).label).toBe("beta");
      await client.close();
    });

    test("returns empty rows when no matches", async () => {
      const client = await sqliteAdapter(":memory:").create();
      await client.execute("CREATE TABLE empty (id INTEGER)");

      const { rows, rowCount } = await client.query("SELECT * FROM empty");

      expect(rows).toEqual([]);
      expect(rowCount).toBe(0);
      await client.close();
    });

    test("supports NULL values", async () => {
      const client = await sqliteAdapter(":memory:").create();
      await client.execute("CREATE TABLE nullable (id INTEGER, val TEXT)");
      await client.execute("INSERT INTO nullable VALUES (1, NULL)");

      const { rows } = await client.query("SELECT * FROM nullable");

      expect((rows[0] as { val: unknown }).val).toBeNull();
      await client.close();
    });
  });

  test.describe("close()", () => {
    test("closes the connection", async () => {
      const client = await sqliteAdapter(":memory:").create();
      await client.execute("CREATE TABLE t (id INTEGER)");

      await client.close();

      // better-sqlite3 raises after close
      await expect(client.query("SELECT * FROM t")).rejects.toThrow();
    });

    test("calling close twice does not throw", async () => {
      const client = await sqliteAdapter(":memory:").create();

      await client.close();
      await expect(client.close()).resolves.toBeUndefined();
    });
  });

  test.describe("CRUD integration", () => {
    test("full lifecycle: insert → read → update → delete", async () => {
      const client = await sqliteAdapter(":memory:").create();

      await client.execute(
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE)",
      );

      await client.execute("INSERT INTO users VALUES (1, 'Alice', 'alice@example.com')");

      type User = { id: number; name: string; email: string };
      let { rows } = await client.query<User>("SELECT * FROM users WHERE id = 1");
      expect(rows[0]!.name).toBe("Alice");

      await client.execute("UPDATE users SET email = ? WHERE id = 1", ["a@example.com"]);
      ({ rows } = await client.query<User>("SELECT email FROM users WHERE id = 1"));
      expect(rows[0]!.email).toBe("a@example.com");

      await client.execute("DELETE FROM users WHERE id = 1");
      ({ rows } = await client.query<User>("SELECT * FROM users WHERE id = 1"));
      expect(rows).toHaveLength(0);

      await client.close();
    });

    test("JOIN returns combined rows", async () => {
      const client = await sqliteAdapter(":memory:").create();

      await client.execute(
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)",
      );
      await client.execute(
        "CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, title TEXT NOT NULL)",
      );
      await client.execute("INSERT INTO users VALUES (1, 'Alice'), (2, 'Bob')");
      await client.execute("INSERT INTO posts VALUES (1, 1, 'Post A'), (2, 2, 'Post B')");

      type Row = { name: string; title: string };
      const { rows } = await client.query<Row>(
        "SELECT u.name, p.title FROM posts p JOIN users u ON u.id = p.user_id ORDER BY p.id",
      );

      expect(rows).toHaveLength(2);
      expect(rows[0]!.name).toBe("Alice");
      expect(rows[1]!.name).toBe("Bob");

      await client.close();
    });

    test("UNIQUE constraint violation throws", async () => {
      const client = await sqliteAdapter(":memory:").create();
      await client.execute("CREATE TABLE t (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE)");
      await client.execute("INSERT INTO t VALUES (1, 'a@b.com')");

      await expect(
        client.execute("INSERT INTO t VALUES (2, 'a@b.com')"),
      ).rejects.toThrow(/unique/i);

      // connection still usable after error
      await client.execute("INSERT INTO t VALUES (2, 'b@b.com')");
      const { rows } = await client.query("SELECT * FROM t");
      expect(rows).toHaveLength(2);

      await client.close();
    });
  });
});
