import type { SQLParams } from "./SQLType.js";

export type Row = Record<string, unknown>;

export type QueryResult<T = Row> = {
  /** Rows returned by the query */
  rows: T[];
  /** Number of rows affected or returned */
  rowCount: number;
  /** Command tag returned by the database (e.g. "SELECT", "INSERT") */
  command?: string;
};

/**
 * A branded string that carries the compile-time parameter tuple `P`.
 * Created by the `sql` tag function; consumed by typed `SqlClient` overloads.
 *
 * Using a string-keyed property (not a `unique symbol`) ensures the brand
 * survives tsup's type-bundling, which may split declarations across multiple
 * `.d.ts` chunks. Each `declare const x: unique symbol` in a different chunk
 * becomes an incompatible type; a string key avoids that problem while still
 * preventing accidental assignment of plain `string` values.
 *
 * @example
 *   const stmt: SqlStatement<[unknown]> = sql`SELECT * FROM t WHERE id = ?`;
 */
export type SqlStatement<P extends readonly unknown[] = readonly unknown[]> =
  string & { readonly __sqlBrand: P };

/**
 * Matches plain `string` values and `SqlStatement<[]>` (no params), but
 * intentionally rejects `SqlStatement<[T, ...]>` (one or more params).
 *
 * Used as the fallback overload parameter to prevent TypeScript from silently
 * falling through to the untyped overload when a caller forgets to supply the
 * required params array.
 */
type _PlainOrEmpty = string & { readonly __sqlBrand?: readonly [] };

/**
 * Driver-agnostic SQL client interface.
 *
 * The typed overloads accept `SqlStatement<P>` (non-empty params tuple) and
 * enforce that the caller supplies exactly the right number of parameters.
 * The fallback overloads accept plain `string` or no-param statements for
 * convenience, but reject parameterised statements without a params array.
 */
export interface SqlClient {
  /**
   * Execute a SQL query and return the result rows.
   * Typed overload: enforces the params array when the statement has params.
   */
  query<T = Row, P extends readonly [unknown, ...unknown[]] = readonly [unknown, ...unknown[]]>(
    sql: SqlStatement<P>,
    params: readonly [...P]
  ): Promise<QueryResult<T>>;

  /** Execute a SQL query with a plain/no-param string. */
  query<T = Row>(sql: _PlainOrEmpty, params?: unknown[]): Promise<QueryResult<T>>;

  /**
   * Execute a SQL statement without returning rows.
   * Typed overload: enforces the params array when the statement has params.
   */
  execute<P extends readonly [unknown, ...unknown[]] = readonly [unknown, ...unknown[]]>(
    sql: SqlStatement<P>,
    params: readonly [...P]
  ): Promise<void>;

  /** Execute a SQL statement with a plain/no-param string. */
  execute(sql: _PlainOrEmpty, params?: unknown[]): Promise<void>;

  /** Close / release the underlying connection. */
  close(): Promise<void>;

  /**
   * Async resource disposal — called automatically by `await using`.
   * Delegates to {@link close}.
   *
   * @example
   * ```ts
   * await using client = await sqliteAdapter(':memory:').create();
   * // client.close() is called automatically when the block exits
   * ```
   */
  [Symbol.asyncDispose](): Promise<void>;
}

export type SqlAdapter = {
  /**
   * Open a new connection and return a ready-to-use {@link SqlClient}.
   * The caller is responsible for calling {@link SqlClient.close} when done.
   */
  create(): Promise<SqlClient>;
};

/**
 * Utility: extract the parameter tuple from a `SqlStatement`.
 * @example
 *   type P = StmtParams<SqlStatement<[unknown, unknown]>>; // [unknown, unknown]
 */
export type StmtParams<S> = S extends SqlStatement<infer P> ? P : never;

/**
 * Re-export so consumers can use SQLParams directly from sql-core.
 */
export type { SQLParams };
