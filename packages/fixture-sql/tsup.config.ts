import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/adapters/pg.ts",
    "src/adapters/mysql.ts",
    "src/adapters/sqlite.ts",
  ],
  external: ["@playwright/test", "pg", "mysql2", "better-sqlite3", "@playwright-labs/sql-core"],
  format: ["cjs", "esm"],
  splitting: false,
  clean: true,
  cjsInterop: true,
  dts: true,
  target: ["node18"],
  shims: true,
  tsconfig: "./tsconfig.json",
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : format === "esm" ? `.mjs` : ".js",
    };
  },
});
