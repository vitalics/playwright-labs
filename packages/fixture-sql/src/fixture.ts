import { expect as baseExpect, test as baseTest } from "@playwright/test";

import type { SqlAdapter, SqlClient } from "@playwright-labs/sql-core";

export type Fixture = {
  /**
   * The active SQL connection for this test.
   * Automatically opened before the test and closed after it.
   *
   * Requires `sqlAdapter` to be configured via `test.use()`:
   * ```ts
   * import { pgAdapter } from '@playwright-labs/fixture-sql/pg';
   * test.use({ sqlAdapter: pgAdapter('postgresql://user:pass@localhost/db') });
   * ```
   */
  sql: SqlClient;

  /**
   * Opens a SQL connection using the given adapter and registers it for
   * automatic cleanup at the end of the test. Useful when you need multiple
   * connections or a different adapter for a single test.
   *
   * @example
   * ```ts
   * test('two connections', async ({ useSql }) => {
   *   const conn1 = await useSql(pgAdapter(urlA));
   *   const conn2 = await useSql(pgAdapter(urlB));
   * });
   * ```
   */
  useSql(adapter: SqlAdapter): Promise<SqlClient>;

  /**
   * SQL adapter used by the {@link sql} fixture.
   * Set once per file / describe block via `test.use({ sqlAdapter: ... })`.
   */
  sqlAdapter: SqlAdapter | undefined;
};

export const test = baseTest.extend<Fixture>({
  // Option fixture — no live resource, just a config object.
  sqlAdapter: [undefined as unknown as SqlAdapter, { option: true }],

  useSql: async ({}, use) => {
    const clients: SqlClient[] = [];

    await use(async (adapter: SqlAdapter) => {
      const client = await adapter.create();
      clients.push(client);
      return client;
    });

    await Promise.all(clients.map((c) => c.close().catch(() => {})));
  },

  sql: async ({ sqlAdapter, useSql }, use) => {
    if (sqlAdapter == null) {
      throw new Error(
        [
          "No SQL adapter configured.",
          "Add the following before your tests:",
          "",
          "  import { pgAdapter } from '@playwright-labs/fixture-sql/pg';",
          "  test.use({ sqlAdapter: pgAdapter('postgresql://user:pass@localhost/db') });",
        ].join("\n"),
      );
    }
    const client = await useSql(sqlAdapter);
    await use(client);
  },
});
