import { defineConfig } from "@playwright/test";

// On macOS with Docker Desktop, testcontainers may not auto-detect the Docker
// socket. Fall back to the standard Unix socket path if DOCKER_HOST is unset.
process.env.DOCKER_HOST ??= "unix:///var/run/docker.sock";

export default defineConfig({
  testDir: "./tests",
  // Docker container startup can take time, especially on first pull
  timeout: 120_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
});
