import type { QueryResult, Row, SqlAdapter, SqlClient } from "../types.js";

/**
 * Creates a {@link SqlAdapter} backed by the `better-sqlite3` driver.
 *
 * SQLite is synchronous under the hood; the returned {@link SqlClient} methods
 * are wrapped in Promises for API consistency with other adapters.
 *
 * @param filename - Path to the SQLite database file, or `':memory:'` for an in-memory database
 *
 * @example
 * ```ts
 * import { test } from '@playwright-labs/fixture-sql';
 * import { sqliteAdapter } from '@playwright-labs/sql-core/sqlite';
 *
 * test.use({ sqlAdapter: sqliteAdapter(':memory:') });
 * ```
 */
export function sqliteAdapter(filename: string): SqlAdapter {
  return {
    async create(): Promise<SqlClient> {
      const { default: Database } = await import("better-sqlite3");
      const db = new Database(filename);

      return {
        async query<T = Row>(
          sql: string,
          params?: unknown[],
        ): Promise<QueryResult<T>> {
          const stmt = db.prepare(sql);
          const rows = stmt.all(...(params ?? [])) as T[];
          return { rows, rowCount: rows.length };
        },

        async execute(sql: string, params?: unknown[]): Promise<void> {
          const stmt = db.prepare(sql);
          stmt.run(...(params ?? []));
        },

        async close(): Promise<void> {
          db.close();
        },

        async [Symbol.asyncDispose](): Promise<void> {
          db.close();
        },
      } as SqlClient;
    },
  };
}
