/**
 * Testable internals of the `pull` CLI.
 *
 * Exported so that tests can exercise pure functions (type mappers,
 * code generator, CLI arg parser) and the SQLite introspection path
 * without spawning a child process.
 */

import type { SqlClient } from "../src/index.js";

// ─── CLI argument parsing ─────────────────────────────────────────────────

export function parseArgs(argv: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        result[key] = next;
        i++;
      } else {
        result[key] = "true";
      }
    }
  }
  return result;
}

// ─── Schema types ─────────────────────────────────────────────────────────

export interface ColumnInfo {
  name: string;
  /** Raw DB type string, e.g. "INTEGER", "character varying", "tinyint" */
  type: string;
  nullable: boolean;
}

export interface TableSchema {
  name: string;
  columns: ColumnInfo[];
}

// ─── DB type → TypeScript type mappings ──────────────────────────────────

export function sqliteToTS(rawType: string, nullable: boolean): string {
  const base = (rawType.split("(")[0] ?? "").trim().toUpperCase();
  let ts: string;
  if (/^(INTEGER|INT|SMALLINT|BIGINT|TINYINT|MEDIUMINT)$/.test(base)) ts = "number";
  else if (/^(REAL|FLOAT|DOUBLE|DECIMAL|NUMERIC)$/.test(base)) ts = "number";
  else if (/^(TEXT|VARCHAR|CHAR|CLOB|NCHAR|NVARCHAR)$/.test(base)) ts = "string";
  else if (base === "BOOLEAN") ts = "boolean";
  else if (/^(BLOB|BINARY|VARBINARY)$/.test(base)) ts = "Buffer";
  else if (/^(DATE|DATETIME|TIMESTAMP|TIME)$/.test(base)) ts = "string";
  else ts = "unknown";
  return nullable ? `${ts} | null` : ts;
}

export function pgToTS(dataType: string, nullable: boolean): string {
  const dt = dataType.toLowerCase();
  let ts: string;
  if (/^(integer|bigint|smallint|serial|bigserial|smallserial|int2|int4|int8)$/.test(dt))
    ts = "number";
  else if (/^(numeric|decimal|real|double precision|float4|float8|money)$/.test(dt))
    ts = "number";
  else if (/^(text|varchar|character varying|char|character|name|uuid|citext)$/.test(dt))
    ts = "string";
  else if (/^(boolean|bool)$/.test(dt)) ts = "boolean";
  else if (
    /^(timestamp|timestamp without time zone|timestamp with time zone|timestamptz|date|time|timetz|interval)$/.test(
      dt,
    )
  )
    ts = "string";
  else if (/^(json|jsonb)$/.test(dt)) ts = "unknown";
  else if (dt === "bytea") ts = "Buffer";
  else if (dt.endsWith("[]")) ts = "unknown[]";
  else ts = "unknown";
  return nullable ? `${ts} | null` : ts;
}

export function mysqlToTS(dataType: string, nullable: boolean): string {
  const dt = dataType.toLowerCase();
  let ts: string;
  if (/^(int|integer|bigint|smallint|tinyint|mediumint|year)$/.test(dt)) ts = "number";
  else if (/^(float|double|decimal|numeric|real)$/.test(dt)) ts = "number";
  else if (/^(varchar|char|text|tinytext|mediumtext|longtext|enum|set)$/.test(dt))
    ts = "string";
  else if (/^(boolean|bool)$/.test(dt)) ts = "boolean";
  else if (/^(datetime|timestamp|date|time)$/.test(dt)) ts = "string";
  else if (dt === "json") ts = "unknown";
  else if (/^(binary|varbinary|blob|tinyblob|mediumblob|longblob)$/.test(dt)) ts = "Buffer";
  else ts = "unknown";
  return nullable ? `${ts} | null` : ts;
}

// ─── Schema introspection ─────────────────────────────────────────────────

export async function introspectSQLite(client: SqlClient): Promise<TableSchema[]> {
  const { rows: tables } = await client.query<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );

  const schemas: TableSchema[] = [];
  for (const { name } of tables) {
    const safe = name.replace(/'/g, "''");
    const { rows: cols } = await client.query<{
      name: string;
      type: string;
      notnull: number;
      pk: number;
    }>(`PRAGMA table_info('${safe}')`);

    schemas.push({
      name,
      columns: cols.map((c) => ({
        name: c.name,
        type: c.type,
        nullable: c.notnull === 0 && c.pk === 0,
      })),
    });
  }
  return schemas;
}

export async function introspectPg(client: SqlClient): Promise<TableSchema[]> {
  const { rows: tables } = await client.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const schemas: TableSchema[] = [];
  for (const { table_name } of tables) {
    const { rows: cols } = await client.query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [table_name],
    );

    schemas.push({
      name: table_name,
      columns: cols.map((c) => ({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable === "YES",
      })),
    });
  }
  return schemas;
}

export async function introspectMySQL(client: SqlClient): Promise<TableSchema[]> {
  const { rows: tables } = await client.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const schemas: TableSchema[] = [];
  for (const { table_name } of tables) {
    const { rows: cols } = await client.query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ?
       ORDER BY ordinal_position`,
      [table_name],
    );

    schemas.push({
      name: table_name,
      columns: cols.map((c) => ({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable === "YES",
      })),
    });
  }
  return schemas;
}

// ─── Code generation ──────────────────────────────────────────────────────

export function toPascalCase(s: string): string {
  return s
    .split(/[_\s-]+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

export function generateTypes(
  schemas: TableSchema[],
  toTS: (type: string, nullable: boolean) => string,
  adapterName: string,
  url: string,
): string {
  const lines: string[] = [
    `// Auto-generated by @playwright-labs/sql-core`,
    `// Adapter : ${adapterName}`,
    `// Source  : ${url}`,
    `// Generated: ${new Date().toISOString()}`,
    `// Do not edit this file manually — re-run \`@playwright-labs/sql-core pull\` to refresh.`,
    ``,
  ];

  const pairs: Array<[table: string, iface: string]> = [];

  for (const { name, columns } of schemas) {
    const iface = `${toPascalCase(name)}Row`;
    pairs.push([name, iface]);

    lines.push(`/** Row type for the \`${name}\` table */`);
    lines.push(`export interface ${iface} {`);
    for (const col of columns) {
      lines.push(`  ${col.name}: ${toTS(col.type, col.nullable)};`);
    }
    lines.push(`}`);
    lines.push(``);
  }

  if (pairs.length > 0) {
    lines.push(`/** All table row types, keyed by table name. */`);
    lines.push(`export type Tables = {`);
    for (const [tbl, iface] of pairs) {
      lines.push(`  ${tbl}: ${iface};`);
    }
    lines.push(`};`);
    lines.push(``);
  }

  return lines.join("\n");
}
