import { defineConfig } from "tsup";

export default defineConfig({
  // Two entry points:
  //   plugin.ts  → dist/plugin.cjs  (tsserver plugin factory, loaded via package "main")
  //   index.ts   → dist/index.cjs   (user-facing API: sql tag + types)
  entry: ["src/plugin.ts", "src/index.ts"],
  // typescript is provided by tsserver at runtime — never bundle it
  external: ["typescript", "@playwright-labs/sql-core"],
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
      js: format === "cjs" ? ".cjs" : ".mjs",
    };
  },
});
