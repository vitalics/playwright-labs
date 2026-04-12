/**
 * Tests for bin/pull-lib.ts and the pull CLI (bin/cli.ts).
 *
 * Test structure:
 *   §1  parseArgs           — CLI flag parsing
 *   §2  toPascalCase        — identifier casing
 *   §3  sqliteToTS          — SQLite → TS type mapper
 *   §4  pgToTS              — PostgreSQL → TS type mapper
 *   §5  mysqlToTS           — MySQL → TS type mapper
 *   §6  generateTypes       — code-generation output shape
 *   §7  introspectSQLite    — live schema introspection (in-memory DB)
 *   §8  pull CLI (e2e)      — spawns the script, checks stdout/exit code
 */

import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { rm, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  parseArgs,
  toPascalCase,
  sqliteToTS,
  pgToTS,
  mysqlToTS,
  generateTypes,
  introspectSQLite,
} from "../bin/pull-lib.js";
import { sqliteAdapter } from "../src/adapters/sqlite.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ─── §1 parseArgs ────────────────────────────────────────────────────────────

test.describe("parseArgs", () => {
  test("parses --key value pairs", () => {
    expect(parseArgs(["--adapter", "sqlite", "--url", "./dev.db"])).toEqual({
      adapter: "sqlite",
      url: "./dev.db",
    });
  });

  test("parses a standalone flag as 'true'", () => {
    expect(parseArgs(["--verbose"])).toEqual({ verbose: "true" });
  });

  test("returns empty object for no args", () => {
    expect(parseArgs([])).toEqual({});
  });

  test("stops consuming value at the next --flag", () => {
    expect(parseArgs(["--adapter", "sqlite", "--verbose"])).toEqual({
      adapter: "sqlite",
      verbose: "true",
    });
  });

  test("handles --out path with spaces when quoted by shell", () => {
    expect(parseArgs(["--out", "./my output/types.ts"])).toEqual({
      out: "./my output/types.ts",
    });
  });
});

// ─── §2 toPascalCase ─────────────────────────────────────────────────────────

test.describe("toPascalCase", () => {
  test("snake_case → PascalCase", () => {
    expect(toPascalCase("user_profiles")).toBe("UserProfiles");
  });

  test("single word capitalised", () => {
    expect(toPascalCase("users")).toBe("Users");
  });

  test("kebab-case → PascalCase", () => {
    expect(toPascalCase("order-items")).toBe("OrderItems");
  });

  test("already PascalCase is unchanged", () => {
    expect(toPascalCase("OrderItems")).toBe("OrderItems");
  });

  test("triple-word snake", () => {
    expect(toPascalCase("audit_log_entries")).toBe("AuditLogEntries");
  });
});

// ─── §3 sqliteToTS ───────────────────────────────────────────────────────────

test.describe("sqliteToTS", () => {
  const cases: Array<[raw: string, nullable: boolean, expected: string]> = [
    // integers
    ["INTEGER", false, "number"],
    ["INT", false, "number"],
    ["BIGINT", false, "number"],
    ["TINYINT", false, "number"],
    ["MEDIUMINT", false, "number"],
    ["SMALLINT", false, "number"],
    // floats
    ["REAL", false, "number"],
    ["FLOAT", false, "number"],
    ["DOUBLE", false, "number"],
    ["DECIMAL", false, "number"],
    ["NUMERIC", false, "number"],
    // strings
    ["TEXT", false, "string"],
    ["VARCHAR(255)", false, "string"],   // with precision
    ["CHAR", false, "string"],
    ["CLOB", false, "string"],
    ["NCHAR", false, "string"],
    ["NVARCHAR", false, "string"],
    // other
    ["BOOLEAN", false, "boolean"],
    ["BLOB", false, "Buffer"],
    ["BINARY", false, "Buffer"],
    ["VARBINARY", false, "Buffer"],
    ["DATE", false, "string"],
    ["DATETIME", false, "string"],
    ["TIMESTAMP", false, "string"],
    ["TIME", false, "string"],
    ["JSONDATA", false, "unknown"],      // unknown type
    // nullable variants
    ["TEXT", true, "string | null"],
    ["INTEGER", true, "number | null"],
    ["BOOLEAN", true, "boolean | null"],
  ];

  for (const [raw, nullable, expected] of cases) {
    test(`${raw} + nullable=${nullable} → ${expected}`, () => {
      expect(sqliteToTS(raw, nullable)).toBe(expected);
    });
  }
});

// ─── §4 pgToTS ───────────────────────────────────────────────────────────────

test.describe("pgToTS", () => {
  const cases: Array<[raw: string, nullable: boolean, expected: string]> = [
    ["integer", false, "number"],
    ["bigint", false, "number"],
    ["smallint", false, "number"],
    ["serial", false, "number"],
    ["bigserial", false, "number"],
    ["numeric", false, "number"],
    ["decimal", false, "number"],
    ["real", false, "number"],
    ["double precision", false, "number"],
    ["float4", false, "number"],
    ["float8", false, "number"],
    ["money", false, "number"],
    ["text", false, "string"],
    ["varchar", false, "string"],
    ["character varying", false, "string"],
    ["char", false, "string"],
    ["uuid", false, "string"],
    ["citext", false, "string"],
    ["boolean", false, "boolean"],
    ["bool", false, "boolean"],
    ["timestamp", false, "string"],
    ["timestamp without time zone", false, "string"],
    ["timestamp with time zone", false, "string"],
    ["timestamptz", false, "string"],
    ["date", false, "string"],
    ["time", false, "string"],
    ["interval", false, "string"],
    ["json", false, "unknown"],
    ["jsonb", false, "unknown"],
    ["bytea", false, "Buffer"],
    ["integer[]", false, "unknown[]"],
    ["text[]", false, "unknown[]"],
    ["custom_type", false, "unknown"],
    // nullable
    ["text", true, "string | null"],
    ["integer", true, "number | null"],
  ];

  for (const [raw, nullable, expected] of cases) {
    test(`${raw} + nullable=${nullable} → ${expected}`, () => {
      expect(pgToTS(raw, nullable)).toBe(expected);
    });
  }
});

// ─── §5 mysqlToTS ────────────────────────────────────────────────────────────

test.describe("mysqlToTS", () => {
  const cases: Array<[raw: string, nullable: boolean, expected: string]> = [
    ["int", false, "number"],
    ["integer", false, "number"],
    ["bigint", false, "number"],
    ["smallint", false, "number"],
    ["tinyint", false, "number"],
    ["mediumint", false, "number"],
    ["year", false, "number"],
    ["float", false, "number"],
    ["double", false, "number"],
    ["decimal", false, "number"],
    ["numeric", false, "number"],
    ["real", false, "number"],
    ["varchar", false, "string"],
    ["char", false, "string"],
    ["text", false, "string"],
    ["tinytext", false, "string"],
    ["mediumtext", false, "string"],
    ["longtext", false, "string"],
    ["enum", false, "string"],
    ["set", false, "string"],
    ["boolean", false, "boolean"],
    ["bool", false, "boolean"],
    ["datetime", false, "string"],
    ["timestamp", false, "string"],
    ["date", false, "string"],
    ["time", false, "string"],
    ["json", false, "unknown"],
    ["binary", false, "Buffer"],
    ["varbinary", false, "Buffer"],
    ["blob", false, "Buffer"],
    ["tinyblob", false, "Buffer"],
    ["mediumblob", false, "Buffer"],
    ["longblob", false, "Buffer"],
    ["geometry", false, "unknown"],
    // nullable
    ["varchar", true, "string | null"],
    ["int", true, "number | null"],
  ];

  for (const [raw, nullable, expected] of cases) {
    test(`${raw} + nullable=${nullable} → ${expected}`, () => {
      expect(mysqlToTS(raw, nullable)).toBe(expected);
    });
  }
});

// ─── §6 generateTypes ────────────────────────────────────────────────────────

test.describe("generateTypes", () => {
  const simpleSchema = [
    {
      name: "users",
      columns: [
        { name: "id", type: "INTEGER", nullable: false },
        { name: "name", type: "TEXT", nullable: false },
        { name: "email", type: "TEXT", nullable: true },
      ],
    },
  ];

  test("emits auto-generated header comment", () => {
    const out = generateTypes(simpleSchema, sqliteToTS, "sqlite", ":memory:");
    expect(out).toContain("// Auto-generated by @playwright-labs/sql-core");
    expect(out).toContain("// Adapter : sqlite");
    expect(out).toContain("// Source  : :memory:");
  });

  test("emits export interface with PascalCase name + Row suffix", () => {
    const out = generateTypes(simpleSchema, sqliteToTS, "sqlite", ":memory:");
    expect(out).toContain("export interface UsersRow {");
  });

  test("emits correct field types", () => {
    const out = generateTypes(simpleSchema, sqliteToTS, "sqlite", ":memory:");
    expect(out).toContain("  id: number;");
    expect(out).toContain("  name: string;");
    expect(out).toContain("  email: string | null;");
  });

  test("emits Tables type with all table names", () => {
    const out = generateTypes(simpleSchema, sqliteToTS, "sqlite", ":memory:");
    expect(out).toContain("export type Tables = {");
    expect(out).toContain("  users: UsersRow;");
  });

  test("handles multiple tables", () => {
    const schemas = [
      ...simpleSchema,
      {
        name: "order_items",
        columns: [{ name: "id", type: "INTEGER", nullable: false }],
      },
    ];
    const out = generateTypes(schemas, sqliteToTS, "sqlite", ":memory:");
    expect(out).toContain("export interface UsersRow {");
    expect(out).toContain("export interface OrderItemsRow {");
    expect(out).toContain("  users: UsersRow;");
    expect(out).toContain("  order_items: OrderItemsRow;");
  });

  test("returns only header for empty schema", () => {
    const out = generateTypes([], sqliteToTS, "sqlite", ":memory:");
    expect(out).toContain("// Auto-generated");
    expect(out).not.toContain("export interface");
    expect(out).not.toContain("export type Tables");
  });

  test("table name with single quotes in it is safe (PascalCase step)", () => {
    // Tables containing apostrophes should not crash code-gen.
    const schemas = [{ name: "user's_data", columns: [] }];
    expect(() => generateTypes(schemas, sqliteToTS, "sqlite", ":memory:")).not.toThrow();
  });
});

// ─── §7 introspectSQLite ─────────────────────────────────────────────────────

test.describe("introspectSQLite", () => {
  async function makeClient(ddl: string) {
    const client = await sqliteAdapter(":memory:").create();
    for (const stmt of ddl
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)) {
      await client.execute(stmt);
    }
    return client;
  }

  test("returns empty array for a DB with no user tables", async () => {
    const client = await sqliteAdapter(":memory:").create();
    const schemas = await introspectSQLite(client);
    await client.close();
    expect(schemas).toEqual([]);
  });

  test("returns schema for a single table", async () => {
    const client = await makeClient(
      "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT)",
    );
    const schemas = await introspectSQLite(client);
    await client.close();

    expect(schemas).toHaveLength(1);
    expect(schemas[0]!.name).toBe("users");
  });

  test("PRIMARY KEY column is not nullable", async () => {
    const client = await makeClient(
      "CREATE TABLE t (id INTEGER PRIMARY KEY, val TEXT)",
    );
    const [schema] = await introspectSQLite(client);
    await client.close();

    const idCol = schema!.columns.find((c) => c.name === "id")!;
    expect(idCol.nullable).toBe(false);
  });

  test("NOT NULL column is not nullable", async () => {
    const client = await makeClient(
      "CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT NOT NULL)",
    );
    const [schema] = await introspectSQLite(client);
    await client.close();

    const nameCol = schema!.columns.find((c) => c.name === "name")!;
    expect(nameCol.nullable).toBe(false);
  });

  test("column without NOT NULL constraint is nullable", async () => {
    const client = await makeClient(
      "CREATE TABLE t (id INTEGER PRIMARY KEY, bio TEXT)",
    );
    const [schema] = await introspectSQLite(client);
    await client.close();

    const bioCol = schema!.columns.find((c) => c.name === "bio")!;
    expect(bioCol.nullable).toBe(true);
  });

  test("column order is preserved", async () => {
    const client = await makeClient(
      "CREATE TABLE t (a TEXT, b INTEGER, c REAL)",
    );
    const [schema] = await introspectSQLite(client);
    await client.close();

    expect(schema!.columns.map((c) => c.name)).toEqual(["a", "b", "c"]);
  });

  test("multiple tables are returned in alphabetical order", async () => {
    const client = await makeClient(`
      CREATE TABLE zebra (id INTEGER PRIMARY KEY);
      CREATE TABLE apple (id INTEGER PRIMARY KEY);
      CREATE TABLE mango (id INTEGER PRIMARY KEY)
    `);
    const schemas = await introspectSQLite(client);
    await client.close();

    expect(schemas.map((s) => s.name)).toEqual(["apple", "mango", "zebra"]);
  });

  test("raw type string is preserved as-is", async () => {
    const client = await makeClient(
      "CREATE TABLE t (score DECIMAL(10,2) NOT NULL)",
    );
    const [schema] = await introspectSQLite(client);
    await client.close();

    expect(schema!.columns[0]!.type).toBe("DECIMAL(10,2)");
  });
});

// ─── §8 pull CLI (e2e) ───────────────────────────────────────────────────────

test.describe("pull CLI", () => {
  // Invoke via: tsx bin/cli.ts pull [args…]
  function runPull(...args: string[]) {
    return spawnSync("pnpm", ["exec", "tsx", "bin/cli.ts", "pull", ...args], {
      cwd: ROOT,
      encoding: "utf8",
    });
  }

  // Invoke the top-level program (no sub-command) to test global help / errors
  function runCli(...args: string[]) {
    return spawnSync("pnpm", ["exec", "tsx", "bin/cli.ts", ...args], {
      cwd: ROOT,
      encoding: "utf8",
    });
  }

  test("top-level --help exits 0 and lists pull command", () => {
    const result = runCli("--help");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("pull");
  });

  test("exits non-zero and prints usage when --adapter and --url are missing", () => {
    const result = runPull();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("required option");
  });

  test("exits non-zero when --adapter is unknown", () => {
    const result = runPull("--adapter", "oracle", "--url", "jdbc://...");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Unknown adapter");
  });

  test("exits non-zero when only --adapter is provided (missing --url)", () => {
    const result = runPull("--adapter", "sqlite");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("required option");
  });

  test("writes types to stdout for an empty SQLite DB", () => {
    const result = runPull("--adapter", "sqlite", "--url", ":memory:");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("// Auto-generated by @playwright-labs/sql-core");
  });

  test("output contains correct table types for a pre-seeded file DB", async () => {
    const dbPath = join(tmpdir(), `pull-e2e-${randomUUID()}.db`);
    try {
      const { default: Database } = await import("better-sqlite3");
      const db = new Database(dbPath);
      db.exec(
        "CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price REAL)",
      );
      db.close();

      const result = runPull("--adapter", "sqlite", "--url", dbPath);
      expect(result.status).toBe(0);

      const out = result.stdout;
      expect(out).toContain("export interface ProductsRow {");
      expect(out).toContain("  id: number;");
      expect(out).toContain("  name: string;");
      expect(out).toContain("  price: number | null;");
      expect(out).toContain("export type Tables = {");
      expect(out).toContain("  products: ProductsRow;");
    } finally {
      await rm(dbPath, { force: true });
    }
  });

  test("writes output to --out file instead of stdout", async () => {
    const dbPath = join(tmpdir(), `pull-out-${randomUUID()}.db`);
    const outPath = join(tmpdir(), `pull-out-${randomUUID()}.ts`);

    try {
      const { default: Database } = await import("better-sqlite3");
      const db = new Database(dbPath);
      db.exec("CREATE TABLE events (id INTEGER PRIMARY KEY, kind TEXT NOT NULL)");
      db.close();

      const result = runPull(
        "--adapter", "sqlite",
        "--url", dbPath,
        "--out", outPath,
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("types written");

      const written = await readFile(outPath, "utf8");
      expect(written).toContain("export interface EventsRow {");
    } finally {
      await rm(dbPath, { force: true });
      await rm(outPath, { force: true });
    }
  });

  test("output includes Adapter and Source header lines", async () => {
    const dbPath = join(tmpdir(), `pull-hdr-${randomUUID()}.db`);
    try {
      const { default: Database } = await import("better-sqlite3");
      const db = new Database(dbPath);
      db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY)");
      db.close();

      const result = runPull("--adapter", "sqlite", "--url", dbPath);
      expect(result.stdout).toContain("// Adapter : sqlite");
      expect(result.stdout).toContain(`// Source  : ${dbPath}`);
    } finally {
      await rm(dbPath, { force: true });
    }
  });
});
