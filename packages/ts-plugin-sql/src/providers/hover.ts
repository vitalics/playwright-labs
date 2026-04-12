import type * as tslib from "typescript/lib/tsserverlibrary";
import type { SchemaTable } from "../schema/types.js";
import { getSqlContext } from "../sql/context.js";
import { findTemplateAtPosition } from "../sql/ast-walker.js";

/**
 * Provide a quick-info tooltip when hovering a table/column name inside a
 * `sql\`...\`` template.
 *
 * Returns `undefined` when not applicable, falling through to the original
 * language service handler.
 */
export function getSqlQuickInfo(
  ts: typeof tslib,
  info: tslib.server.PluginCreateInfo,
  prior: tslib.QuickInfo | undefined,
  fileName: string,
  position: number,
  tagName: string,
  schema: SchemaTable[],
): tslib.QuickInfo | undefined {
  const program = info.languageService.getProgram();
  if (!program) return prior;

  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) return prior;

  const tmpl = findTemplateAtPosition(ts, sourceFile, position, tagName);
  if (!tmpl) return prior;

  const sqlOffset = position - tmpl.templateStart;

  // Determine the word under the cursor
  const word = getWordAtOffset(tmpl.sqlText, sqlOffset);
  if (!word) return prior;

  // Try to match word to a table name
  const table = schema.find((t) => t.name.toLowerCase() === word.text.toLowerCase());
  if (table) {
    const cols = table.columns.map((c) => `  ${c.name}: ${c.type}`).join("\n");
    return quickInfo(
      position - word.offset,
      word.text.length,
      `table ${table.name}`,
      `{\n${cols}\n}`,
    );
  }

  // Try to match word to a column in any table
  for (const t of schema) {
    const col = t.columns.find((c) => c.name.toLowerCase() === word.text.toLowerCase());
    if (col) {
      return quickInfo(
        position - word.offset,
        word.text.length,
        `column ${t.name}.${col.name}`,
        col.type,
      );
    }
  }

  return prior;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface WordAtOffset {
  text: string;
  /** Character offset from sqlOffset back to the start of the word. */
  offset: number;
}

function getWordAtOffset(sql: string, offset: number): WordAtOffset | undefined {
  // Find word boundaries around offset
  let start = offset;
  while (start > 0 && /\w/.test(sql[start - 1]!)) start--;
  let end = offset;
  while (end < sql.length && /\w/.test(sql[end]!)) end++;
  if (start === end) return undefined;
  return { text: sql.slice(start, end), offset: offset - start };
}

function quickInfo(
  textSpanStart: number,
  textSpanLength: number,
  displayParts: string,
  documentation: string,
): tslib.QuickInfo {
  return {
    kind: "module" as tslib.ScriptElementKind,
    kindModifiers: "",
    textSpan: { start: textSpanStart, length: textSpanLength },
    displayParts: [{ text: displayParts, kind: "text" }],
    documentation: [{ text: documentation, kind: "text" }],
    tags: [],
  };
}
