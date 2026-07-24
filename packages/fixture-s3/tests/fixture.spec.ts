import { readFile, writeFile } from "node:fs/promises";
import { parseS3AttachmentName } from "@playwright-labs/s3-core";

import { test, expect } from "../src/fixture";

test.describe("useBucket · put", () => {
  test("object → JSON attachment with marker name", async ({ useBucket }, testInfo) => {
    const bucket = useBucket("some_bucket");
    await bucket.put({ qwe: "asd" });

    const attachment = testInfo.attachments.at(-1)!;
    expect(attachment.name).toBe("s3:some_bucket:data");
    expect(attachment.contentType).toBe("application/json");
    expect(attachment.body?.toString("utf8")).toBe('{"qwe":"asd"}');
  });

  test("string → text/plain", async ({ useBucket }, testInfo) => {
    await useBucket("b").put("hello");

    const attachment = testInfo.attachments.at(-1)!;
    expect(attachment.contentType).toBe("text/plain");
    expect(attachment.body?.toString("utf8")).toBe("hello");
  });

  test("Buffer and Uint8Array → octet-stream, bytes preserved", async ({
    useBucket,
  }, testInfo) => {
    await useBucket("b").put(Buffer.from([1, 2, 3]));
    await useBucket("b").put(new Uint8Array([4, 5]));

    const [buf, u8] = testInfo.attachments.slice(-2);
    expect(buf.contentType).toBe("application/octet-stream");
    expect([...buf.body!]).toEqual([1, 2, 3]);
    expect([...u8.body!]).toEqual([4, 5]);
  });

  test("name and contentType options override defaults", async ({
    useBucket,
  }, testInfo) => {
    await useBucket("b").put("a,b,c", {
      name: "table.csv",
      contentType: "text/csv",
    });

    const attachment = testInfo.attachments.at(-1)!;
    expect(attachment.name).toBe("s3:b:table.csv");
    expect(attachment.contentType).toBe("text/csv");
  });

  test("null and numbers serialize as JSON", async ({ useBucket }, testInfo) => {
    await useBucket("b").put(null);
    await useBucket("b").put(42);

    const [nullish, num] = testInfo.attachments.slice(-2);
    expect(nullish.body?.toString("utf8")).toBe("null");
    expect(num.body?.toString("utf8")).toBe("42");
    expect(num.contentType).toBe("application/json");
  });
});

test.describe("useBucket · putFile", () => {
  test("Buffer content", async ({ useBucket }, testInfo) => {
    await useBucket("b").putFile(Buffer.from("file-bytes"), {
      name: "a.bin",
    });

    const attachment = testInfo.attachments.at(-1)!;
    expect(attachment.name).toBe("s3:b:a.bin");
    expect(attachment.contentType).toBe("application/octet-stream");
    expect(attachment.body?.toString("utf8")).toBe("file-bytes");
  });

  test("path: attaches by reference, name defaults to basename", async ({
    useBucket,
  }, testInfo) => {
    const filePath = testInfo.outputPath("photo.jpg");
    await writeFile(filePath, "jpg-bytes");

    await useBucket("images").putFile(filePath);

    const attachment = testInfo.attachments.at(-1)!;
    expect(attachment.name).toBe("s3:images:photo.jpg");
    // attach({ path }) copies the file into test-results/attachments
    expect(attachment.path).toBeDefined();
    expect((await readFile(attachment.path!)).toString("utf8")).toBe("jpg-bytes");
  });

  test("path with custom name and contentType", async ({
    useBucket,
  }, testInfo) => {
    const filePath = testInfo.outputPath("data.bin");
    await writeFile(filePath, "x");

    await useBucket("b").putFile(filePath, {
      name: "renamed.bin",
      contentType: "application/x-custom",
    });

    const attachment = testInfo.attachments.at(-1)!;
    expect(attachment.name).toBe("s3:b:renamed.bin");
    expect(attachment.contentType).toBe("application/x-custom");
  });
});

test.describe("edge cases", () => {
  test("empty bucket name throws synchronously", async ({ useBucket }) => {
    expect(() => useBucket("")).toThrow(TypeError);
  });

  test("multiple buckets in one test keep separate markers", async ({
    useBucket,
  }, testInfo) => {
    await useBucket("alpha").put("1");
    await useBucket("beta").put("2");

    const [a, b] = testInfo.attachments.slice(-2);
    expect(parseS3AttachmentName(a.name)?.bucket).toBe("alpha");
    expect(parseS3AttachmentName(b.name)?.bucket).toBe("beta");
  });

  test("marker names produced by the fixture are parseable by the reporter side", async ({
    useBucket,
  }, testInfo) => {
    await useBucket("my-bucket").put("x", { name: "dir/file:v2.txt" });

    const attachment = testInfo.attachments.at(-1)!;
    expect(parseS3AttachmentName(attachment.name)).toEqual({
      bucket: "my-bucket",
      name: "dir/file:v2.txt",
    });
  });

  test("attachments accumulate in order", async ({ useBucket }, testInfo) => {
    const before = testInfo.attachments.length;
    const bucket = useBucket("b");
    await bucket.put("1");
    await bucket.put("2");
    await bucket.put("3");

    const names = testInfo.attachments.slice(before).map((a) => a.name);
    expect(names).toEqual(["s3:b:data", "s3:b:data", "s3:b:data"]);
  });
});
