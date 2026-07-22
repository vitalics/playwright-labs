import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  projects: [
    {
      name: "e2e",
      testMatch: "*.e2e.test.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:5174",
      },
    },
  ],

  webServer: {
    command: "pnpm run dev",
    url: "http://localhost:5174",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
