/**
 * Example Playwright config for ghost-cursor + fixture-ghost-cursor.
 *
 * Run all tests:
 *   pnpm test
 *
 * Run with visible browser (great for seeing the cursor in action):
 *   pnpm test:headed
 *
 * Open interactive UI mode:
 *   pnpm test:ui
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src/tests",
  timeout: 30_000,
  reporter: "list",
  use: {
    trace: "on-first-retry",
    // Slow down each action slightly so ghost cursor movements are visible
    // when running headed. Remove in CI.
    // actionTimeout: 5_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
