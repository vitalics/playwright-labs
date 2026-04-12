import type * as tslib from "typescript/lib/tsserverlibrary";

export interface TemplateInfo {
  /** Full SQL text with each `${expr}` substitution replaced by `?`. */
  sqlText: string;
  /** Absolute file position of the first character INSIDE the template (after `` ` ``). */
  templateStart: number;
  /** Absolute file position of the last character INSIDE the template (before closing `` ` ``). */
  templateEnd: number;
  /** The tagged template expression node. */
  node: tslib.TaggedTemplateExpression;
}

/**
 * Walk the AST of `sourceFile` looking for a `sql\`...\`` (or custom tag name)
 * tagged template expression that contains `position`.
 *
 * Returns `undefined` when the cursor is not inside such a template.
 */
export function findTemplateAtPosition(
  ts: typeof tslib,
  sourceFile: tslib.SourceFile,
  position: number,
  tagName: string,
): TemplateInfo | undefined {
  function visit(node: tslib.Node): TemplateInfo | undefined {
    if (
      ts.isTaggedTemplateExpression(node) &&
      ts.isIdentifier(node.tag) &&
      node.tag.text === tagName
    ) {
      const tmpl = node.template;
      // +1 and -1 to skip the surrounding backticks
      const start = tmpl.getStart(sourceFile) + 1;
      const end = tmpl.getEnd() - 1;

      if (position >= start && position <= end) {
        return {
          sqlText: extractSqlText(ts, tmpl, sourceFile),
          templateStart: start,
          templateEnd: end,
          node,
        };
      }
    }
    return ts.forEachChild(node, visit);
  }

  return visit(sourceFile);
}

/**
 * Collect ALL tagged template expressions matching `tagName` in the file.
 * Used by the diagnostics provider.
 */
export function findAllTemplates(
  ts: typeof tslib,
  sourceFile: tslib.SourceFile,
  tagName: string,
): TemplateInfo[] {
  const results: TemplateInfo[] = [];

  function visit(node: tslib.Node): void {
    if (
      ts.isTaggedTemplateExpression(node) &&
      ts.isIdentifier(node.tag) &&
      node.tag.text === tagName
    ) {
      const tmpl = node.template;
      const start = tmpl.getStart(sourceFile) + 1;
      const end = tmpl.getEnd() - 1;
      results.push({
        sqlText: extractSqlText(ts, tmpl, sourceFile),
        templateStart: start,
        templateEnd: end,
        node,
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return results;
}

/** Build a plain SQL string: head + `?` for each interpolated expression + tail. */
function extractSqlText(
  ts: typeof tslib,
  template: tslib.TemplateLiteral,
  sourceFile: tslib.SourceFile,
): string {
  if (ts.isNoSubstitutionTemplateLiteral(template)) {
    return template.text;
  }
  // Template expression: `head ${expr1} middle ${expr2} tail`
  let sql = template.head.text;
  for (const span of template.templateSpans) {
    sql += "?" + span.literal.text;
  }
  return sql;
}
