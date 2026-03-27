import { defineConfig } from "tsup";

export default defineConfig(() => ({
  entry: {
    index: "src/index.ts",
    "templates/index": "src/templates/index.ts",
    "templates/base": "src/templates/base.ts",
    "templates/tailwind-base": "src/templates/tailwind-base.ts",
    "templates/shadcn/index": "src/templates/shadcn/index.ts",
    "templates/shadcn/base": "src/templates/shadcn/base.ts",
    "templates/shadcn/base-chart": "src/templates/shadcn/base-chart.ts",
    "templates/shadcn/base-button": "src/templates/shadcn/base-button.ts",
    "templates/shadcn/base-themes": "src/templates/shadcn/base-themes.ts",
  },
  external: [
    "@playwright/test",
    "react",
    "react-dom",
    "@react-email/components",
    "@react-email/render",
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
