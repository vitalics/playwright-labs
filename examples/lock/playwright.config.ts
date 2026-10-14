import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  // Run tests in parallel on purpose — the locks are what keeps them from
  // stepping on each other's shared resources.
  fullyParallel: true,
  workers: 4,
  reporter: "list",
  // Starts one HttpLockServer for the whole run and exports LOCK_SERVER_URL,
  // so every worker locks through the same server.
  globalSetup: "./global-setup.ts",
});
