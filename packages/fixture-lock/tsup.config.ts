import { defineConfig } from "tsup";

export default defineConfig(() => ({
  entry: {
    index: "src/index.ts",
    "global-setup": "src/globalSetup.ts",
    "global-teardown": "src/globalTeardown.ts",
  },
  external: ["@playwright/test"],
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
