/**
 * Runtime `sql` tagged template tag.
 *
 * Builds a SQL string from a tagged template, replacing each interpolated
 * expression with a `?` placeholder.  Use together with the TypeScript plugin
 * for autocomplete and diagnostics:
 *
 * ```ts
 * import { sql } from '@playwright-labs/ts-plugin-sql';
 *
 * const { rows } = await db.query(sql`SELECT * FROM users WHERE id = ?`, [id]);
 * ```
 *
 * Interpolated values are NOT embedded in the string — they become `?`
 * placeholders so you can pass them as the second argument to `query` / `execute`.
 */
export function sql(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = "";
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      // Each interpolation becomes a positional parameter placeholder.
      result += "?";
    }
  }
  return result;
}
