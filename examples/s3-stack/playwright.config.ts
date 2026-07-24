import { defineConfig } from "@playwright/test";

/**
 * Fixed prefix so verify.ts knows where to look. Without it the reporter
 * defaults to `runs/<ISO start timestamp>` — better for real projects
 * (every run keeps its artifacts), but unknowable for the verify script.
 */
export const RUN_PREFIX = "runs/latest";

/** Default bucket — plain testInfo.attach() attachments and summary.json. */
export const ARTIFACTS_BUCKET = "pw-artifacts";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  timeout: 60_000,
  retries: 0,
  workers: 1,

  reporter: [
    ["list"],
    [
      "@playwright-labs/reporter-s3",
      {
        endpoint: "http://localhost:9000",
        accessKeyId: "minioadmin",
        secretAccessKey: "minioadmin",
        bucket: ARTIFACTS_BUCKET,
        prefix: RUN_PREFIX,
        // Route image attachments to their own bucket; everything else
        // falls back to `bucket`. fixture-s3 markers win over this resolver.
        attachmentBucket: ({ contentType }) =>
          contentType?.startsWith("image/") ? "pw-screenshots" : undefined,
      },
    ],
  ],
});
