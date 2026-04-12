/**
 * Type-level tests for the SQL FSM type system (SQLType.ts).
 *
 * These are compile-time assertions — they produce NO runtime output.
 * Run them with:  pnpm exec tsc --noEmit
 *
 * A failing assertion becomes a TypeScript compile error:
 *   "Type 'false' does not satisfy the constraint 'true'"
 */

import type {
  SQLParams,
  ValidSQL,
  CountParams,
  CountDollarParams,
  Head,
  Tail,
  Trim,
  IsKeyword,
  InferSQLParams,
} from "@playwright-labs/sql-core";

// ─── Test helpers ─────────────────────────────────────────────────────────

/**
 * Fails at compile time if `T` is not `true`.
 * Usage: `type _ = Assert<Equal<A, B>>`
 */
export type Assert<T extends true> = T;

/**
 * Structural equality for two types.
 * Uses the "double extends trick" which correctly handles `never`, `any`, and
 * generic constraints (unlike a simple `A extends B ? B extends A ? ...`).
 */
export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;

/** `true` iff T is the `never` type. */
export type IsNever<T> = [T] extends [never] ? true : false;

/** `true` iff T is NOT the `never` type. */
export type IsNotNever<T> = [T] extends [never] ? false : true;

// ─── §1 String utilities ──────────────────────────────────────────────────

// Trim
type _trim_leading     = Assert<Equal<Trim<"  hello">,   "hello">>;
type _trim_trailing    = Assert<Equal<Trim<"hello  ">,   "hello">>;
type _trim_both        = Assert<Equal<Trim<" hello ">,   "hello">>;
type _trim_empty       = Assert<Equal<Trim<"">,          "">>;
type _trim_no_space    = Assert<Equal<Trim<"SELECT">,    "SELECT">>;

// Head
type _head_multi       = Assert<Equal<Head<"SELECT * FROM users">, "SELECT">>;
type _head_single      = Assert<Equal<Head<"SELECT">,              "SELECT">>;
type _head_two         = Assert<Equal<Head<"FROM users">,          "FROM">>;

// Tail
type _tail_multi       = Assert<Equal<Tail<"SELECT * FROM users">, "* FROM users">>;
type _tail_single      = Assert<Equal<Tail<"SELECT">,              "">>;
type _tail_two         = Assert<Equal<Tail<"FROM users">,          "users">>;

// ─── §2 CountParams ───────────────────────────────────────────────────────

type _cp_none          = Assert<Equal<CountParams<"SELECT * FROM users">,         []>>;
type _cp_one           = Assert<Equal<CountParams<"WHERE id = ?">,                [unknown]>>;
type _cp_two           = Assert<Equal<CountParams<"WHERE id = ? AND name = ?">,   [unknown, unknown]>>;
type _cp_three         = Assert<Equal<CountParams<"SET x = ?, y = ? WHERE id = ?">, [unknown, unknown, unknown]>>;

// ─── §3 IsKeyword ─────────────────────────────────────────────────────────

type _kw_select        = Assert<Equal<IsKeyword<"SELECT">,  true>>;
type _kw_select_lower  = Assert<Equal<IsKeyword<"select">,  true>>;
type _kw_from          = Assert<Equal<IsKeyword<"FROM">,    true>>;
type _kw_where         = Assert<Equal<IsKeyword<"WHERE">,   true>>;
type _kw_join          = Assert<Equal<IsKeyword<"JOIN">,    true>>;
type _kw_not_kw        = Assert<Equal<IsKeyword<"users">,   false>>;
type _kw_not_kw2       = Assert<Equal<IsKeyword<"email">,   false>>;
type _kw_not_kw3       = Assert<Equal<IsKeyword<"id">,      false>>;

// ─── §4 SELECT statements ─────────────────────────────────────────────────

// Valid — no parameters
type _sel_star          = Assert<IsNotNever<SQLParams<"SELECT * FROM users">>>;
type _sel_cols          = Assert<IsNotNever<SQLParams<"SELECT id, name FROM users">>>;
type _sel_alias         = Assert<IsNotNever<SQLParams<"SELECT u.id FROM users u">>>;
type _sel_distinct      = Assert<IsNotNever<SQLParams<"SELECT DISTINCT id FROM users">>>;

// Valid — with WHERE and parameters
type _sel_where_1       = Assert<Equal<SQLParams<"SELECT * FROM users WHERE id = ?">,               [unknown]>>;
type _sel_where_2       = Assert<Equal<SQLParams<"SELECT * FROM users WHERE id = ? AND name = ?">,  [unknown, unknown]>>;

// Valid — ORDER BY
type _sel_order         = Assert<IsNotNever<SQLParams<"SELECT * FROM users ORDER BY name">>>;
type _sel_order_dir     = Assert<IsNotNever<SQLParams<"SELECT * FROM users ORDER BY name ASC">>>;

// Valid — LIMIT / OFFSET
type _sel_limit         = Assert<IsNotNever<SQLParams<"SELECT * FROM users LIMIT 10">>>;
type _sel_limit_offset  = Assert<IsNotNever<SQLParams<"SELECT * FROM users LIMIT 10 OFFSET 20">>>;
type _sel_limit_param   = Assert<Equal<SQLParams<"SELECT * FROM users LIMIT ? OFFSET ?">, [unknown, unknown]>>;

// Valid — GROUP BY / HAVING
type _sel_group         = Assert<IsNotNever<SQLParams<"SELECT id, COUNT(*) FROM events GROUP BY id">>>;
type _sel_having        = Assert<IsNotNever<SQLParams<"SELECT id, COUNT(*) FROM events GROUP BY id HAVING COUNT(*) > 1">>>;

// Valid — JOIN
type _sel_inner_join    = Assert<IsNotNever<SQLParams<"SELECT * FROM users INNER JOIN orders ON users.id = orders.user_id">>>;
type _sel_left_join     = Assert<IsNotNever<SQLParams<"SELECT * FROM users LEFT JOIN orders ON users.id = orders.user_id">>>;

// Valid — combined clauses
type _sel_full          = Assert<Equal<
  SQLParams<"SELECT * FROM users WHERE id = ? ORDER BY name LIMIT 10">,
  [unknown]
>>;

// Invalid — missing FROM
type _sel_no_from       = Assert<IsNever<SQLParams<"SELECT *">>>;
type _sel_no_from2      = Assert<IsNever<SQLParams<"SELECT id, name">>>;

// Invalid — unknown statement keyword
type _sel_typo          = Assert<IsNever<SQLParams<"SELEC * FROM users">>>;
type _sel_blank         = Assert<IsNever<SQLParams<"">>>;

// ─── §5 UPDATE statements ─────────────────────────────────────────────────

// Valid — no parameters
type _upd_basic         = Assert<IsNotNever<SQLParams<"UPDATE users SET active = 1">>>;

// Valid — with parameters
type _upd_one_param     = Assert<Equal<SQLParams<"UPDATE users SET name = ? WHERE id = 1">,   [unknown]>>;
type _upd_two_params    = Assert<Equal<SQLParams<"UPDATE users SET name = ? WHERE id = ?">,   [unknown, unknown]>>;
type _upd_three_params  = Assert<Equal<
  SQLParams<"UPDATE users SET name = ?, email = ? WHERE id = ?">,
  [unknown, unknown, unknown]
>>;

// Valid — with alias
type _upd_alias         = Assert<IsNotNever<SQLParams<"UPDATE users u SET u.active = 1 WHERE u.id = 1">>>;

// Invalid — missing table name (keyword directly after UPDATE)
type _upd_no_table      = Assert<IsNever<SQLParams<"UPDATE SET name = ?">>>;

// Invalid — missing SET
type _upd_no_set        = Assert<IsNever<SQLParams<"UPDATE users name = ?">>>;

// ─── §6 DELETE statements ─────────────────────────────────────────────────

// Valid — no parameters
type _del_basic         = Assert<IsNotNever<SQLParams<"DELETE FROM users">>>;

// Valid — with WHERE and parameters
type _del_one_param     = Assert<Equal<SQLParams<"DELETE FROM users WHERE id = ?">,           [unknown]>>;
type _del_two_params    = Assert<Equal<SQLParams<"DELETE FROM users WHERE id = ? OR id = ?">, [unknown, unknown]>>;

// Invalid — missing FROM
type _del_no_from       = Assert<IsNever<SQLParams<"DELETE users WHERE id = ?">>>;

// Invalid — missing table
type _del_no_table      = Assert<IsNever<SQLParams<"DELETE FROM">>>;

// ─── §7 INSERT statements ─────────────────────────────────────────────────

// Valid — VALUES with parameters
type _ins_basic         = Assert<Equal<SQLParams<"INSERT INTO users VALUES (?, ?)">,          [unknown, unknown]>>;
type _ins_cols          = Assert<Equal<SQLParams<"INSERT INTO users (id, name) VALUES (?, ?)">, [unknown, unknown]>>;
type _ins_three         = Assert<Equal<
  SQLParams<"INSERT INTO users (id, name, email) VALUES (?, ?, ?)">,
  [unknown, unknown, unknown]
>>;

// Invalid — missing INTO
type _ins_no_into       = Assert<IsNever<SQLParams<"INSERT users VALUES (?, ?)">>>;

// Invalid — missing VALUES
type _ins_no_values     = Assert<IsNever<SQLParams<"INSERT INTO users (id, name)">>>;

// ─── §8 CREATE TABLE statements ───────────────────────────────────────────

// Valid
type _crt_basic         = Assert<IsNotNever<
  SQLParams<"CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)">
>>;

// Invalid — missing TABLE keyword
type _crt_no_table      = Assert<IsNever<SQLParams<"CREATE users (id INTEGER)">>>;

// ─── §9 ValidSQL brand ────────────────────────────────────────────────────

// Valid SQL passes through as the string literal type
type _valid_select      = Assert<Equal<ValidSQL<"SELECT * FROM users">,       "SELECT * FROM users">>;
type _valid_update      = Assert<Equal<ValidSQL<"UPDATE t SET x = ? WHERE id = ?">, "UPDATE t SET x = ? WHERE id = ?">>;

// Invalid SQL becomes never
type _invalid_kw        = Assert<Equal<ValidSQL<"BOGUS * FROM users">,        never>>;
type _invalid_no_from   = Assert<Equal<ValidSQL<"SELECT *">,                  never>>;
type _invalid_no_set    = Assert<Equal<ValidSQL<"UPDATE users WHERE id = 1">, never>>;
type _invalid_no_into   = Assert<Equal<ValidSQL<"INSERT users VALUES (?)">,   never>>;

// ─── §10 InferSQLParams alias ─────────────────────────────────────────────

// InferSQLParams must be identical to SQLParams
type _alias_no_params   = Assert<Equal<InferSQLParams<"SELECT * FROM users">,            SQLParams<"SELECT * FROM users">>>;
type _alias_with_params = Assert<Equal<InferSQLParams<"UPDATE t SET x = ? WHERE id = ?">, SQLParams<"UPDATE t SET x = ? WHERE id = ?">>>;
type _alias_invalid     = Assert<Equal<InferSQLParams<"BOGUS">,                          SQLParams<"BOGUS">>>;

// ─── §11 Practical patterns ───────────────────────────────────────────────
//
// SQLParams<S> only resolves when S is a concrete string literal.
// Use it at the call site — NOT as a rest-parameter generic on unconstrained
// S (TypeScript cannot evaluate the deep conditional chain for generic S).

// 11a. ValidSQL<S> as a variable type annotation
// ─────────────────────────────────────────────
// Valid SQL is accepted:
declare const _v1: ValidSQL<"SELECT * FROM users">;
declare const _v2: ValidSQL<"UPDATE t SET x = ? WHERE id = ?">;
declare const _v3: ValidSQL<"DELETE FROM t WHERE id = ?">;
declare const _v4: ValidSQL<"INSERT INTO t VALUES (?, ?)">;
declare const _v5: ValidSQL<"CREATE TABLE t (id INTEGER)">;

// Invalid SQL produces `never`, so the variable can only be typed as never:
type _invalid_var_select = Assert<IsNever<ValidSQL<"SELECT *">>>;
type _invalid_var_update = Assert<IsNever<ValidSQL<"UPDATE SET x = ?">>>;
type _invalid_var_delete = Assert<IsNever<ValidSQL<"DELETE users">>>;
type _invalid_var_insert = Assert<IsNever<ValidSQL<"INSERT users VALUES (?)">>>;
type _invalid_var_bogus  = Assert<IsNever<ValidSQL<"TOTALLY BOGUS">>>;

// 11b. SQLParams<S> as a typed params variable
// ─────────────────────────────────────────────
// Assign concrete param tuples — TypeScript checks length and types.

// Zero params
declare const _p0: SQLParams<"SELECT * FROM users">;
type _p0_type = Assert<Equal<typeof _p0, []>>;

// One param — ? style
declare const _p1: SQLParams<"SELECT * FROM users WHERE id = ?">;
type _p1_type = Assert<Equal<typeof _p1, [unknown]>>;

// Two params — ? style
declare const _p2: SQLParams<"UPDATE t SET name = ? WHERE id = ?">;
type _p2_type = Assert<Equal<typeof _p2, [unknown, unknown]>>;

// Three params — ? style
declare const _p3: SQLParams<"INSERT INTO t (a, b, c) VALUES (?, ?, ?)">;
type _p3_type = Assert<Equal<typeof _p3, [unknown, unknown, unknown]>>;

// One param — $N style
declare const _p4: SQLParams<"SELECT * FROM users WHERE id = $1">;
type _p4_type = Assert<Equal<typeof _p4, [unknown]>>;

// Two params — $N style
declare const _p5: SQLParams<"UPDATE t SET name = $1 WHERE id = $2">;
type _p5_type = Assert<Equal<typeof _p5, [unknown, unknown]>>;

// Three params — $N style
declare const _p6: SQLParams<"INSERT INTO t (a, b, c) VALUES ($1, $2, $3)">;
type _p6_type = Assert<Equal<typeof _p6, [unknown, unknown, unknown]>>;

// 11c. @ts-expect-error: wrong tuple lengths are rejected
// ────────────────────────────────────────────────────────────────────────
// (These lines would error without the directive — proving the constraints work.)

{
  // @ts-expect-error — [] is NOT assignable to [unknown]: one param expected
  const _too_few: SQLParams<"SELECT * FROM users WHERE id = ?"> = [];

  // @ts-expect-error — [number, number] is NOT assignable to []: zero params expected
  const _too_many: SQLParams<"SELECT * FROM users"> = [1, 2];

  // @ts-expect-error — [] is NOT assignable to [unknown]: one $N param expected
  const _dp_too_few: SQLParams<"SELECT * FROM users WHERE id = $1"> = [];

  // @ts-expect-error — [number] is NOT assignable to [unknown, unknown, unknown]: three $N params expected
  const _dp_too_many: SQLParams<"INSERT INTO t (a, b, c) VALUES ($1, $2, $3)"> = [1];
}
// ❌ Missing FROM
// await typedQuery("SELECT *");

// ─── §12 Dollar-parameter ($N) support ───────────────────────────────────

// 12a. CountDollarParams — standalone utility
// ─────────────────────────────────────────────
type _cdp_none     = Assert<Equal<CountDollarParams<"SELECT * FROM users">,              []>>;
type _cdp_one      = Assert<Equal<CountDollarParams<"WHERE id = $1">,                    [unknown]>>;
type _cdp_two      = Assert<Equal<CountDollarParams<"WHERE id = $1 AND name = $2">,      [unknown, unknown]>>;
type _cdp_three    = Assert<Equal<CountDollarParams<"SET x = $1, y = $2 WHERE id = $3">, [unknown, unknown, unknown]>>;
// $10 must not be confused with $1 (max index = 10 → 10-element tuple)
type _cdp_ten      = Assert<Equal<CountDollarParams<"WHERE id = $10">["length"],         10>>;
// $2 alongside $10: max is 10, not 2
type _cdp_mix      = Assert<Equal<CountDollarParams<"WHERE a = $2 AND b = $10">["length"], 10>>;
// Gaps in numbering ($1, $3 but no $2): max index = 3 → 3-element tuple
type _cdp_gap      = Assert<Equal<CountDollarParams<"WHERE a = $1 AND b = $3">["length"], 3>>;

// 12b. SQLParams with dollar params — full statement types
// ─────────────────────────────────────────────────────────

// SELECT
type _dp_sel_one   = Assert<Equal<SQLParams<"SELECT * FROM users WHERE id = $1">,              [unknown]>>;
type _dp_sel_two   = Assert<Equal<SQLParams<"SELECT * FROM users WHERE id = $1 AND name = $2">, [unknown, unknown]>>;

// UPDATE
type _dp_upd_two   = Assert<Equal<SQLParams<"UPDATE users SET name = $1 WHERE id = $2">,       [unknown, unknown]>>;
type _dp_upd_three = Assert<Equal<
  SQLParams<"UPDATE users SET name = $1, email = $2 WHERE id = $3">,
  [unknown, unknown, unknown]
>>;

// INSERT
type _dp_ins_two   = Assert<Equal<SQLParams<"INSERT INTO users VALUES ($1, $2)">,              [unknown, unknown]>>;
type _dp_ins_three = Assert<Equal<
  SQLParams<"INSERT INTO users (id, name, email) VALUES ($1, $2, $3)">,
  [unknown, unknown, unknown]
>>;

// DELETE
type _dp_del_one   = Assert<Equal<SQLParams<"DELETE FROM users WHERE id = $1">,                [unknown]>>;

// 12c. Invalid SQL still returns never even with dollar params
// ─────────────────────────────────────────────────────────────
type _dp_invalid   = Assert<IsNever<SQLParams<"SELECT * WHERE id = $1">>>;   // no FROM
type _dp_invalid2  = Assert<IsNever<SQLParams<"BOGUS WHERE id = $1">>>;
type _dp_invalid3  = Assert<IsNever<SQLParams<"INSERT users VALUES ($1)">>>;  // no INTO
type _dp_invalid4  = Assert<IsNever<SQLParams<"UPDATE SET x = $1">>>;         // no table name

// 12d. ValidSQL and InferSQLParams work with dollar params
// ──────────────────────────────────────────────────────────
type _dp_valid_v   = Assert<Equal<ValidSQL<"SELECT * FROM users WHERE id = $1">, "SELECT * FROM users WHERE id = $1">>;
type _dp_invalid_v = Assert<IsNever<ValidSQL<"SELECT * WHERE id = $1">>>;

type _dp_alias     = Assert<Equal<
  InferSQLParams<"SELECT * FROM users WHERE id = $1">,
  SQLParams<"SELECT * FROM users WHERE id = $1">
>>;
