import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  projects: [
    {
      name: "unit",
      testMatch: "*.test.ts",
    },
  ],
});
