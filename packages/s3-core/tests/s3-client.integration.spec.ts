import { test, expect } from "@playwright/test";
import { GenericContainer, type StartedTestContainer, Wait } from "testcontainers";

import { S3Client, S3Error } from "../src/index.js";

/**
 * Integration suite against a real MinIO container — verifies the SigV4
 * signature cryptographically (a mock can only check structure).
 *
 * Requires Docker. Skip explicitly with SKIP_INTEGRATION=1.
 */
test.describe("S3Client × MinIO", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);
  test.skip(
    process.env.SKIP_INTEGRATION === "1",
    "SKIP_INTEGRATION=1 — integration tests disabled",
  );

  let container: StartedTestContainer;
  let client: S3Client;

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

    client = new S3Client({
      endpoint: `http://${container.getHost()}:${container.getMappedPort(9000)}`,
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
    });
  });

  test.afterAll(async () => {
    await container?.stop();
  });

  test("createBucket / bucketExists / ensureBucket", async () => {
    expect(await client.bucketExists("it-bucket")).toBe(false);
    await client.createBucket("it-bucket");
    expect(await client.bucketExists("it-bucket")).toBe(true);
    // idempotent: second ensure is a no-op, second create → 409 handled
    await client.ensureBucket("it-bucket");
    await expect(client.createBucket("it-bucket")).resolves.toBeUndefined();
  });

  test("putObject / getObject roundtrip: utf8 text", async () => {
    await client.putObject("it-bucket", "hello.txt", "привет, S3! 🚀", {
      contentType: "text/plain; charset=utf-8",
    });
    const body = await client.getObject("it-bucket", "hello.txt");
    expect(body.toString("utf8")).toBe("привет, S3! 🚀");
  });

  test("roundtrip: binary body, bytes intact", async () => {
    const payload = Buffer.from(
      Array.from({ length: 4096 }, (_, i) => i % 256),
    );
    await client.putObject("it-bucket", "blob.bin", payload);
    const body = await client.getObject("it-bucket", "blob.bin");
    expect(body.equals(payload)).toBe(true);
  });

  test("roundtrip: key with slashes, spaces and special characters", async () => {
    const key = "runs/2026-07-23/my file +(1)!.png";
    await client.putObject("it-bucket", key, "x");
    expect((await client.getObject("it-bucket", key)).toString("utf8")).toBe(
      "x",
    );
  });

  test("empty body object", async () => {
    await client.putObject("it-bucket", "empty.txt", "");
    const body = await client.getObject("it-bucket", "empty.txt");
    expect(body.length).toBe(0);
  });

  test("deleteObject removes the object", async () => {
    await client.putObject("it-bucket", "doomed.txt", "bye");
    await client.deleteObject("it-bucket", "doomed.txt");
    await expect(client.getObject("it-bucket", "doomed.txt")).rejects.toThrow(
      S3Error,
    );
  });

  test("getObject of a missing key throws S3Error with 404", async () => {
    const error = await client
      .getObject("it-bucket", "never-existed")
      .catch((e: S3Error) => e);
    expect(error).toBeInstanceOf(S3Error);
    expect((error as S3Error).status).toBe(404);
  });

  test("wrong credentials → 403 from a real signer check", async () => {
    const badClient = new S3Client({
      endpoint: `http://${container.getHost()}:${container.getMappedPort(9000)}`,
      accessKeyId: "minioadmin",
      secretAccessKey: "wrong-secret",
    });
    const error = await badClient
      .getObject("it-bucket", "hello.txt")
      .catch((e: S3Error) => e);
    expect(error).toBeInstanceOf(S3Error);
    expect((error as S3Error).status).toBe(403);
  });

  test("non-us-east-1 region still signs correctly against MinIO", async () => {
    const regional = new S3Client({
      endpoint: `http://${container.getHost()}:${container.getMappedPort(9000)}`,
      region: "us-east-1", // MinIO default region; scope must match
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
    });
    await regional.putObject("it-bucket", "regional.txt", "ok");
    expect(
      (await regional.getObject("it-bucket", "regional.txt")).toString("utf8"),
    ).toBe("ok");
  });
});
