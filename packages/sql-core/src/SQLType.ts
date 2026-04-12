import type { MinusOne } from "./minusOne.js";

/**
 * SQL Type System — Finite-State-Machine via TypeScript Template Literals
 * =========================================================================
 *
 * Models a subset of SQL grammar as a compile-time state machine.
 * Each `State*` type represents a node in the automaton; transitions are
 * conditional-type branches guarded by keyword checks.
 *
 * Supported statements
 * --------------------
 *   SELECT  <cols>  FROM  <table>  [JOIN …]  [WHERE …]  [GROUP BY …]
 *                                            [ORDER BY …] [LIMIT n [OFFSET n]]
 *   UPDATE  <table> SET   <assignments>     [WHERE …]
 *   DELETE  FROM    <table>                 [WHERE …]
 *   INSERT  INTO    <table> [(cols)]  VALUES (…)
 *   CREATE  TABLE   <name>  (…)
 *
 * Non-goals (accepted but not deeply validated)
 * -----------------------------------------------
 *   • Column / expression lists  (consumed token-by-token)
 *   • WHERE conditions           (consumed token-by-token)
 *   • Subqueries
 *   • Keywords used as identifiers (e.g. a table named `order`)
 */

// ─── §1 String utilities ──────────────────────────────────────────────────

/** Remove leading spaces. */
type TrimLeft<S extends string> =
  S extends ` ${infer R}` ? TrimLeft<R> : S;

/** Remove trailing spaces. */
type TrimRight<S extends string> =
  S extends `${infer L} ` ? TrimRight<L> : S;

/** Remove leading and trailing spaces. */
export type Trim<S extends string> = TrimLeft<TrimRight<S>>;

/**
 * First whitespace-delimited token.
 * `Head<'SELECT * FROM t'>` → `'SELECT'`
 *
 * TypeScript resolves `${infer H} ${infer _}` lazily (leftmost split),
 * so H always captures exactly the first space-delimited word.
 */
export type Head<S extends string> =
  S extends `${infer H} ${infer _}` ? H : S;

/**
 * Everything after the first token, left-trimmed.
 * `Tail<'SELECT * FROM t'>` → `'* FROM t'`
 */
export type Tail<S extends string> =
  S extends `${infer _} ${infer T}` ? TrimLeft<T> : "";

// ─── §2 Keyword catalogue ─────────────────────────────────────────────────

/**
 * All reserved SQL keywords recognised by the parser.
 * Stored in UPPER CASE; comparisons use `Uppercase<>`.
 */
export type SQLKeyword =
  // DML
  | "SELECT" | "FROM"   | "WHERE"  | "AND"    | "OR"    | "NOT"
  | "UPDATE" | "SET"    | "INSERT" | "INTO"   | "VALUES"
  | "DELETE"
  // DDL
  | "CREATE" | "TABLE"  | "DROP"   | "ALTER"  | "ADD"   | "COLUMN"
  // Clauses
  | "ORDER"  | "BY"     | "GROUP"  | "HAVING" | "LIMIT" | "OFFSET"
  // Joins
  | "JOIN"   | "INNER"  | "LEFT"   | "RIGHT"  | "OUTER" | "CROSS" | "ON"
  // Misc
  | "AS"     | "IN"     | "LIKE"   | "IS"     | "NULL"  | "BETWEEN"
  | "CASE"   | "WHEN"   | "THEN"   | "ELSE"   | "END"
  | "EXISTS" | "UNION"  | "ALL"    | "DISTINCT"| "TOP"
  | "ASC"    | "DESC"   | "WITH"   | "USING";

/** `true` if the string is a recognised SQL keyword (case-insensitive). */
export type IsKeyword<T extends string> =
  Uppercase<T> extends SQLKeyword ? true : false;

// ─── §3 Parameter extraction ──────────────────────────────────────────────

/**
 * Count `?` positional placeholders in a SQL string and return a same-length
 * tuple of `unknown`.  Each element may later be narrowed by the caller.
 *
 * @example
 *   CountParams<'WHERE id = ? AND name = ?'>  →  [unknown, unknown]
 */
export type CountParams<S extends string, Acc extends unknown[] = []> =
  S extends `${string}?${infer Rest}`
    ? CountParams<Rest, [...Acc, unknown]>
    : Acc;

// ─── §3b Dollar-parameter extraction ($1, $2, …) ─────────────────────────

/** Single decimal digit — used to detect that a `$N` is a prefix of `$NM`. */
type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

/**
 * `true` iff the SQL string contains `$N` as a *standalone* positional
 * parameter (i.e. `$N` is NOT followed by another digit such that it would
 * be a prefix of `$10`, `$12`, etc.).
 */
type HasDollarParam<S extends string, N extends string> =
  S extends `${string}$${N}${infer After}`
    ? After extends `${Digit}${string}`
      ? HasDollarParam<After, N>   // $N was a prefix of a larger $NX — keep scanning
      : true                        // standalone $N found
    : false;

/**
 * Walk candidate indices `"1"` … `"20"` and return the highest N for which
 * `$N` appears as a standalone parameter in the SQL string.
 * Returns `"0"` when no `$N` params are found.
 */
type MaxDollarIndex<
  S extends string,
  Candidates extends string[] = [
    "1","2","3","4","5","6","7","8","9","10",
    "11","12","13","14","15","16","17","18","19","20"
  ],
  Max extends string = "0",
> =
  Candidates extends [infer N extends string, ...infer Rest extends string[]]
    ? HasDollarParam<S, N> extends true
      ? MaxDollarIndex<S, Rest, N>
      : MaxDollarIndex<S, Rest, Max>
    : Max;

/**
 * Convert the string representation of a non-negative integer to a tuple of
 * that many `unknown` elements, using the array's `length` as a counter.
 *
 * @example
 *   StringToTuple<"3">  →  [unknown, unknown, unknown]
 */
type StringToTuple<
  N extends string,
  Acc extends unknown[] = [],
> =
  `${Acc["length"]}` extends N
    ? Acc
    : StringToTuple<N, [...Acc, unknown]>;

/**
 * Return a tuple whose length equals the highest `$N` index found in `S`.
 * Returns `[]` when no dollar parameters are present.
 *
 * @example
 *   CountDollarParams<'WHERE id = $1 AND name = $2'>  →  [unknown, unknown]
 */
export type CountDollarParams<S extends string> =
  StringToTuple<MaxDollarIndex<S>>;

/** `true` iff the SQL string contains at least one `$N` dollar parameter. */
type HasAnyDollarParam<S extends string> =
  S extends `${string}$${Digit}${string}` ? true : false;

/**
 * Convert a numeric string to its `number` type.
 * `StringToNumber<"3">` → `3`
 */
type StringToNumber<S extends string> =
  S extends `${infer N extends number}` ? N : never;

/**
 * Validate that `$1` … `$N` all appear in `S` (no gaps).
 *
 * Walks from `N` down to `1` using `MinusOne`.  If any index is absent the
 * result is `false`, making `SQLParams` resolve to `never`.
 *
 * @example
 *   ValidateDollarSequential<'WHERE id = $1 AND name = $2', 2>  →  true
 *   ValidateDollarSequential<'WHERE id = $3', 3>                →  false  ($1, $2 missing)
 *   ValidateDollarSequential<'WHERE id = $1 AND x = $3', 3>     →  false  ($2 missing)
 */
type ValidateDollarSequential<S extends string, N extends number> =
  N extends 0
    ? true
    : HasDollarParam<S, `${N}`> extends true
      ? ValidateDollarSequential<S, MinusOne<N>>
      : false;

// ─── §4 FSM States ────────────────────────────────────────────────────────

type ParseSQL<S extends string> =
  Uppercase<Head<S>> extends "SELECT" ? StateAfterSELECT<Tail<S>, S>
  : Uppercase<Head<S>> extends "UPDATE" ? StateAfterUPDATE<Tail<S>, S>
  : Uppercase<Head<S>> extends "DELETE" ? StateAfterDELETE<Tail<S>, S>
  : Uppercase<Head<S>> extends "INSERT" ? StateAfterINSERT<Tail<S>, S>
  : Uppercase<Head<S>> extends "CREATE" ? StateAfterCREATE<Tail<S>, S>
  : never;

type StateAfterSELECT<S extends string, Full extends string> =
  S extends ""
    ? never
    : Uppercase<Head<S>> extends "FROM"
      ? StateAfterFROM<Tail<S>, Full>
      : StateAfterSELECT<Tail<S>, Full>;

type StateAfterFROM<S extends string, Full extends string> =
  S extends ""
    ? never
    : IsKeyword<Head<S>> extends true
      ? never
      : StateTailClauses<Tail<S>, Full>;

type StateAfterUPDATE<S extends string, Full extends string> =
  S extends ""
    ? never
    : IsKeyword<Head<S>> extends true
      ? never
      : StateNeedSET<Tail<S>, Full>;

type StateNeedSET<S extends string, Full extends string> =
  S extends ""
    ? never
    : Uppercase<Head<S>> extends "SET"
      ? StateSetClause<Tail<S>, Full>
      : StateNeedSET<Tail<S>, Full>;

type StateSetClause<S extends string, Full extends string> =
  S extends ""
    ? CountParams<Full>
    : Uppercase<Head<S>> extends "WHERE"
      ? StateWhereClause<Tail<S>, Full>
      : Uppercase<Head<S>> extends "ORDER"
        ? StateOrderBy<Tail<S>, Full>
        : Uppercase<Head<S>> extends "LIMIT"
          ? StateLimitClause<Tail<S>, Full>
          : StateSetClause<Tail<S>, Full>;

type StateAfterDELETE<S extends string, Full extends string> =
  Uppercase<Head<S>> extends "FROM"
    ? StateAfterFROM<Tail<S>, Full>
    : never;

type StateAfterINSERT<S extends string, Full extends string> =
  Uppercase<Head<S>> extends "INTO"
    ? StateInsertTable<Tail<S>, Full>
    : never;

type StateInsertTable<S extends string, Full extends string> =
  S extends ""
    ? never
    : IsKeyword<Head<S>> extends true
      ? never
      : StateInsertAfterTable<Tail<S>, Full>;

type StateInsertAfterTable<S extends string, Full extends string> =
  S extends ""
    ? never
    : Uppercase<Head<S>> extends "VALUES"
      ? CountParams<Full>
      : Uppercase<Head<S>> extends "SELECT"
        ? ParseSQL<S>
        : StateInsertAfterTable<Tail<S>, Full>;

type StateAfterCREATE<S extends string, Full extends string> =
  Uppercase<Head<S>> extends "TABLE"
    ? StateCreateTableName<Tail<S>, Full>
    : never;

type StateCreateTableName<S extends string, Full extends string> =
  S extends ""
    ? never
    : IsKeyword<Head<S>> extends true
      ? never
      : CountParams<Full>;

type StateTailClauses<S extends string, Full extends string> =
  S extends ""
    ? CountParams<Full>
    : Uppercase<Head<S>> extends "WHERE"
      ? StateWhereClause<Tail<S>, Full>
      : Uppercase<Head<S>> extends "ORDER"
        ? StateOrderBy<Tail<S>, Full>
        : Uppercase<Head<S>> extends "GROUP"
          ? StateGroupBy<Tail<S>, Full>
          : Uppercase<Head<S>> extends "LIMIT"
            ? StateLimitClause<Tail<S>, Full>
            : Uppercase<Head<S>> extends "INNER"
              ? StateJoinKind<Tail<S>, Full>
              : Uppercase<Head<S>> extends "LEFT"
                ? StateJoinKind<Tail<S>, Full>
                : Uppercase<Head<S>> extends "RIGHT"
                  ? StateJoinKind<Tail<S>, Full>
                  : Uppercase<Head<S>> extends "CROSS"
                    ? StateJoinKind<Tail<S>, Full>
                    : Uppercase<Head<S>> extends "JOIN"
                      ? StateJoinTable<Tail<S>, Full>
                      : StateTailClauses<Tail<S>, Full>;

type StateWhereClause<S extends string, Full extends string> =
  S extends ""
    ? CountParams<Full>
    : Uppercase<Head<S>> extends "ORDER"
      ? StateOrderBy<Tail<S>, Full>
      : Uppercase<Head<S>> extends "GROUP"
        ? StateGroupBy<Tail<S>, Full>
        : Uppercase<Head<S>> extends "LIMIT"
          ? StateLimitClause<Tail<S>, Full>
          : StateWhereClause<Tail<S>, Full>;

type StateOrderBy<S extends string, Full extends string> =
  Uppercase<Head<S>> extends "BY"
    ? StateAfterOrderBy<Tail<S>, Full>
    : never;

type StateAfterOrderBy<S extends string, Full extends string> =
  S extends ""
    ? CountParams<Full>
    : Uppercase<Head<S>> extends "LIMIT"
      ? StateLimitClause<Tail<S>, Full>
      : Uppercase<Head<S>> extends "OFFSET"
        ? StateOffsetClause<Tail<S>, Full>
        : StateAfterOrderBy<Tail<S>, Full>;

type StateGroupBy<S extends string, Full extends string> =
  Uppercase<Head<S>> extends "BY"
    ? StateAfterGroupBy<Tail<S>, Full>
    : never;

type StateAfterGroupBy<S extends string, Full extends string> =
  S extends ""
    ? CountParams<Full>
    : Uppercase<Head<S>> extends "HAVING"
      ? StateWhereClause<Tail<S>, Full>
      : Uppercase<Head<S>> extends "ORDER"
        ? StateOrderBy<Tail<S>, Full>
        : Uppercase<Head<S>> extends "LIMIT"
          ? StateLimitClause<Tail<S>, Full>
          : StateAfterGroupBy<Tail<S>, Full>;

type StateLimitClause<S extends string, Full extends string> =
  S extends ""
    ? never
    : StateAfterLimit<Tail<S>, Full>;

type StateAfterLimit<S extends string, Full extends string> =
  S extends ""
    ? CountParams<Full>
    : Uppercase<Head<S>> extends "OFFSET"
      ? StateOffsetClause<Tail<S>, Full>
      : CountParams<Full>;

type StateOffsetClause<S extends string, Full extends string> =
  S extends ""
    ? never
    : CountParams<Full>;

type StateJoinKind<S extends string, Full extends string> =
  Uppercase<Head<S>> extends "OUTER"
    ? StateJoinKind<Tail<S>, Full>
    : Uppercase<Head<S>> extends "JOIN"
      ? StateJoinTable<Tail<S>, Full>
      : never;

type StateJoinTable<S extends string, Full extends string> =
  S extends ""
    ? never
    : IsKeyword<Head<S>> extends true
      ? never
      : StateJoinOn<Tail<S>, Full>;

type StateJoinOn<S extends string, Full extends string> =
  Uppercase<Head<S>> extends "ON"
    ? StateTailClauses<Tail<S>, Full>
    : Uppercase<Head<S>> extends "USING"
      ? StateTailClauses<Tail<S>, Full>
      : never;

// ─── §5 Public API ────────────────────────────────────────────────────────

/**
 * Returns the tuple of parameter types for a valid SQL string.
 * Returns `never` if the SQL is structurally invalid.
 *
 * Supports both `?` (positional, MySQL/SQLite style) and `$N`
 * (numbered, PostgreSQL style) parameters.
 *
 * @example
 *   SQLParams<'SELECT * FROM users WHERE id = ?'>           → [unknown]
 *   SQLParams<'SELECT * FROM users WHERE id = $1'>          → [unknown]
 *   SQLParams<'UPDATE t SET x = $1, y = $2 WHERE id = $3'>  → [unknown, unknown, unknown]
 *   SQLParams<'NOT VALID SQL'>                               → never
 */
export type SQLParams<S extends string> =
  ParseSQL<Trim<S>> extends never
    ? never
    : HasAnyDollarParam<Trim<S>> extends true
      ? ValidateDollarSequential<Trim<S>, StringToNumber<MaxDollarIndex<Trim<S>>>> extends true
        ? CountDollarParams<Trim<S>>
        : never
      : CountParams<Trim<S>>;

/**
 * Brand type: `S` if the SQL is structurally valid, `never` otherwise.
 *
 * @example
 *   function query<S extends string>(sql: ValidSQL<S>): ...
 */
export type ValidSQL<S extends string> =
  [SQLParams<S>] extends [never] ? never : S;

/**
 * Infer the parameter tuple from a SQL string — alias for `SQLParams`.
 */
export type InferSQLParams<S extends string> = SQLParams<S>;
