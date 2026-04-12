/** @import { SQLParams } from "./SQLType.js" */
/** @import { SqlStatement } from "./types.js" */

/**
 * Tagged template literal **or** plain string/array call for SQL queries.
 *
 * A single generic type handles all three calling forms via conditional return:
 *
 * | Form                        | T inferred as            | Return type          |
 * |-----------------------------|--------------------------|----------------------|
 * | `` sql`SELECT …` ``         | `TemplateStringsArray`   | `string`             |
 * | `sql("SELECT …")`           | literal string `S`       | `SqlStatement<P>`    |
 * | `sql(["SELECT …"])`         | literal tuple `[S]`      | `SqlStatement<P>`    |
 * | `sql(["part1", "part2"])`   | two-element tuple        | `string`             |
 *
 * TypeScript always infers `TemplateStringsArray` for tagged template `strings`
 * arguments (frozen readonly array with `raw`), which prevents literal-type
 * inference.  Mutable `string[]` literals DO preserve literal tuple types under
 * `const` inference, enabling compile-time SQL validation for the array form.
 *
 * @example
 * ```js
 * const q1 = sql`SELECT * FROM users WHERE id = ?`; // string
 * const q2 = sql("SELECT * FROM users WHERE id = ?"); // SqlStatement<[unknown]>
 * const q3 = sql(["SELECT * FROM users WHERE id = ?"]); // SqlStatement<[unknown]>
 * const q4 = sql(["SELECT * FROM ", " WHERE id = ?"]); // string (dynamic)
 * const q5 = sql("SELEC * FROM users"); // never (invalid SQL)
 * ```
 *
 * @type {<const T extends TemplateStringsArray | string | string[]>(strings: T, ...values: readonly unknown[]) =>
 *   T extends TemplateStringsArray
 *     ? string
 *     : T extends string
 *       ? (SQLParams<T> extends never ? never : SqlStatement<SQLParams<T>>)
 *       : T extends readonly [infer S extends string]
 *         ? (SQLParams<S> extends never ? never : SqlStatement<SQLParams<S>>)
 *         : string
 * }
 */
export const sql = /** @type {any} */ (
  /** @param {any} strings @param {...any} values */
  function sql(strings, ...values) {
    if (typeof strings === "string") {
      return strings;
    }
    if (values.length === 0) {
      return strings[0];
    }
    let result = "";
    for (let i = 0; i < strings.length; i++) {
      result += strings[i];
      if (i < values.length) {
        result += String(values[i]);
      }
    }
    return result;
  }
);
