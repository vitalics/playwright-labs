import { expect as baseExpect } from "@playwright/test";

import type { SqlClient } from "@playwright-labs/sql-core";

/**
 * Custom SQL matchers added to Playwright's `expect`.
 *
 * `R` is the type of the received value — used to enforce that
 * `toMatchSchema<T>()` is only callable when the value is assignable to `T`.
 *
 * @example
 * ```ts
 * interface UserRow { id: number; name: string }
 * const row: UserRow = { id: 1, name: 'Alice' };
 *
 * await expect(db).toBeSqlConnected();
 * await expect(db).toHaveSqlTable('users');
 * await expect(row).toMatchSchema<UserRow>();  // ✅
 * await expect("oops").toMatchSchema<UserRow>(); // ❌ compile error
 * ```
 */
export interface SqlMatchers<R = unknown> {
  /** Assert that the `SqlClient` connection is alive. */
  toBeSqlConnected(): Promise<void>;
  /** Assert that a table with the given name exists in the database. */
  toHaveSqlTable(tableName: string): Promise<void>;
  /**
   * Assert that the received value matches the shape of `T`.
   * Produces a compile-time error when `R` is not assignable to `T`.
   */
  toMatchSchema<T>(..._: [R] extends [T] ? [] : [never]): Promise<void>;
}

// ── Implementation ─────────────────────────────────────────────────────────

type MatcherResult = { pass: boolean; message: () => string };

export const sqlMatchers = baseExpect.extend({
  async toBeSqlConnected(received: unknown): Promise<MatcherResult> {
    const client = received as SqlClient;
    let pass = false;
    let errorMessage = "";

    try {
      await client.query("SELECT 1");
      pass = true;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    return {
      pass,
      message: () =>
        pass
          ? "Expected SQL client NOT to be connected, but it is."
          : `Expected SQL client to be connected, but got error: ${errorMessage}`,
    };
  },

  async toHaveSqlTable(received: unknown, tableName: string): Promise<MatcherResult> {
    const client = received as SqlClient;
    let pass = false;
    let errorMessage = "";

    try {
      await client.query(`SELECT 1 FROM ${tableName} LIMIT 1`);
      pass = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const notFound =
        /no such table|does not exist|unknown table|doesn't exist/i.test(msg);
      if (!notFound) {
        errorMessage = msg;
      }
    }

    return {
      pass,
      message: () =>
        pass
          ? `Expected SQL client NOT to have table "${tableName}", but it does.`
          : errorMessage
            ? `Expected SQL client to have table "${tableName}", but got unexpected error: ${errorMessage}`
            : `Expected SQL client to have table "${tableName}", but it does not exist.`,
    };
  },

  async toMatchSchema(received: unknown): Promise<MatcherResult> {
    // At runtime: verify the value is a non-null object with no undefined fields.
    // The compile-time constraint ([R] extends [T]) lives in the module augmentation.
    const pass =
      received !== null &&
      typeof received === "object" &&
      Object.values(received as Record<string, unknown>).every(
        (v) => v !== undefined,
      );

    return {
      pass,
      message: () =>
        pass
          ? "Expected value NOT to match schema, but it does."
          : `Expected value to match schema, but received: ${JSON.stringify(received)}`,
    };
  },
});

declare module "@playwright/test" {
  interface Matchers<R> extends SqlMatchers<R> {}
}
