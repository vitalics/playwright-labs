import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "src/tests",
  timeout: 30_000,
  reporter: "list",
  use: {
    trace: "on-first-retry",
  },
});
