import type * as tslib from "typescript/lib/tsserverlibrary";
import { findAllTemplates } from "../sql/ast-walker.js";
import { validateSql } from "../sql/validator.js";

/** Synthetic diagnostic category code used to identify our diagnostics. */
const PLUGIN_CATEGORY = 1; // ts.DiagnosticCategory.Error

/**
 * Augment the prior semantic diagnostics array with SQL structural errors
 * found inside `sql\`...\`` template literals in the given file.
 */
export function getSqlDiagnostics(
  ts: typeof tslib,
  info: tslib.server.PluginCreateInfo,
  prior: tslib.Diagnostic[],
  fileName: string,
  tagName: string,
): tslib.Diagnostic[] {
  const program = info.languageService.getProgram();
  if (!program) return prior;

  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) return prior;

  const templates = findAllTemplates(ts, sourceFile, tagName);
  if (templates.length === 0) return prior;

  const extra: tslib.Diagnostic[] = [];

  for (const tmpl of templates) {
    const errors = validateSql(tmpl.sqlText);
    for (const e of errors) {
      extra.push({
        file: sourceFile,
        start: tmpl.templateStart + e.offset,
        length: e.length,
        messageText: e.message,
        category: PLUGIN_CATEGORY as tslib.DiagnosticCategory,
        code: 100001, // unique plugin error code
        source: "sql-plugin",
      });
    }
  }

  return [...prior, ...extra];
}
