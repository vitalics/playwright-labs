/**
 * Sample tests demonstrating the two upload paths:
 *
 * 1. `useBucket()` (fixture-s3) — explicit uploads from inside a test,
 *    routed to the requested bucket via the `s3:<bucket>:<name>` marker.
 * 2. Plain `testInfo.attach()` — regular Playwright attachments, routed by
 *    the reporter's `attachmentBucket` resolver (images → pw-screenshots)
 *    or the default bucket (everything else → pw-artifacts).
 *
 * Nothing touches S3 during the test run — uploads happen once, at run end,
 * in the reporter's onEnd. Run `pnpm verify` afterwards to read everything
 * back from MinIO.
 */
import { createFixture } from "@playwright-labs/fixture-s3";

// Deferred mode (default): uploads are attachments, shipped by reporter-s3
// at run end — S3 connection settings live in playwright.config.ts.
// `bucket` sets the default for useBucket() without an argument.
// See immediate.spec.ts for the mode where the fixture uploads itself.
const { test, expect } = createFixture({ bucket: "pw-data" });

test("uploads a JSON report via useBucket", async ({ useBucket }) => {
  const bucket = useBucket(); // default bucket pw-data

  const report = { service: "checkout", passed: 12, failed: 0 };
  await bucket.put(report, { name: "checkout-report.json" });

  expect(report.failed).toBe(0);
});

test("uploads CSV and binary data to different buckets", async ({
  useBucket,
}) => {
  await useBucket("pw-data").put("id,name\n1,alpha\n2,beta", {
    name: "users.csv",
    contentType: "text/csv",
  });
  await useBucket("pw-blobs").putFile(Buffer.from([0xde, 0xad, 0xbe, 0xef]), {
    name: "dump.bin",
  });
});

test("plain attachments are routed by the reporter", async ({}, testInfo) => {
  // Image → pw-screenshots (attachmentBucket resolver in playwright.config.ts)
  await testInfo.attach("pixel.png", {
    body: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
    contentType: "image/png",
  });

  // Text → default bucket pw-artifacts
  await testInfo.attach("run-log.txt", {
    body: "everything went fine",
    contentType: "text/plain",
  });
});
