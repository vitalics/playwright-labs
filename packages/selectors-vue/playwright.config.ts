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
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:5173" },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: "pnpm --dir ./examples run dev",
        url: "http://localhost:5173",
        reuseExistingServer: true,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
