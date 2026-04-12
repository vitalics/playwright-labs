/**
 * Runtime SQL structural validator.
 *
 * This is plain JavaScript logic — it does NOT use TypeScript's type system.
 * It catches obvious structural errors in SQL strings so they can be surfaced
 * as editor diagnostics.
 */

export interface SqlError {
  /** Human-readable error message. */
  message: string;
  /**
   * Character offset within the SQL string where the error starts.
   * Points to the beginning of the invalid token or the end of the string when
   * a required keyword is missing.
   */
  offset: number;
  /** Length of the highlighted region (in characters). */
  length: number;
}

/**
 * Validate the structural integrity of a SQL statement.
 * Returns an array of errors (empty = valid).
 */
export function validateSql(sql: string): SqlError[] {
  const trimmed = sql.trim();
  if (!trimmed) return [];

  const upper = trimmed.toUpperCase();
  const firstToken = upper.split(/\s+/)[0] ?? "";

  switch (firstToken) {
    case "SELECT": return validateSelect(trimmed);
    case "UPDATE": return validateUpdate(trimmed);
    case "DELETE": return validateDelete(trimmed);
    case "INSERT": return validateInsert(trimmed);
    case "CREATE": return validateCreate(trimmed);
    case "ALTER":
    case "DROP":
    case "WITH":
      return []; // Accept without deep validation
    default:
      return [
        {
          message: `Unknown SQL statement keyword: "${firstToken || trimmed}"`,
          offset: 0,
          length: firstToken.length || trimmed.length,
        },
      ];
  }
}

// ─── Statement validators ─────────────────────────────────────────────────────

function validateSelect(sql: string): SqlError[] {
  if (!hasKeyword(sql, "FROM")) {
    return [error("SELECT statement is missing FROM clause", sql, "SELECT")];
  }
  const fromTable = getTokenAfter(sql, "FROM");
  if (!fromTable || isKeyword(fromTable)) {
    return [error("Expected a table name after FROM", sql, "FROM")];
  }
  return [];
}

function validateUpdate(sql: string): SqlError[] {
  const table = getTokenAfter(sql, "UPDATE");
  if (!table || isKeyword(table)) {
    return [error("Expected a table name after UPDATE", sql, "UPDATE")];
  }
  if (!hasKeyword(sql, "SET")) {
    return [error("UPDATE statement is missing SET clause", sql, "UPDATE")];
  }
  return [];
}

function validateDelete(sql: string): SqlError[] {
  if (!hasKeyword(sql, "FROM")) {
    return [error("DELETE statement is missing FROM clause", sql, "DELETE")];
  }
  const fromTable = getTokenAfter(sql, "FROM");
  if (!fromTable || isKeyword(fromTable)) {
    return [error("Expected a table name after FROM", sql, "FROM")];
  }
  return [];
}

function validateInsert(sql: string): SqlError[] {
  if (!hasKeyword(sql, "INTO")) {
    return [error("INSERT statement is missing INTO keyword", sql, "INSERT")];
  }
  if (!hasKeyword(sql, "VALUES") && !hasKeyword(sql, "SELECT")) {
    return [error("INSERT statement is missing VALUES clause", sql, "INSERT")];
  }
  return [];
}

function validateCreate(sql: string): SqlError[] {
  if (!hasKeyword(sql, "TABLE")) {
    return [error("CREATE statement is missing TABLE keyword", sql, "CREATE")];
  }
  return [];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SQL_KEYWORDS_SET = new Set([
  "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "INSERT", "INTO", "VALUES",
  "UPDATE", "SET", "DELETE", "CREATE", "TABLE", "DROP", "ALTER", "ADD",
  "COLUMN", "JOIN", "INNER", "LEFT", "RIGHT", "OUTER", "CROSS", "ON", "ORDER",
  "BY", "GROUP", "HAVING", "LIMIT", "OFFSET", "AS", "DISTINCT", "ALL", "UNION",
  "CASE", "WHEN", "THEN", "ELSE", "END", "EXISTS", "WITH",
]);

function isKeyword(token: string): boolean {
  return SQL_KEYWORDS_SET.has(token.toUpperCase());
}

function hasKeyword(sql: string, keyword: string): boolean {
  return new RegExp(`\\b${keyword}\\b`, "i").test(sql);
}

/** Return the first non-whitespace token after `keyword` in `sql`. */
function getTokenAfter(sql: string, keyword: string): string | undefined {
  const m = new RegExp(`\\b${keyword}\\s+(\\S+)`, "i").exec(sql);
  return m ? m[1] : undefined;
}

/** Create an error pointing at the `keyword` occurrence in `sql`. */
function error(message: string, sql: string, keyword: string): SqlError {
  const idx = sql.toUpperCase().indexOf(keyword.toUpperCase());
  return {
    message,
    offset: idx >= 0 ? idx : 0,
    length: keyword.length,
  };
}
