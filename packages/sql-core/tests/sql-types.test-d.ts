/**
 * Type-level tests for the SQL FSM type system (SQLType.ts).
 *
 * These are compile-time assertions — they produce NO runtime output.
 * Run them via:  pnpm typecheck
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
  SqlClient,
  SqlStatement,
} from "../src/index.js";
import { sql } from "../src/sql-tag.js";

// ─── Test helpers ─────────────────────────────────────────────────────────

export type Assert<T extends true> = T;

export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

export type IsNever<T> = [T] extends [never] ? true : false;
export type IsNotNever<T> = [T] extends [never] ? false : true;

// ─── §1 String utilities ──────────────────────────────────────────────────

type _trim_leading = Assert<Equal<Trim<"  hello">, "hello">>;
type _trim_trailing = Assert<Equal<Trim<"hello  ">, "hello">>;
type _trim_both = Assert<Equal<Trim<" hello ">, "hello">>;
type _trim_empty = Assert<Equal<Trim<"">, "">>;
type _trim_no_space = Assert<Equal<Trim<"SELECT">, "SELECT">>;

type _head_multi = Assert<Equal<Head<"SELECT * FROM users">, "SELECT">>;
type _head_single = Assert<Equal<Head<"SELECT">, "SELECT">>;
type _head_two = Assert<Equal<Head<"FROM users">, "FROM">>;

type _tail_multi = Assert<Equal<Tail<"SELECT * FROM users">, "* FROM users">>;
type _tail_single = Assert<Equal<Tail<"SELECT">, "">>;
type _tail_two = Assert<Equal<Tail<"FROM users">, "users">>;

// ─── §2 CountParams ───────────────────────────────────────────────────────

type _cp_none = Assert<Equal<CountParams<"SELECT * FROM users">, []>>;
type _cp_one = Assert<Equal<CountParams<"WHERE id = ?">, [unknown]>>;
type _cp_two = Assert<
  Equal<CountParams<"WHERE id = ? AND name = ?">, [unknown, unknown]>
>;
type _cp_three = Assert<
  Equal<
    CountParams<"SET x = ?, y = ? WHERE id = ?">,
    [unknown, unknown, unknown]
  >
>;

// ─── §3 IsKeyword ─────────────────────────────────────────────────────────

type _kw_select = Assert<Equal<IsKeyword<"SELECT">, true>>;
type _kw_select_lower = Assert<Equal<IsKeyword<"select">, true>>;
type _kw_from = Assert<Equal<IsKeyword<"FROM">, true>>;
type _kw_where = Assert<Equal<IsKeyword<"WHERE">, true>>;
type _kw_join = Assert<Equal<IsKeyword<"JOIN">, true>>;
type _kw_not_kw = Assert<Equal<IsKeyword<"users">, false>>;
type _kw_not_kw2 = Assert<Equal<IsKeyword<"email">, false>>;
type _kw_not_kw3 = Assert<Equal<IsKeyword<"id">, false>>;

// ─── §4 SELECT statements ─────────────────────────────────────────────────

type _sel_star = Assert<IsNotNever<SQLParams<"SELECT * FROM users">>>;
type _sel_cols = Assert<IsNotNever<SQLParams<"SELECT id, name FROM users">>>;
type _sel_alias = Assert<IsNotNever<SQLParams<"SELECT u.id FROM users u">>>;
type _sel_distinct = Assert<
  IsNotNever<SQLParams<"SELECT DISTINCT id FROM users">>
>;

type _sel_where_1 = Assert<
  Equal<SQLParams<"SELECT * FROM users WHERE id = ?">, [unknown]>
>;
type _sel_where_2 = Assert<
  Equal<
    SQLParams<"SELECT * FROM users WHERE id = ? AND name = ?">,
    [unknown, unknown]
  >
>;

type _sel_order = Assert<
  IsNotNever<SQLParams<"SELECT * FROM users ORDER BY name">>
>;
type _sel_order_dir = Assert<
  IsNotNever<SQLParams<"SELECT * FROM users ORDER BY name ASC">>
>;

type _sel_limit = Assert<IsNotNever<SQLParams<"SELECT * FROM users LIMIT 10">>>;
type _sel_limit_offset = Assert<
  IsNotNever<SQLParams<"SELECT * FROM users LIMIT 10 OFFSET 20">>
>;
type _sel_limit_param = Assert<
  Equal<SQLParams<"SELECT * FROM users LIMIT ? OFFSET ?">, [unknown, unknown]>
>;

type _sel_group = Assert<
  IsNotNever<SQLParams<"SELECT id, COUNT(*) FROM events GROUP BY id">>
>;
type _sel_having = Assert<
  IsNotNever<
    SQLParams<"SELECT id, COUNT(*) FROM events GROUP BY id HAVING COUNT(*) > 1">
  >
>;

type _sel_inner_join = Assert<
  IsNotNever<
    SQLParams<"SELECT * FROM users INNER JOIN orders ON users.id = orders.user_id">
  >
>;
type _sel_left_join = Assert<
  IsNotNever<
    SQLParams<"SELECT * FROM users LEFT JOIN orders ON users.id = orders.user_id">
  >
>;

type _sel_full = Assert<
  Equal<
    SQLParams<"SELECT * FROM users WHERE id = ? ORDER BY name LIMIT 10">,
    [unknown]
  >
>;

type _sel_no_from = Assert<IsNever<SQLParams<"SELECT *">>>;
type _sel_no_from2 = Assert<IsNever<SQLParams<"SELECT id, name">>>;
type _sel_typo = Assert<IsNever<SQLParams<"SELEC * FROM users">>>;
type _sel_blank = Assert<IsNever<SQLParams<"">>>;

// ─── §5 UPDATE statements ─────────────────────────────────────────────────

type _upd_basic = Assert<IsNotNever<SQLParams<"UPDATE users SET active = 1">>>;
type _upd_one_param = Assert<
  Equal<SQLParams<"UPDATE users SET name = ? WHERE id = 1">, [unknown]>
>;
type _upd_two_params = Assert<
  Equal<SQLParams<"UPDATE users SET name = ? WHERE id = ?">, [unknown, unknown]>
>;
type _upd_three_params = Assert<
  Equal<
    SQLParams<"UPDATE users SET name = ?, email = ? WHERE id = ?">,
    [unknown, unknown, unknown]
  >
>;
type _upd_alias = Assert<
  IsNotNever<SQLParams<"UPDATE users u SET u.active = 1 WHERE u.id = 1">>
>;
type _upd_no_table = Assert<IsNever<SQLParams<"UPDATE SET name = ?">>>;
type _upd_no_set = Assert<IsNever<SQLParams<"UPDATE users name = ?">>>;

// ─── §6 DELETE statements ─────────────────────────────────────────────────

type _del_basic = Assert<IsNotNever<SQLParams<"DELETE FROM users">>>;
type _del_one_param = Assert<
  Equal<SQLParams<"DELETE FROM users WHERE id = ?">, [unknown]>
>;
type _del_two_params = Assert<
  Equal<
    SQLParams<"DELETE FROM users WHERE id = ? OR id = ?">,
    [unknown, unknown]
  >
>;
type _del_no_from = Assert<IsNever<SQLParams<"DELETE users WHERE id = ?">>>;
type _del_no_table = Assert<IsNever<SQLParams<"DELETE FROM">>>;

// ─── §7 INSERT statements ─────────────────────────────────────────────────

type _ins_basic = Assert<
  Equal<SQLParams<"INSERT INTO users VALUES (?, ?)">, [unknown, unknown]>
>;
type _ins_cols = Assert<
  Equal<
    SQLParams<"INSERT INTO users (id, name) VALUES (?, ?)">,
    [unknown, unknown]
  >
>;
type _ins_three = Assert<
  Equal<
    SQLParams<"INSERT INTO users (id, name, email) VALUES (?, ?, ?)">,
    [unknown, unknown, unknown]
  >
>;
type _ins_no_into = Assert<IsNever<SQLParams<"INSERT users VALUES (?, ?)">>>;
type _ins_no_values = Assert<
  IsNever<SQLParams<"INSERT INTO users (id, name)">>
>;

// ─── §8 CREATE TABLE statements ───────────────────────────────────────────

type _crt_basic = Assert<
  IsNotNever<
    SQLParams<"CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)">
  >
>;
type _crt_no_table = Assert<IsNever<SQLParams<"CREATE users (id INTEGER)">>>;

// ─── §9 ValidSQL brand ────────────────────────────────────────────────────

type _valid_select = Assert<
  Equal<ValidSQL<"SELECT * FROM users">, "SELECT * FROM users">
>;
type _valid_update = Assert<
  Equal<
    ValidSQL<"UPDATE t SET x = ? WHERE id = ?">,
    "UPDATE t SET x = ? WHERE id = ?"
  >
>;
type _invalid_kw = Assert<Equal<ValidSQL<"BOGUS * FROM users">, never>>;
type _invalid_no_from = Assert<Equal<ValidSQL<"SELECT *">, never>>;
type _invalid_no_set = Assert<
  Equal<ValidSQL<"UPDATE users WHERE id = 1">, never>
>;
type _invalid_no_into = Assert<
  Equal<ValidSQL<"INSERT users VALUES (?)">, never>
>;

// ─── §10 InferSQLParams alias ─────────────────────────────────────────────

type _alias_no_params = Assert<
  Equal<InferSQLParams<"SELECT * FROM users">, SQLParams<"SELECT * FROM users">>
>;
type _alias_with_params = Assert<
  Equal<
    InferSQLParams<"UPDATE t SET x = ? WHERE id = ?">,
    SQLParams<"UPDATE t SET x = ? WHERE id = ?">
  >
>;
type _alias_invalid = Assert<
  Equal<InferSQLParams<"BOGUS">, SQLParams<"BOGUS">>
>;

// ─── §11 Practical patterns ───────────────────────────────────────────────

declare const _v1: ValidSQL<"SELECT * FROM users">;
declare const _v2: ValidSQL<"UPDATE t SET x = ? WHERE id = ?">;
declare const _v3: ValidSQL<"DELETE FROM t WHERE id = ?">;
declare const _v4: ValidSQL<"INSERT INTO t VALUES (?, ?)">;
declare const _v5: ValidSQL<"CREATE TABLE t (id INTEGER)">;

type _invalid_var_select = Assert<IsNever<ValidSQL<"SELECT *">>>;
type _invalid_var_update = Assert<IsNever<ValidSQL<"UPDATE SET x = ?">>>;
type _invalid_var_delete = Assert<IsNever<ValidSQL<"DELETE users">>>;
type _invalid_var_insert = Assert<IsNever<ValidSQL<"INSERT users VALUES (?)">>>;
type _invalid_var_bogus = Assert<IsNever<ValidSQL<"TOTALLY BOGUS">>>;

declare const _p0: SQLParams<"SELECT * FROM users">;
type _p0_type = Assert<Equal<typeof _p0, []>>;

declare const _p1: SQLParams<"SELECT * FROM users WHERE id = ?">;
type _p1_type = Assert<Equal<typeof _p1, [unknown]>>;

declare const _p2: SQLParams<"UPDATE t SET name = ? WHERE id = ?">;
type _p2_type = Assert<Equal<typeof _p2, [unknown, unknown]>>;

declare const _p3: SQLParams<"INSERT INTO t (a, b, c) VALUES (?, ?, ?)">;
type _p3_type = Assert<Equal<typeof _p3, [unknown, unknown, unknown]>>;

declare const _p4: SQLParams<"SELECT * FROM users WHERE id = $1">;
type _p4_type = Assert<Equal<typeof _p4, [unknown]>>;

declare const _p5: SQLParams<"UPDATE t SET name = $1 WHERE id = $2">;
type _p5_type = Assert<Equal<typeof _p5, [unknown, unknown]>>;

declare const _p6: SQLParams<"INSERT INTO t (a, b, c) VALUES ($1, $2, $3)">;
type _p6_type = Assert<Equal<typeof _p6, [unknown, unknown, unknown]>>;

{
  // @ts-expect-error — [] is NOT assignable to [unknown]
  const _too_few: SQLParams<"SELECT * FROM users WHERE id = ?"> = [];

  // @ts-expect-error — [number, number] is NOT assignable to []
  const _too_many: SQLParams<"SELECT * FROM users"> = [1, 2];

  // @ts-expect-error — [] is NOT assignable to [unknown]
  const _dp_too_few: SQLParams<"SELECT * FROM users WHERE id = $1"> = [];

  // @ts-expect-error — [number] is NOT assignable to [unknown, unknown, unknown]
  const _dp_too_many: SQLParams<"INSERT INTO t (a, b, c) VALUES ($1, $2, $3)"> =
    [1];
}

// ─── §12 Dollar-parameter ($N) support ───────────────────────────────────

type _cdp_none = Assert<Equal<CountDollarParams<"SELECT * FROM users">, []>>;
type _cdp_one = Assert<Equal<CountDollarParams<"WHERE id = $1">, [unknown]>>;
type _cdp_two = Assert<
  Equal<CountDollarParams<"WHERE id = $1 AND name = $2">, [unknown, unknown]>
>;
type _cdp_three = Assert<
  Equal<
    CountDollarParams<"SET x = $1, y = $2 WHERE id = $3">,
    [unknown, unknown, unknown]
  >
>;
type _cdp_ten = Assert<
  Equal<CountDollarParams<"WHERE id = $10">["length"], 10>
>;
type _cdp_mix = Assert<
  Equal<CountDollarParams<"WHERE a = $2 AND b = $10">["length"], 10>
>;
type _cdp_gap = Assert<
  Equal<CountDollarParams<"WHERE a = $1 AND b = $3">["length"], 3>
>;

type _dp_sel_one = Assert<
  Equal<SQLParams<"SELECT * FROM users WHERE id = $1">, [unknown]>
>;
type _dp_sel_two = Assert<
  Equal<
    SQLParams<"SELECT * FROM users WHERE id = $1 AND name = $2">,
    [unknown, unknown]
  >
>;
type _dp_upd_two = Assert<
  Equal<
    SQLParams<"UPDATE users SET name = $1 WHERE id = $2">,
    [unknown, unknown]
  >
>;
type _dp_upd_three = Assert<
  Equal<
    SQLParams<"UPDATE users SET name = $1, email = $2 WHERE id = $3">,
    [unknown, unknown, unknown]
  >
>;
type _dp_ins_two = Assert<
  Equal<SQLParams<"INSERT INTO users VALUES ($1, $2)">, [unknown, unknown]>
>;
type _dp_ins_three = Assert<
  Equal<
    SQLParams<"INSERT INTO users (id, name, email) VALUES ($1, $2, $3)">,
    [unknown, unknown, unknown]
  >
>;
type _dp_del_one = Assert<
  Equal<SQLParams<"DELETE FROM users WHERE id = $1">, [unknown]>
>;

type _dp_invalid = Assert<IsNever<SQLParams<"SELECT * WHERE id = $1">>>;
type _dp_invalid2 = Assert<IsNever<SQLParams<"BOGUS WHERE id = $1">>>;
type _dp_invalid3 = Assert<IsNever<SQLParams<"INSERT users VALUES ($1)">>>;
type _dp_invalid4 = Assert<IsNever<SQLParams<"UPDATE SET x = $1">>>;

type _dp_valid_v = Assert<
  Equal<
    ValidSQL<"SELECT * FROM users WHERE id = $1">,
    "SELECT * FROM users WHERE id = $1"
  >
>;
type _dp_invalid_v = Assert<IsNever<ValidSQL<"SELECT * WHERE id = $1">>>;
type _dp_alias = Assert<
  Equal<
    InferSQLParams<"SELECT * FROM users WHERE id = $1">,
    SQLParams<"SELECT * FROM users WHERE id = $1">
  >
>;

// ─── §13 SqlClient param enforcement ─────────────────────────────────────────
//
// Verify that SqlClient.execute / .query require the params array when the
// sql`` tag produces a SqlStatement<[unknown, ...]> (one or more params).

declare const _client: SqlClient;
declare const _stmtNoParams: SqlStatement<[]>;
declare const _stmtOneParam: SqlStatement<[unknown]>;
declare const _stmtTwoParams: SqlStatement<[unknown, unknown]>;

// ─── execute: valid calls — these must compile without errors ────────────
// No-param statement — params array is optional
void _client.execute(_stmtNoParams);
// With params
void _client.execute(_stmtOneParam, [42]);
void _client.execute(_stmtTwoParams, [1, 2]);
// Plain string — always allowed
void _client.execute("SELECT 1");

// ─── execute: @ts-expect-error when params missing ───────────────────────
{
  // @ts-expect-error — SqlStatement<[unknown]> requires params array
  _client.execute(_stmtOneParam);

  // @ts-expect-error — SqlStatement<[unknown, unknown]> requires params array
  _client.execute(_stmtTwoParams);
}

// ─── query: @ts-expect-error when params missing ─────────────────────────
{
  // @ts-expect-error — SqlStatement<[unknown]> requires params array
  _client.query(_stmtOneParam);

  // @ts-expect-error — SqlStatement<[unknown, unknown]> requires params array
  _client.query(_stmtTwoParams);
}

// ─── §14 sql(string) plain-call overload ─────────────────────────────────
//
// sql("...") must infer SqlStatement<P> for valid SQL and never for invalid.

const _sql_str_no_params_v   = sql("SELECT * FROM users");
const _sql_str_one_param_v   = sql("SELECT * FROM users WHERE id = ?");
const _sql_str_two_params_v  = sql("UPDATE t SET name = ? WHERE id = ?");
const _sql_str_dollar_v      = sql("DELETE FROM users WHERE id = $1");
const _sql_str_invalid_v     = sql("BOGUS") as never;

type _sql_str_no_params  = Assert<Equal<typeof _sql_str_no_params_v,  SqlStatement<[]>>>;
type _sql_str_one_param  = Assert<Equal<typeof _sql_str_one_param_v,  SqlStatement<[unknown]>>>;
type _sql_str_two_params = Assert<Equal<typeof _sql_str_two_params_v, SqlStatement<[unknown, unknown]>>>;
type _sql_str_dollar     = Assert<Equal<typeof _sql_str_dollar_v,     SqlStatement<[unknown]>>>;
type _sql_str_invalid    = Assert<IsNever<typeof _sql_str_invalid_v>>;

// ─── §15 Dollar param sequential validation ───────────────────────────────
//
// $N params must be used sequentially — $3 without $1 and $2 is invalid.

// Valid sequences
type _dollar_seq_1 = Assert<Equal<SQLParams<"SELECT * FROM t WHERE id = $1">,                       [unknown]>>;
type _dollar_seq_2 = Assert<Equal<SQLParams<"SELECT * FROM t WHERE a = $1 AND b = $2">,             [unknown, unknown]>>;
type _dollar_seq_3 = Assert<Equal<SQLParams<"UPDATE t SET a = $1, b = $2 WHERE id = $3">,           [unknown, unknown, unknown]>>;

// Invalid sequences → never
type _dollar_gap_1 = Assert<IsNever<SQLParams<"SELECT * FROM t WHERE id = $2">>>;           // missing $1
type _dollar_gap_2 = Assert<IsNever<SQLParams<"SELECT * FROM t WHERE id = $3">>>;           // missing $1, $2
type _dollar_gap_3 = Assert<IsNever<SQLParams<"SELECT * FROM t WHERE a = $1 AND b = $3">>>; // missing $2
type _dollar_gap_4 = Assert<IsNever<SQLParams<"UPDATE t SET a = $2 WHERE id = $3">>>;       // missing $1

// ─── §16 SqlClient satisfies AsyncDisposable ──────────────────────────────
//
// SqlClient must have [Symbol.asyncDispose] so it can be used with `await using`.

declare const _asyncClient: SqlClient;

// [Symbol.asyncDispose] must exist and return Promise<void>
type _async_dispose_exists = Assert<Equal<
  ReturnType<typeof _asyncClient[typeof Symbol.asyncDispose]>,
  Promise<void>
>>;

// SqlClient must be assignable to AsyncDisposable
type _is_async_disposable = Assert<Equal<
  SqlClient extends AsyncDisposable ? true : false,
  true
>>;
