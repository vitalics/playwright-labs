import { test, expect } from "@playwright/test";
import { GenericContainer, type StartedTestContainer, Wait } from "testcontainers";
import type {
  FullConfig,
  FullResult,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

import { S3Client } from "@playwright-labs/s3-core";
import S3Reporter from "../src/reporter.js";

/** End-to-end: reporter uploads to a real MinIO, objects read back. Requires Docker. */
test.describe("S3Reporter × MinIO", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);
  test.skip(
    process.env.SKIP_INTEGRATION === "1",
    "SKIP_INTEGRATION=1 — integration tests disabled",
  );

  let container: StartedTestContainer;
  let endpoint: string;

  test.beforeAll(async () => {
    container = await new GenericContainer("minio/minio:latest")
      .withCommand(["server", "/data"])
      .withEnvironment({
        MINIO_ROOT_USER: "minioadmin",
        MINIO_ROOT_PASSWORD: "minioadmin",
      })
      .withExposedPorts(9000)
      .withWaitStrategy(Wait.forHttp("/minio/health/ready", 9000))
      .start();
    endpoint = `http://${container.getHost()}:${container.getMappedPort(9000)}`;
  });

  test.afterAll(async () => {
    await container?.stop();
  });

  test("full run: attachments routed by marker, summary readable back", async () => {
    const reporter = new S3Reporter({
      endpoint,
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
      bucket: "pw-reports",
      prefix: "it-run",
    });

    reporter.onBegin({} as FullConfig, {} as Suite);
    reporter.onTestEnd(
      {
        id: "t1",
        titlePath: () => ["", "chromium", "a.spec.ts", "uploads stuff"],
      } as unknown as TestCase,
      {
        status: "passed",
        duration: 10,
        retry: 0,
        errors: [],
        attachments: [
          {
            name: "screenshot",
            contentType: "image/png",
            body: Buffer.from("png-bytes"),
          },
          {
            // fixture-s3 marker → separate bucket
            name: "s3:pw-artifacts:payload.json",
            contentType: "application/json",
            body: Buffer.from('{"ok":true}'),
          },
        ],
      } as unknown as TestResult,
    );

    await reporter.onEnd({
      status: "passed",
      startTime: new Date(),
      duration: 100,
    } as FullResult);

    const client = new S3Client({
      endpoint,
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
    });

    // both buckets were created
    expect(await client.bucketExists("pw-reports")).toBe(true);
    expect(await client.bucketExists("pw-artifacts")).toBe(true);

    // summary readable and consistent
    const summary = JSON.parse(
      (await client.getObject("pw-reports", "it-run/summary.json")).toString(
        "utf8",
      ),
    );
    expect(summary.counts.passed).toBe(1);
    expect(summary.tests[0].attachments).toEqual([
      { bucket: "pw-reports", key: "it-run/attachments/t1/0-0-screenshot" },
      { bucket: "pw-artifacts", key: "it-run/attachments/t1/0-1-payload.json" },
    ]);

    // attachment contents intact in their buckets
    const screenshot = await client.getObject(
      "pw-reports",
      "it-run/attachments/t1/0-0-screenshot",
    );
    expect(screenshot.toString("utf8")).toBe("png-bytes");
    const payload = await client.getObject(
      "pw-artifacts",
      "it-run/attachments/t1/0-1-payload.json",
    );
    expect(JSON.parse(payload.toString("utf8"))).toEqual({ ok: true });
  });
});
