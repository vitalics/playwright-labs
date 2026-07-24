/**
 * Post-run verification — reads back from MinIO what the reporter uploaded.
 *
 * Must run AFTER `pnpm test:e2e`: the reporter uploads in onEnd, i.e. after
 * the last test finishes, so in-run verification is impossible by design.
 *
 * Checks:
 *   1. `summary.json` exists in the default bucket and reports "passed"
 *   2. every attachment referenced by the summary is readable back
 *   3. fixture-s3 uploads landed in the buckets the tests asked for
 */
import assert from "node:assert/strict";
import { S3Client } from "@playwright-labs/s3-core";

import { ARTIFACTS_BUCKET, RUN_PREFIX } from "./playwright.config.js";

const client = new S3Client({
  endpoint: "http://localhost:9000",
  accessKeyId: "minioadmin",
  secretAccessKey: "minioadmin",
});

type SummaryTest = {
  title: string;
  status: string;
  attachments: Array<{ bucket: string; key: string }>;
};
type Summary = { status: string; counts: unknown; tests: SummaryTest[] };

console.log(`Reading s3://${ARTIFACTS_BUCKET}/${RUN_PREFIX}/summary.json …`);
const summary: Summary = JSON.parse(
  (await client.getObject(ARTIFACTS_BUCKET, `${RUN_PREFIX}/summary.json`)).toString("utf8"),
);

assert.equal(summary.status, "passed", `run status is "${summary.status}"`);
assert.ok(summary.tests.length > 0, "summary contains no tests");
console.log(`✔ summary.json: status=${summary.status}, tests=${summary.tests.length}`);

const refs = summary.tests.flatMap((t) => t.attachments);
assert.ok(refs.length > 0, "summary references no attachments");

for (const { bucket, key } of refs) {
  const body = await client.getObject(bucket, key);
  assert.ok(body.length > 0, `s3://${bucket}/${key} is empty`);
  console.log(`✔ s3://${bucket}/${key} (${body.length} bytes)`);
}

const buckets = new Set(refs.map((r) => r.bucket));
for (const expected of ["pw-data", "pw-blobs", "pw-screenshots", ARTIFACTS_BUCKET]) {
  assert.ok(buckets.has(expected), `no attachment landed in bucket "${expected}"`);
}
console.log(`✔ bucket routing: ${[...buckets].sort().join(", ")}`);

console.log("\nAll uploads verified. Browse them at http://localhost:9001 (minioadmin / minioadmin).");
