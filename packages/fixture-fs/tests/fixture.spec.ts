import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFixture, expect, test } from "../src/index";

test.describe("virtual mode (default)", () => {
  test("write/read round-trip", async ({ fs }) => {
    await fs.write("hello.txt", "hello world");
    await expect(fs.readText("hello.txt")).resolves.toBe("hello world");
    await expect(fs).toExist("hello.txt");
  });

  test("isolation: writes from other tests are absent", async ({ fs }) => {
    // "write/read round-trip" wrote hello.txt — each test gets a fresh FS
    await expect(fs).not.toExist("hello.txt");
    await expect(fs).toBeEmptyDir(".");
  });

  test("append and binary write", async ({ fs }) => {
    await fs.write("bin.dat", new Uint8Array([1, 2, 3]));
    await fs.append("bin.dat", Buffer.from([4, 5]));
    await expect(fs).toHaveContent("bin.dat", Buffer.from([1, 2, 3, 4, 5]));

    await fs.write("log.txt", "a\n");
    await fs.append("log.txt", "b\n");
    await expect(fs).toHaveText("log.txt", "a\nb\n");
  });

  test("mkdir, list and stat", async ({ fs }) => {
    await fs.mkdir("a/b/c");
    await fs.write("a/b/file.txt", "x");
    await expect(fs).toExist("a/b/c");

    const stat = await fs.stat("a/b/file.txt");
    expect(stat.isDirectory).toBe(false);
    expect(stat.size).toBe(1);

    await expect(fs.list("a")).resolves.toEqual(["b"]);
    await expect(fs).not.toBeEmptyDir("a");
    await expect(fs).toBeEmptyDir("a/b/c");
  });
});

// Determined at module load so the fixture can be registered statically.
const REAL_ROOT = join(tmpdir(), "fixture-fs-tests");

const { test: realTest } = createFixture({ mode: "real", cwd: REAL_ROOT });

realTest.describe("real mode", () => {
  realTest.beforeAll(async () => {
    await mkdir(REAL_ROOT, { recursive: true });
  });

  realTest.afterAll(async () => {
    await rm(REAL_ROOT, { recursive: true, force: true });
  });

  realTest("writes to disk rooted at cwd", async ({ fs }) => {
    expect(fs.root).toBe(REAL_ROOT);
    await fs.write("note.txt", "on disk");
    await expect(fs).toHaveText("note.txt", "on disk");

    const stat = await fs.stat("note.txt");
    expect(stat.size).toBeGreaterThan(0);
    expect(stat.isDirectory).toBe(false);
    // verify the file really landed on disk
    await expect(readFile(join(REAL_ROOT, "note.txt"), "utf8")).resolves.toBe(
      "on disk",
    );
    // real mode has no auto-cleanup — the file persists across tests
  });

  realTest("no auto-cleanup — file from previous test persists", async ({ fs }) => {
    await expect(fs).toHaveText("note.txt", "on disk");
  });
});

test.describe("createFixture validation", () => {
  test("unknown mode throws TypeError", () => {
    expect(() =>
      // @ts-expect-error intentional invalid mode
      createFixture({ mode: "memory" }),
    ).toThrow(TypeError);
  });

  test("cwd in virtual mode throws TypeError", () => {
    expect(() => createFixture({ cwd: "/tmp" })).toThrow(TypeError);
  });
});

test.describe("matchers", () => {
  test("toExist — pass, fail, .not", async ({ fs }) => {
    await fs.write("f.txt", "x");
    await expect(fs).toExist("f.txt");

    await expect(expect(fs).toExist("nope.txt")).rejects.toThrow(/to exist/);
    await expect(fs).not.toExist("nope.txt");
    await expect(expect(fs).not.toExist("f.txt")).rejects.toThrow(
      /not to exist/,
    );
  });

  test("toHaveText — string, RegExp, fail, missing file, .not", async ({
    fs,
  }) => {
    await fs.write("log.txt", "done in 42ms");
    await expect(fs).toHaveText("log.txt", "done in 42ms");
    await expect(fs).toHaveText("log.txt", /done in \d+ms/);
    await expect(fs).not.toHaveText("log.txt", "other");

    await expect(expect(fs).toHaveText("log.txt", "nope")).rejects.toThrow(
      /to have text/,
    );
    // missing file → clean assertion failure, not an unhandled ENOENT
    await expect(expect(fs).toHaveText("missing.txt", "x")).rejects.toThrow(
      /failed to read/,
    );
  });

  test("toHaveContent — pass, fail, missing file, .not", async ({ fs }) => {
    await fs.write("b.bin", Buffer.from([0xde, 0xad]));
    await expect(fs).toHaveContent("b.bin", Buffer.from([0xde, 0xad]));
    await expect(fs).toHaveContent("b.bin", new Uint8Array([0xde, 0xad]));
    await expect(fs).not.toHaveContent("b.bin", Buffer.from([0xbe, 0xef]));

    await expect(
      expect(fs).toHaveContent("b.bin", Buffer.from([0x00])),
    ).rejects.toThrow(/to have content/);
    await expect(
      expect(fs).toHaveContent("missing.bin", Buffer.alloc(0)),
    ).rejects.toThrow(/failed to read/);
  });

  test("toBeEmptyDir — pass, fail, file, missing, .not", async ({ fs }) => {
    await fs.mkdir("empty");
    await expect(fs).toBeEmptyDir("empty");

    await fs.mkdir("full");
    await fs.write("full/f.txt", "x");
    await expect(fs).not.toBeEmptyDir("full");
    await expect(expect(fs).toBeEmptyDir("full")).rejects.toThrow(
      /to be empty/,
    );

    await expect(expect(fs).toBeEmptyDir("full/f.txt")).rejects.toThrow(
      /to be a directory/,
    );
    await expect(expect(fs).toBeEmptyDir("missing")).rejects.toThrow(
      /does not exist/,
    );
  });
});
