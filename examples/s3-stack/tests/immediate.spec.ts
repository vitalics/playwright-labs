/**
 * Immediate mode — the fixture uploads straight to MinIO DURING the test
 * (no reporter round-trip), so the object is verifiable in the same test:
 * put() returns the full key, and S3Client reads it right back.
 *
 * Every HTTP call supports AbortSignal; timeouts/retries come from `http`.
 */
import { S3Client } from "@playwright-labs/s3-core";
import { createFixture } from "@playwright-labs/fixture-s3";

const S3 = {
  endpoint: "http://localhost:9000",
  accessKeyId: "minioadmin",
  secretAccessKey: "minioadmin",
};

const { test, expect } = createFixture({
  mode: "immediate",
  ...S3,
  bucket: "pw-immediate",
  prefix: "runs/latest",
  http: { timeoutMs: 30_000, retries: 2 },
});

test("upload is in S3 before the test ends", async ({ useBucket }) => {
  const ref = await useBucket().put(
    { checkedAt: "in-test", ok: true },
    { name: "live-report.json" },
  );

  expect(ref.bucket).toBe("pw-immediate");
  expect(ref.key).toBeDefined();

  // read it back immediately — impossible in deferred mode
  const client = new S3Client(S3);
  const body = await client.getObject(ref.bucket, ref.key!);
  expect(JSON.parse(body.toString("utf8"))).toEqual({
    checkedAt: "in-test",
    ok: true,
  });
});

test("writable stream: log lines land as one object", async ({ useBucket }) => {
  const log = useBucket().createWriteStream({
    name: "steps.log",
    contentType: "text/plain",
  });

  log.write("step 1: prepare\n");
  log.write("step 2: act\n");
  log.end("step 3: assert\n");

  const ref = await log.done; // finish === uploaded

  const client = new S3Client(S3);
  const body = await client.getObject(ref.bucket, ref.key!);
  expect(body.toString("utf8")).toBe(
    "step 1: prepare\nstep 2: act\nstep 3: assert\n",
  );
});

test("upload can be cancelled with AbortSignal", async ({ useBucket }) => {
  const controller = new AbortController();
  controller.abort(); // pretend the test decided to bail out

  await expect(
    useBucket().put("never lands", { signal: controller.signal }),
  ).rejects.toThrow(/abort/i);
});
