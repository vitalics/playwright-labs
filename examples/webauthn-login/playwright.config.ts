/**
 * Example Playwright config for @playwright-labs/fixture-webauthn.
 *
 * Run all tests:
 *   pnpm test
 *
 * Run with a visible browser:
 *   pnpm test:headed
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5176",
  },
  projects: [
    {
      // The CDP "WebAuthn" domain is Chromium-only.
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm run dev",
    url: "http://localhost:5176",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
