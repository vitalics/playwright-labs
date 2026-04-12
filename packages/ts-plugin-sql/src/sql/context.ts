import { COLUMN_CONTEXT_KEYWORDS, TABLE_CONTEXT_KEYWORDS } from "./keywords.js";

/**
 * Describes what kind of identifier the user is currently typing inside a SQL
 * template literal.
 */
export type SqlContext =
  | { kind: "table"; partial: string }
  | { kind: "column"; partial: string; tables: string[] }
  | { kind: "keyword"; partial: string };

/**
 * Determine the SQL context at the given cursor offset within a SQL string.
 *
 * @param sqlText   The full SQL string (with `?` for interpolations)
 * @param offset    Cursor position measured from the start of `sqlText`
 */
export function getSqlContext(sqlText: string, offset: number): SqlContext {
  // The part of the SQL before the cursor
  const before = sqlText.slice(0, offset);

  // The word fragment the user is currently typing (partial token)
  const partial = getPartialWord(before);

  // SQL text without the partial word: used to find the last keyword
  const beforePartial = before.slice(0, before.length - partial.length).trimEnd();

  const tokens = tokenize(beforePartial);
  const lastKeyword = findLastKeyword(tokens);

  const tables = extractTableNames(tokens);

  if (TABLE_CONTEXT_KEYWORDS.includes(lastKeyword)) {
    // After FROM / JOIN / INTO / UPDATE — complete table names
    // Exception: after INTO in INSERT INTO, next is still a table name
    return { kind: "table", partial };
  }

  if (COLUMN_CONTEXT_KEYWORDS.includes(lastKeyword)) {
    return { kind: "column", partial, tables };
  }

  return { kind: "keyword", partial };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Return the trailing partial word (letters, digits, underscores, dots). */
function getPartialWord(s: string): string {
  const m = /[\w.]+$/.exec(s);
  return m ? m[0] : "";
}

/** Tokenize a SQL string into uppercase tokens (words only). */
function tokenize(sql: string): string[] {
  return sql
    .split(/[\s,;()=<>!]+/)
    .map((t) => t.toUpperCase())
    .filter(Boolean);
}

/** Find the last SQL keyword in the token list. */
function findLastKeyword(tokens: string[]): string {
  const keywords = new Set([
    "SELECT", "FROM", "WHERE", "AND", "OR", "NOT",
    "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE",
    "JOIN", "INNER", "LEFT", "RIGHT", "OUTER", "CROSS", "ON",
    "ORDER", "BY", "GROUP", "HAVING", "LIMIT", "OFFSET",
    "CREATE", "TABLE", "DROP", "ALTER",
  ]);
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (keywords.has(tokens[i]!)) return tokens[i]!;
  }
  return "";
}

/**
 * Scan the token list for table names: identifiers that immediately follow
 * FROM or JOIN.
 */
function extractTableNames(tokens: string[]): string[] {
  const tables: string[] = [];
  const triggerKeywords = new Set(["FROM", "JOIN", "UPDATE"]);

  for (let i = 0; i < tokens.length - 1; i++) {
    if (triggerKeywords.has(tokens[i]!)) {
      const next = tokens[i + 1];
      if (next && !/^(WHERE|ORDER|GROUP|HAVING|LIMIT|SET|ON|INNER|LEFT|RIGHT|OUTER|CROSS|JOIN)$/.test(next)) {
        tables.push(next.toLowerCase());
      }
    }
  }
  return [...new Set(tables)];
}
