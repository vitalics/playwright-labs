/** All SQL keywords offered as completions. */
export const SQL_KEYWORDS: readonly string[] = [
  // DML
  "SELECT", "FROM", "WHERE", "AND", "OR", "NOT",
  "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE",
  // DDL
  "CREATE", "TABLE", "DROP", "ALTER", "ADD", "COLUMN",
  // Joins
  "JOIN", "INNER", "LEFT", "RIGHT", "OUTER", "CROSS", "ON", "USING",
  // Sorting / grouping
  "ORDER", "BY", "GROUP", "HAVING", "LIMIT", "OFFSET",
  // Expressions
  "AS", "IN", "LIKE", "IS", "NULL", "BETWEEN", "DISTINCT", "ALL", "UNION",
  "ASC", "DESC", "WITH", "EXISTS",
  // CASE
  "CASE", "WHEN", "THEN", "ELSE", "END",
  // Aggregate functions
  "COUNT", "SUM", "AVG", "MIN", "MAX",
  // Scalar functions
  "COALESCE", "NULLIF", "CAST", "UPPER", "LOWER", "LENGTH", "TRIM",
  // Types
  "INTEGER", "TEXT", "REAL", "BOOLEAN", "TIMESTAMP", "DATE", "TIME",
  "VARCHAR", "CHAR", "BIGINT", "SMALLINT", "FLOAT", "DECIMAL", "NUMERIC",
  "BLOB", "JSON", "UUID",
  // Constraints
  "PRIMARY", "KEY", "UNIQUE", "REFERENCES", "DEFAULT", "NOT NULL",
  "CHECK", "FOREIGN", "AUTO_INCREMENT", "SERIAL",
];

/** Keywords that begin a new SQL statement. */
export const STATEMENT_KEYWORDS: readonly string[] = [
  "SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "ALTER", "WITH",
];

/** Keywords that introduce a table reference. */
export const TABLE_CONTEXT_KEYWORDS: readonly string[] = [
  "FROM", "JOIN", "INTO", "UPDATE",
];

/** Keywords that introduce a column reference. */
export const COLUMN_CONTEXT_KEYWORDS: readonly string[] = [
  "SELECT", "WHERE", "AND", "OR", "ON", "SET", "HAVING", "GROUP", "ORDER",
];
