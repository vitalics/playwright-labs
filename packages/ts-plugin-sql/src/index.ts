/**
 * @playwright-labs/ts-plugin-sql — user-facing API
 *
 * Import the runtime `sql` tag and schema types from this entry point.
 * The TypeScript language service plugin factory is automatically loaded by
 * tsserver via the package `main` field (`dist/plugin.cjs`); you do NOT need
 * to import it manually.
 *
 * Usage in tsconfig.json:
 * ```json
 * {
 *   "compilerOptions": {
 *     "plugins": [
 *       {
 *         "name": "@playwright-labs/ts-plugin-sql",
 *         "tag": "sql",
 *         "schemaFile": "./src/db-types.ts"
 *       }
 *     ]
 *   }
 * }
 * ```
 */

// Re-export sql tag from sql-core (the single source of truth).
export { sql } from "@playwright-labs/sql-core";
export type { SqlStatement, SQLParams } from "@playwright-labs/sql-core";
export type { PluginConfig, SchemaTable, SchemaColumn } from "./schema/types.js";
