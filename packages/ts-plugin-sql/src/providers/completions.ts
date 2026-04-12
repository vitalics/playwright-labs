import type * as tslib from "typescript/lib/tsserverlibrary";
import type { SchemaTable } from "../schema/types.js";
import { getSqlContext } from "../sql/context.js";
import { SQL_KEYWORDS } from "../sql/keywords.js";
import { findTemplateAtPosition } from "../sql/ast-walker.js";

/**
 * Build completion entries inside a `sql\`...\`` template literal.
 *
 * Returns `undefined` when the cursor is not inside a SQL template, letting
 * the original language service handle completion normally.
 */
export function getSqlCompletions(
  ts: typeof tslib,
  info: tslib.server.PluginCreateInfo,
  prior: tslib.WithMetadata<tslib.CompletionInfo> | undefined,
  fileName: string,
  position: number,
  tagName: string,
  schema: SchemaTable[],
): tslib.WithMetadata<tslib.CompletionInfo> | undefined {
  const program = info.languageService.getProgram();
  if (!program) return prior;

  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) return prior;

  const tmpl = findTemplateAtPosition(ts, sourceFile, position, tagName);
  if (!tmpl) return prior;

  // Offset within the SQL string (0-based from first character inside backtick)
  const sqlOffset = position - tmpl.templateStart;
  const ctx = getSqlContext(tmpl.sqlText, sqlOffset);

  let entries: tslib.CompletionEntry[] = [];

  if (ctx.kind === "table") {
    entries = schema.map((t) => tableEntry(t.name));
  } else if (ctx.kind === "column") {
    const relevantTables = ctx.tables.length > 0
      ? schema.filter((t) => ctx.tables.includes(t.name.toLowerCase()))
      : schema;

    for (const table of relevantTables) {
      for (const col of table.columns) {
        entries.push(columnEntry(col.name, col.type, table.name));
      }
    }
  } else {
    // keyword context — offer SQL keywords
    entries = SQL_KEYWORDS.map(keywordEntry);
  }

  // Filter by what the user has already typed
  if (ctx.partial) {
    const lp = ctx.partial.toLowerCase();
    entries = entries.filter((e) => e.name.toLowerCase().startsWith(lp));
  }

  if (entries.length === 0) return prior;

  return {
    isGlobalCompletion: false,
    isMemberCompletion: false,
    isNewIdentifierLocation: false,
    entries,
  };
}

// ─── Entry builders ──────────────────────────────────────────────────────────

function tableEntry(name: string): tslib.CompletionEntry {
  return {
    name,
    kind: "module" as tslib.ScriptElementKind,
    kindModifiers: "",
    sortText: `0_${name}`,
    labelDetails: { description: "table" },
  };
}

function columnEntry(name: string, type: string, tableName: string): tslib.CompletionEntry {
  return {
    name,
    kind: "field" as tslib.ScriptElementKind,
    kindModifiers: "",
    sortText: `1_${tableName}_${name}`,
    labelDetails: { description: `${tableName}.${name}: ${type}` },
  };
}

function keywordEntry(keyword: string): tslib.CompletionEntry {
  return {
    name: keyword,
    kind: "keyword" as tslib.ScriptElementKind,
    kindModifiers: "",
    sortText: `2_${keyword}`,
  };
}
