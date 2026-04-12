import type { ClientConfig } from "pg";

import type { QueryResult, Row, SqlAdapter, SqlClient } from "../types.js";

export type PgAdapterConfig = ClientConfig | string;

/**
 * Creates a {@link SqlAdapter} backed by the `pg` (node-postgres) driver.
 *
 * @param config - A connection string (`postgresql://...`) or a `pg.ClientConfig` object
 *
 * @example
 * ```ts
 * import { test } from '@playwright-labs/fixture-sql';
 * import { pgAdapter } from '@playwright-labs/sql-core/pg';
 *
 * test.use({ sqlAdapter: pgAdapter('postgresql://user:pass@localhost:5432/mydb') });
 * ```
 */
export function pgAdapter(config: PgAdapterConfig): SqlAdapter {
  return {
    async create(): Promise<SqlClient> {
      const { Client } = await import("pg");
      const client = new Client(
        typeof config === "string" ? { connectionString: config } : config,
      );
      await client.connect();

      return {
        async query<T = Row>(
          sql: string,
          params?: unknown[],
        ): Promise<QueryResult<T>> {
          const result = await (client as any).query(sql, params as unknown[] | undefined);
          return {
            rows: result.rows as T[],
            rowCount: result.rowCount ?? 0,
            command: result.command,
          };
        },

        async execute(sql: string, params?: unknown[]): Promise<void> {
          await client.query(sql, params as unknown[] | undefined);
        },

        async close(): Promise<void> {
          await client.end();
        },

        async [Symbol.asyncDispose](): Promise<void> {
          await client.end();
        },
      } as SqlClient;
    },
  };
}
