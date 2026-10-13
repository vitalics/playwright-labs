import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",

  projects: [
    {
      name: "unit",
      testMatch: ["*.spec.ts", "!(*.e2e).test.ts"],
    },
    {
      name: "e2e",
      testMatch: "*.e2e.test.ts",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
