import type * as tslib from "typescript/lib/tsserverlibrary";
import type { PluginConfig } from "./schema/types.js";
import { loadSchema } from "./schema/loader.js";
import { getSqlCompletions } from "./providers/completions.js";
import { getSqlDiagnostics } from "./providers/diagnostics.js";
import { getSqlQuickInfo } from "./providers/hover.js";

/**
 * TypeScript language service plugin factory.
 *
 * tsserver calls `init({ typescript })` once, expecting a `{ create }` object.
 * The `create` function receives `info` for each project and returns a decorated
 * `LanguageService`.
 */
function init(modules: { typescript: typeof tslib }) {
  const ts = modules.typescript;

  function create(info: tslib.server.PluginCreateInfo): tslib.LanguageService {
    const config = (info.config ?? {}) as PluginConfig;
    const tagName = config.tag ?? "sql";
    const log = (msg: string) =>
      info.project.projectService.logger.info(`[ts-plugin-sql] ${msg}`);

    log(`starting — tag: "${tagName}"`);

    // ── Resolve schema ──────────────────────────────────────────────────────
    const projectRoot = info.project.getCurrentDirectory();

    const readFile = (path: string) => ts.sys.readFile(path, "utf-8");

    const schema = loadSchema(config, projectRoot, ts, readFile, log);
    log(`schema loaded: ${schema.length} table(s)`);

    // ── Decorate LanguageService ────────────────────────────────────────────
    const proxy = Object.create(null) as tslib.LanguageService;
    const ls = info.languageService;

    // Forward all methods by default
    for (const key of Object.keys(ls) as Array<keyof tslib.LanguageService>) {
      const fn = ls[key];
      if (typeof fn === "function") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (proxy as any)[key] = (fn as (...args: unknown[]) => unknown).bind(ls);
      }
    }

    // ── Override: completions ───────────────────────────────────────────────
    proxy.getCompletionsAtPosition = (
      fileName: string,
      position: number,
      options: tslib.GetCompletionsAtPositionOptions | undefined,
      formattingSettings?: tslib.FormatCodeSettings,
    ) => {
      const prior = ls.getCompletionsAtPosition(
        fileName,
        position,
        options,
        formattingSettings,
      );
      return (
        getSqlCompletions(ts, info, prior, fileName, position, tagName, schema)
        ?? prior
      );
    };

    // ── Override: diagnostics ───────────────────────────────────────────────
    proxy.getSemanticDiagnostics = (fileName: string) => {
      const prior = ls.getSemanticDiagnostics(fileName);
      return getSqlDiagnostics(ts, info, prior, fileName, tagName);
    };

    // ── Override: hover ─────────────────────────────────────────────────────
    proxy.getQuickInfoAtPosition = (fileName: string, position: number) => {
      const prior = ls.getQuickInfoAtPosition(fileName, position);
      return (
        getSqlQuickInfo(ts, info, prior, fileName, position, tagName, schema)
        ?? prior
      );
    };

    return proxy;
  }

  return { create };
}

export = init;
