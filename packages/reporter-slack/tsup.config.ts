import { defineConfig } from "tsup";

export default defineConfig(() => ({
  entry: {
    index: "src/index.ts",
    "templates/index": "src/templates/index.ts",
    "templates/base": "src/templates/base.tsx",
    "templates/with-options": "src/templates/with-options.tsx",
    "templates/with-table": "src/templates/with-table.tsx",
  },
  external: [
    "@playwright/test",
    "@playwright-labs/slack-buildkit",
    "react",
    "react-dom",
  ],
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
}));
