import { defineConfig } from "@playwright/test";

type TestConfig = {
  tms: () => string
}
export default defineConfig<TestConfig>({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    tms: () => "jira config"
    // custom: "qwe",
  },
});
