import type { Reporter } from "@playwright/test/reporter";

/**
 * Stand-in for @playwright-labs/reporter-s3 in the fixture's own test run.
 * The file name intentionally contains "reporter-s3" so the fixture's
 * config check passes without real S3 credentials.
 */
export default class FakeS3Reporter implements Reporter {
  printsToStdio(): boolean {
    return false;
  }
}
