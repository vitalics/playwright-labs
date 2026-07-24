import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // fake-reporter-s3 satisfies the fixture's reporter-presence check
  reporter: [["list"], ["./tests/fake-reporter-s3.ts"]],
});
