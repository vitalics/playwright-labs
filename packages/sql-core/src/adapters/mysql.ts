import type { ConnectionOptions } from "mysql2/promise";

import type { QueryResult, Row, SqlAdapter, SqlClient } from "../types.js";

export type MySqlAdapterConfig = ConnectionOptions | string;

/**
 * Creates a {@link SqlAdapter} backed by the `mysql2` driver.
 *
 * @param config - A connection string (`mysql://...`) or a `mysql2.ConnectionOptions` object
 *
 * @example
 * ```ts
 * import { test } from '@playwright-labs/fixture-sql';
 * import { mysqlAdapter } from '@playwright-labs/sql-core/mysql';
 *
 * test.use({ sqlAdapter: mysqlAdapter('mysql://user:pass@localhost:3306/mydb') });
 * ```
 */
export function mysqlAdapter(config: MySqlAdapterConfig): SqlAdapter {
  return {
    async create(): Promise<SqlClient> {
      const mysql = await import("mysql2/promise");
      const connection = await (mysql as any).createConnection(config);

      return {
        async query<T = Row>(
          sql: string,
          params?: unknown[],
        ): Promise<QueryResult<T>> {
          const [rows] = await (connection as any).execute(sql, params);
          const rowsArray = Array.isArray(rows) ? (rows as T[]) : [];
          return {
            rows: rowsArray,
            rowCount: rowsArray.length,
          };
        },

        async execute(sql: string, params?: unknown[]): Promise<void> {
          await (connection as any).execute(sql, params);
        },

        async close(): Promise<void> {
          await connection.end();
        },

        async [Symbol.asyncDispose](): Promise<void> {
          await connection.end();
        },
      } as SqlClient;
    },
  };
}
