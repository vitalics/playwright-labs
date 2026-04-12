/**
 * Type-level tests for the `sql` tag function.
 *
 * ## Calling conventions and type inference
 *
 * | Form                        | TypeScript infers        | Return type          |
 * |-----------------------------|--------------------------|----------------------|
 * | `` sql`SELECT …` ``         | `TemplateStringsArray`   | `string`             |
 * | `sql("SELECT …")`           | literal string `S`       | `SqlStatement<P>`    |
 * | `sql(["SELECT …"])`         | literal tuple `[S]`      | `SqlStatement<P>`    |
 * | `sql(["part1", "part2"])`   | two-element tuple        | `string`             |
 *
 * TypeScript always infers `TemplateStringsArray` (a frozen readonly array) for
 * the `strings` argument of a tagged template, which prevents literal-type
 * inference.  Use the plain-string or array-call forms when compile-time SQL
 * validation and parameter-count enforcement are required.
 *
 * Run via:  pnpm typecheck
 */

import { sql } from "../src/sql-tag.js";
import type { SqlStatement } from "../src/types.js";

// ─── Test helpers ─────────────────────────────────────────────────────────────

type Assert<T extends true> = T;

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;

type IsNever<T> = [T] extends [never] ? true : false;

// ─── §1 Tagged template literals always return `string` ──────────────────────
//
// TypeScript infers TemplateStringsArray for the `strings` arg of any tagged
// template, preventing literal-type inference.  All forms return `string`.

const _tpl_no_params  = sql`SELECT * FROM users`;
const _tpl_one_q      = sql`SELECT * FROM users WHERE id = ?`;
const _tpl_dollar     = sql`SELECT * FROM users WHERE id = $1`;
const _tpl_interp     = sql`SELECT * FROM ${"users"}`;
const _tpl_invalid    = sql`SELEC * FROM users`;

type _tpl_1 = Assert<Equal<typeof _tpl_no_params, string>>;
type _tpl_2 = Assert<Equal<typeof _tpl_one_q,     string>>;
type _tpl_3 = Assert<Equal<typeof _tpl_dollar,    string>>;
type _tpl_4 = Assert<Equal<typeof _tpl_interp,    string>>;
type _tpl_5 = Assert<Equal<typeof _tpl_invalid,   string>>;

// ─── §2 Plain string — SELECT no params ──────────────────────────────────────

const _sel_no_params      = sql("SELECT * FROM users");
const _sel_cols_no_params = sql("SELECT id, name, email FROM users ORDER BY id");
const _sel_join_no_params = sql("SELECT * FROM users JOIN orders ON users.id = orders.user_id");

type _sel_np_1 = Assert<Equal<typeof _sel_no_params,      SqlStatement<[]>>>;
type _sel_np_2 = Assert<Equal<typeof _sel_cols_no_params, SqlStatement<[]>>>;
type _sel_np_3 = Assert<Equal<typeof _sel_join_no_params, SqlStatement<[]>>>;

// ─── §3 Plain string — SELECT ? params ───────────────────────────────────────

const _sel_one_q   = sql("SELECT * FROM users WHERE id = ?");
const _sel_two_q   = sql("SELECT * FROM users WHERE id = ? AND name = ?");
const _sel_three_q = sql("SELECT * FROM users WHERE id = ? OR name = ? OR email = ?");
const _sel_mixed_q = sql("SELECT * FROM users WHERE id = ? ORDER BY name LIMIT 10");

type _sel_q_1 = Assert<Equal<typeof _sel_one_q,   SqlStatement<[unknown]>>>;
type _sel_q_2 = Assert<Equal<typeof _sel_two_q,   SqlStatement<[unknown, unknown]>>>;
type _sel_q_3 = Assert<Equal<typeof _sel_three_q, SqlStatement<[unknown, unknown, unknown]>>>;
type _sel_q_4 = Assert<Equal<typeof _sel_mixed_q, SqlStatement<[unknown]>>>;

// ─── §4 Plain string — SELECT $N params ──────────────────────────────────────

const _sel_one_d   = sql("SELECT * FROM users WHERE id = $1");
const _sel_two_d   = sql("SELECT * FROM users WHERE id = $1 AND name = $2");
const _sel_three_d = sql("SELECT id, name FROM users WHERE email = $1 OR name = $2 OR id = $3");

type _sel_d_1 = Assert<Equal<typeof _sel_one_d,   SqlStatement<[unknown]>>>;
type _sel_d_2 = Assert<Equal<typeof _sel_two_d,   SqlStatement<[unknown, unknown]>>>;
type _sel_d_3 = Assert<Equal<typeof _sel_three_d, SqlStatement<[unknown, unknown, unknown]>>>;

// ─── §5 Plain string — UPDATE / DELETE / INSERT / CREATE ─────────────────────

const _upd_no_params    = sql("UPDATE users SET active = 1");
const _upd_two_params   = sql("UPDATE users SET name = ? WHERE id = ?");
const _upd_dollar       = sql("UPDATE users SET name = $1 WHERE id = $2");
const _del_no_params    = sql("DELETE FROM users");
const _del_one_param    = sql("DELETE FROM users WHERE id = ?");
const _ins_two          = sql("INSERT INTO users (name, email) VALUES (?, ?)");
const _ins_dollar       = sql("INSERT INTO users (name, email) VALUES ($1, $2)");
const _crt              = sql("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)");

type _upd_1 = Assert<Equal<typeof _upd_no_params,  SqlStatement<[]>>>;
type _upd_2 = Assert<Equal<typeof _upd_two_params,  SqlStatement<[unknown, unknown]>>>;
type _upd_3 = Assert<Equal<typeof _upd_dollar,      SqlStatement<[unknown, unknown]>>>;
type _del_1 = Assert<Equal<typeof _del_no_params,   SqlStatement<[]>>>;
type _del_2 = Assert<Equal<typeof _del_one_param,   SqlStatement<[unknown]>>>;
type _ins_1 = Assert<Equal<typeof _ins_two,         SqlStatement<[unknown, unknown]>>>;
type _ins_2 = Assert<Equal<typeof _ins_dollar,      SqlStatement<[unknown, unknown]>>>;
type _crt_1 = Assert<Equal<typeof _crt,             SqlStatement<[]>>>;

// ─── §6 Plain string — Invalid SQL → never ───────────────────────────────────

const _inv_no_from  = sql("SELECT *") as never;
const _inv_no_set   = sql("UPDATE users WHERE id = 1") as never;
const _inv_no_from2 = sql("DELETE users WHERE id = ?") as never;
const _inv_no_into  = sql("INSERT users VALUES (?)") as never;
const _inv_typo     = sql("SELEC * FROM users") as never;

type _inv_1 = Assert<IsNever<typeof _inv_no_from>>;
type _inv_2 = Assert<IsNever<typeof _inv_no_set>>;
type _inv_3 = Assert<IsNever<typeof _inv_no_from2>>;
type _inv_4 = Assert<IsNever<typeof _inv_no_into>>;
type _inv_5 = Assert<IsNever<typeof _inv_typo>>;

// ─── §7 Array call — same inference as plain string ──────────────────────────
//
// TypeScript infers a literal mutable tuple from array literals when the
// constraint is `string[]` (not `readonly string[]`).

const _arr_no_params  = sql(["SELECT * FROM users"]);
const _arr_one_q      = sql(["SELECT * FROM users WHERE id = ?"]);
const _arr_two_q      = sql(["SELECT * FROM users WHERE id = ? AND name = ?"]);
const _arr_dollar     = sql(["DELETE FROM users WHERE id = $1"]);
const _arr_invalid    = sql(["SELEC * FROM users"]) as never;

type _arr_1 = Assert<Equal<typeof _arr_no_params,  SqlStatement<[]>>>;
type _arr_2 = Assert<Equal<typeof _arr_one_q,      SqlStatement<[unknown]>>>;
type _arr_3 = Assert<Equal<typeof _arr_two_q,      SqlStatement<[unknown, unknown]>>>;
type _arr_4 = Assert<Equal<typeof _arr_dollar,     SqlStatement<[unknown]>>>;
type _arr_5 = Assert<IsNever<typeof _arr_invalid>>;

// Multi-element array → dynamic SQL → string
const _arr_multi = sql(["SELECT * FROM ", " WHERE id = ?"]);
type _arr_m = Assert<Equal<typeof _arr_multi, string>>;

// ─── §8 Stored in const, then used as typed arg ──────────────────────────────
// Verifies that storing in a const preserves the brand (no widening to string).

const _stored = sql("SELECT name FROM users WHERE email = ?");
type _stored_type    = typeof _stored;
type _stored_is_stmt = Assert<Equal<_stored_type, SqlStatement<[unknown]>>>;

// Must be assignable to the typed overload parameter — would fail if widened to string.
const _reassign: SqlStatement<[unknown]> = _stored;
