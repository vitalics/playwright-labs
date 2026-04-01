import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",

  projects: [
    {
      name: "unit",
      testMatch: "!(*.e2e).test.ts",
    },
    {
      name: "e2e",
      testMatch: "*.e2e.test.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:4200",
      },
    },
  ],

  webServer: {
    command:
      "pnpm --filter selectors-angular-example run dev",
    url: "http://localhost:4200",
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
