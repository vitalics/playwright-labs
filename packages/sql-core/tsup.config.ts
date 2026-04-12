import { defineConfig } from "tsup";

const outExtension = ({ format }: { format: string }) => ({
  js: format === "cjs" ? ".cjs" : ".mjs",
});

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    cjsInterop: true,
    splitting: false,
    outExtension,
  },
  {
    entry: {
      "adapters/sqlite": "src/adapters/sqlite.ts",
      "adapters/pg": "src/adapters/pg.ts",
      "adapters/mysql": "src/adapters/mysql.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    cjsInterop: true,
    splitting: false,
    outExtension,
  },
  {
    entry: { cli: "bin/cli.ts", "pull-lib": "bin/pull-lib.ts" },
    outDir: "bin/dist",
    external: [
      "better-sqlite3", "pg", "mysql2",
      "@playwright-labs/sql-core",
      "commander",
    ],
    format: ["esm"],
    splitting: false,
    clean: false,
    dts: false,
    outExtension: () => ({ js: ".js" }),
  },
]);
