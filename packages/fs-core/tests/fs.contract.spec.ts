import { test, expect } from "@playwright/test";
import { Readable } from "node:stream";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import nodePath from "node:path";
import {
  RealFileSystem,
  VirtualFileSystem,
  type FileSystem,
} from "../src/index.js";

const backends: Array<
  [name: string, create: (root: string) => FileSystem]
> = [
  ["RealFileSystem", (root) => new RealFileSystem(root)],
  ["VirtualFileSystem", (root) => new VirtualFileSystem(root)],
];

for (const [name, create] of backends) {
  test.describe(`FileSystem contract: ${name}`, () => {
    let root: string;
    let fsx: FileSystem;

    test.beforeEach(async () => {
      root = await fs.mkdtemp(nodePath.join(os.tmpdir(), "fs-core-"));
      fsx = create(name === "VirtualFileSystem" ? "/root" : root);
    });

    test.afterEach(async () => {
      await fs.rm(root, { recursive: true, force: true });
    });

    test("write + read round-trip: string", async () => {
      await fsx.write("a.txt", "hello");
      expect((await fsx.read("a.txt")).toString("utf8")).toBe("hello");
    });

    test("write + read round-trip: Buffer", async () => {
      const payload = Buffer.from([0, 1, 2, 255]);
      await fsx.write("b.bin", payload);
      expect(await fsx.read("b.bin")).toEqual(payload);
    });

    test("write + read round-trip: Uint8Array", async () => {
      const payload = new Uint8Array([5, 6, 7]);
      await fsx.write("c.bin", payload);
      expect(await fsx.read("c.bin")).toEqual(Buffer.from(payload));
    });

    test("write + read round-trip: node Readable", async () => {
      await fsx.write("d.txt", Readable.from(["foo", "bar"]));
      expect((await fsx.read("d.txt")).toString("utf8")).toBe("foobar");
    });

    test("write + read round-trip: web ReadableStream", async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("web"));
          controller.enqueue(new TextEncoder().encode("-stream"));
          controller.close();
        },
      });
      await fsx.write("e.txt", stream);
      expect((await fsx.read("e.txt")).toString("utf8")).toBe("web-stream");
    });

    test("readText with encoding", async () => {
      await fsx.write("f.txt", "héllo");
      expect(await fsx.readText("f.txt")).toBe("héllo");
      await fsx.write("g.txt", Buffer.from("fffe", "hex"));
      expect(await fsx.readText("g.txt", "hex")).toBe("fffe");
    });

    test("write creates parent directories recursively", async () => {
      await fsx.write("deep/nested/dir/file.txt", "x");
      expect(await fsx.readText("deep/nested/dir/file.txt")).toBe("x");
    });

    test("append", async () => {
      await fsx.write("h.txt", "one");
      await fsx.append("h.txt", "-two");
      await fsx.append("h.txt", Buffer.from("-three"));
      expect(await fsx.readText("h.txt")).toBe("one-two-three");
    });

    test("exists", async () => {
      expect(await fsx.exists("nope.txt")).toBe(false);
      await fsx.write("yes.txt", "x");
      expect(await fsx.exists("yes.txt")).toBe(true);
      await fsx.mkdir("dir");
      expect(await fsx.exists("dir")).toBe(true);
    });

    test("stat", async () => {
      await fsx.write("s.txt", "1234");
      const stat = await fsx.stat("s.txt");
      expect(stat.size).toBe(4);
      expect(stat.isDirectory).toBe(false);
      expect(stat.mtimeMs).toBeGreaterThan(0);
      expect(stat.mtimeMs).toBeLessThanOrEqual(Date.now() + 1000);
      await fsx.mkdir("sdir");
      const dirStat = await fsx.stat("sdir");
      expect(dirStat.isDirectory).toBe(true);
    });

    test("mkdir recursive", async () => {
      await fsx.mkdir("m1/m2/m3");
      expect(await fsx.exists("m1/m2/m3")).toBe(true);
      // idempotent
      await fsx.mkdir("m1/m2/m3");
    });

    test("remove: file, dir, and missing (no-op)", async () => {
      await fsx.write("r/file.txt", "x");
      await fsx.remove("r/file.txt");
      expect(await fsx.exists("r/file.txt")).toBe(false);

      await fsx.write("r2/a/b/c.txt", "x");
      await fsx.remove("r2");
      expect(await fsx.exists("r2")).toBe(false);

      await fsx.remove("missing.txt"); // rm -rf semantics: no-op
    });

    test("list returns entry names, default '.'", async () => {
      await fsx.write("l/one.txt", "1");
      await fsx.write("l/two.txt", "2");
      await fsx.write("l/sub/three.txt", "3");
      expect((await fsx.list("l")).sort()).toEqual(["one.txt", "sub", "two.txt"]);

      await fsx.write("top.txt", "x");
      const rootEntries = await fsx.list();
      expect(rootEntries).toContain("top.txt");
      expect(rootEntries).toContain("l");
      // names only, not full paths
      expect(rootEntries.every((entry) => !entry.includes("/"))).toBe(true);
    });

    test("read of a missing file throws ENOENT with code property", async () => {
      const error = await fsx.read("missing.txt").catch((e: unknown) => e);
      expect(error).toBeInstanceOf(Error);
      expect((error as NodeJS.ErrnoException).code).toBe("ENOENT");
    });

    test("entries returns File and Directory entries with size", async () => {
      await fsx.write("e/one.txt", "1234"); // 4 bytes
      await fsx.write("e/sub/three.txt", "abc"); // 3 bytes
      await fsx.write("e/sub/deep/four.txt", "xy"); // 2 bytes
      await fsx.mkdir("e/empty");

      const entries = await fsx.entries("e");
      const byName = new Map(entries.map((entry) => [entry.name, entry]));

      expect([...byName.keys()].sort()).toEqual(["empty", "one.txt", "sub"]);
      expect(byName.get("one.txt")).toMatchObject({ isDirectory: false, size: 4 });
      // directory size is the recursive total of the files inside
      expect(byName.get("sub")).toMatchObject({ isDirectory: true, size: 5 });
      expect(byName.get("empty")).toMatchObject({ isDirectory: true, size: 0 });
    });

    test("entries throws for a missing directory and a file path", async () => {
      await fsx.write("file.txt", "x");
      await expect(fsx.entries("missing")).rejects.toThrow();
      await expect(fsx.entries("file.txt")).rejects.toThrow();
    });

    test("escaping the root via '..' throws", async () => {
      await expect(fsx.write("../evil.txt", "x")).rejects.toThrow();
      await expect(fsx.read("a/../../evil.txt")).rejects.toThrow();
      await expect(fsx.list("..")).rejects.toThrow();
    });
  });
}
