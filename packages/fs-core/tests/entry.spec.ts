import { expect, test } from "@playwright/test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import nodePath from "node:path";
import { Readable } from "node:stream";
import {
  Directory,
  File,
  Path,
  RealFileSystem,
  VirtualFileSystem,
  WALKER,
  mimeType,
  type FileSystem,
} from "../src/index.js";

test.describe("File", () => {
  test("holds string content", async () => {
    const file = new File("report.csv", "a,b\n1,2");
    expect(file.name).toBe("report.csv");
    expect(file.size).toBe(7);
    expect(file.loaded).toBe(true);
    expect(await file.toText()).toBe("a,b\n1,2");
    expect(await file.toBuffer()).toEqual(Buffer.from("a,b\n1,2"));
  });

  test("holds Buffer and Uint8Array content", async () => {
    const buffer = new File("b.bin", Buffer.from([0, 1, 255]));
    expect(buffer.size).toBe(3);
    expect(await buffer.toBuffer()).toEqual(Buffer.from([0, 1, 255]));

    const bytes = new File("c.bin", new Uint8Array([5, 6]));
    expect(await bytes.toBuffer()).toEqual(Buffer.from([5, 6]));
  });

  test("honours the string encoding", async () => {
    const file = new File("hex.bin", { content: "fffe", encoding: "hex" });
    expect(file.size).toBe(2);
    expect(await file.toText("hex")).toBe("fffe");
  });

  test("resolves the IANA media type from the extension", () => {
    expect(new File("shot.png").type).toBe("image/png");
    expect(new File("data.json").type).toBe("application/json");
    expect(new File("report.CSV").type).toBe("text/csv");
    expect(new File("archive.tar.gz").type).toBe("application/gzip");
    expect(new File("mystery.zzz").type).toBe("application/octet-stream");
    expect(new File(".gitignore").type).toBe("application/octet-stream");
    // explicit type wins
    expect(new File("data.bin", { type: "application/x-custom" }).type).toBe(
      "application/x-custom",
    );
    expect(new File("shot.png").mime).toBe("image/png");
    expect(mimeType("a/b/notes.md")).toBe("text/markdown");
    expect(mimeType("noext")).toBeUndefined();
  });

  test("toBlob carries the media type", async () => {
    const blob = await new File("page.html", "<h1>hi</h1>").toBlob();
    expect(blob.type).toBe("text/html");
    expect(blob.size).toBe(11);
    expect(await blob.text()).toBe("<h1>hi</h1>");
  });

  test("File.from buffers streams", async () => {
    const file = await File.from("d.txt", Readable.from(["foo", "bar"]));
    expect(await file.toText()).toBe("foobar");

    const web = await File.from(
      "e.txt",
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("web"));
          controller.close();
        },
      }),
    );
    expect(await web.toText()).toBe("web");
  });

  test("a size-only file has no content", async () => {
    const file = new File("big.bin", 4096);
    expect(file.size).toBe(4096);
    expect(file.loaded).toBe(false);
    const error = await file.toBuffer().catch((e: unknown) => e);
    expect((error as NodeJS.ErrnoException).code).toBe("ENOENT");
  });

  test("path comes from the name, an explicit path, or the parent", () => {
    expect(new File("a.txt").path.toString()).toBe("a.txt");
    expect(new File("dir/a.txt").name).toBe("a.txt");
    expect(new File("dir/a.txt").path.toString()).toBe("dir/a.txt");
    expect(new File("a.txt", { path: "deep/a.txt" }).path.toString()).toBe(
      "deep/a.txt",
    );

    const child = new File("a.txt", "x");
    const dir = new Directory("root", [child]);
    expect(child.parent).toBe(dir);
    expect(child.path.toString()).toBe("root/a.txt");
    expect(`${child}`).toBe("root/a.txt");
  });

  test("times default to now and serialize", () => {
    const before = Date.now();
    const file = new File("a.txt", "x", { mtimeMs: 1000, ctimeMs: 500 });
    expect(file.mtime).toEqual(new Date(1000));
    expect(file.ctime).toEqual(new Date(500));
    expect(new File("b.txt", "x").mtimeMs).toBeGreaterThanOrEqual(before);
    expect(file.toJSON()).toEqual({
      name: "a.txt",
      path: "a.txt",
      size: 1,
      type: "text/plain",
      isDirectory: false,
      mtimeMs: 1000,
      ctimeMs: 500,
    });
  });
});

test.describe("Directory", () => {
  const tree = () =>
    new Directory("e", [
      new File("one.txt", "1234"),
      new Directory("sub", [
        new File("three.txt", "abc"),
        new Directory("deep", [new File("four.txt", "xy")]),
      ]),
      new Directory("empty"),
    ]);

  test("size is the recursive total", () => {
    const dir = tree();
    expect(dir.size).toBe(9);
    expect(dir.directory("sub")?.size).toBe(5);
    expect(dir.directory("empty")?.size).toBe(0);
  });

  test("Symbol.iterator yields immediate children", () => {
    expect([...tree()].map((child) => child.name)).toEqual([
      "one.txt",
      "sub",
      "empty",
    ]);
  });

  test("Symbol.asyncIterator yields immediate children when unbound", async () => {
    const names: string[] = [];
    for await (const child of tree()) names.push(child.name);
    expect(names).toEqual(["one.txt", "sub", "empty"]);
  });

  test("files, directories, find, file, directory, has", () => {
    const dir = tree();
    expect(dir.files.map((file) => file.name)).toEqual(["one.txt"]);
    expect(dir.directories.map((child) => child.name)).toEqual([
      "sub",
      "empty",
    ]);
    expect(dir.find("sub")).toBe(dir.directory("sub"));
    expect(dir.find((entry) => entry.size === 4)?.name).toBe("one.txt");
    expect(dir.file("one.txt")?.size).toBe(4);
    expect(dir.file("sub")).toBeUndefined();
    expect(dir.has("empty")).toBe(true);
    expect(dir.has("nope")).toBe(false);
  });

  test("walk is depth-first and filterable", () => {
    const dir = tree();
    expect([...dir.walk()].map((entry) => entry.path.toString())).toEqual([
      "e/one.txt",
      "e/sub",
      "e/sub/three.txt",
      "e/sub/deep",
      "e/sub/deep/four.txt",
      "e/empty",
    ]);
    expect(
      [...dir.walk(WALKER.SHOW_ALL_FILES)].map((entry) => entry.name),
    ).toEqual(["one.txt", "three.txt", "four.txt"]);
    expect(
      [...dir.walk(WALKER.SHOW_ALL_DIRECTORIES)].map((entry) => entry.name),
    ).toEqual(["sub", "deep", "empty"]);
  });

  test("WALKER time filters", () => {
    const dir = new Directory("e", [
      new File("old.txt", "1", { mtimeMs: 1_000, ctimeMs: 1_000 }),
      new File("new.txt", "2", { mtimeMs: 5_000, ctimeMs: 5_000 }),
    ]);
    expect(
      [...dir.walk(WALKER.SHOW_ALL_FILES_MTIME_BETWEEN(2_000, 9_000))].map(
        (entry) => entry.name,
      ),
    ).toEqual(["new.txt"]);
    expect(
      [
        ...dir.walk(
          WALKER.SHOW_ALL_FILES_CTIME_BETWEEN(new Date(0), new Date(2_000)),
        ),
      ].map((entry) => entry.name),
    ).toEqual(["old.txt"]);
    expect([...dir.walk(WALKER.SHOW_ALL)]).toHaveLength(2);
  });

  test("refresh throws when the directory is not bound to a filesystem", async () => {
    await expect(tree().refresh()).rejects.toThrow(/not bound/);
  });

  test("toJSON is a plain tree", () => {
    expect(tree().toJSON()).toMatchObject({
      name: "e",
      path: "e",
      size: 9,
      isDirectory: true,
      children: [
        { name: "one.txt", path: "e/one.txt", size: 4 },
        { name: "sub", path: "e/sub", size: 5 },
        { name: "empty", path: "e/empty", size: 0 },
      ],
    });
  });
});

const backends: Array<[name: string, create: (root: string) => FileSystem]> = [
  ["RealFileSystem", (root) => new RealFileSystem(root)],
  ["VirtualFileSystem", (root) => new VirtualFileSystem(root)],
];

for (const [name, create] of backends) {
  test.describe(`entries are bound to the filesystem: ${name}`, () => {
    let root: string;
    let fsx: FileSystem;

    test.beforeEach(async () => {
      root = await fs.mkdtemp(nodePath.join(os.tmpdir(), "fs-core-entry-"));
      fsx = create(name === "VirtualFileSystem" ? "/root" : root);
    });

    test.afterEach(async () => {
      await fs.rm(root, { recursive: true, force: true });
    });

    test("a listed file reads its content through the filesystem", async () => {
      await fsx.write("e/one.txt", "1234");
      const [file] = await fsx.entries("e");

      expect(file).toBeInstanceOf(File);
      expect(file!.path.toString()).toBe("e/one.txt");
      expect(file!.size).toBe(4);
      expect((file as File).loaded).toBe(false);
      expect(await (file as File).toText()).toBe("1234");
      expect((await (file as File).toBlob()).type).toBe("text/plain");
    });

    test("listed entries carry times", async () => {
      const before = Date.now() - 2_000;
      await fsx.write("e/one.txt", "1234");
      const [file] = await fsx.entries("e");
      expect(file!.mtimeMs).toBeGreaterThanOrEqual(before);
      expect(file!.ctimeMs).toBeGreaterThanOrEqual(before);
      expect(
        [...(await fsx.entries("."))].map((entry) => entry.name),
      ).toContain("e");
    });

    test("Symbol.asyncIterator re-reads the directory, Symbol.iterator does not", async () => {
      await fsx.write("d/a.txt", "1");
      const [dir] = await fsx.entries(".");
      expect(dir).toBeInstanceOf(Directory);

      await fsx.write("d/b.txt", "22");

      expect([...(dir as Directory)].map((entry) => entry.name)).toEqual([
        "a.txt",
      ]);

      const fresh: string[] = [];
      for await (const entry of dir as Directory) fresh.push(entry.name);
      expect(fresh.sort()).toEqual(["a.txt", "b.txt"]);
      // the snapshot is updated by the async pass
      expect([...(dir as Directory)].map((entry) => entry.name).sort()).toEqual(
        ["a.txt", "b.txt"],
      );
      expect((dir as Directory).size).toBe(3);
    });

    test("refresh re-reads a bound directory", async () => {
      await fsx.write("d/a.txt", "1");
      const [dir] = await fsx.entries(".");
      await fsx.write("d/sub/b.txt", "22");

      await (dir as Directory).refresh();
      expect(
        [...(dir as Directory).walk(WALKER.SHOW_ALL_FILES)]
          .map((entry) => entry.path.toString())
          .sort(),
      ).toEqual(["d/a.txt", "d/sub/b.txt"]);
      expect((dir as Directory).size).toBe(3);
    });

    test("walkAsync descends through the filesystem", async () => {
      await fsx.write("d/a.txt", "1");
      await fsx.write("d/sub/deep/b.txt", "22");
      const [dir] = await fsx.entries(".");

      const paths: string[] = [];
      for await (const entry of (dir as Directory).walkAsync(
        WALKER.SHOW_ALL_FILES,
      )) {
        paths.push(entry.path.toString());
      }
      expect(paths.sort()).toEqual(["d/a.txt", "d/sub/deep/b.txt"]);
    });

    test("filesystem methods accept a Path", async () => {
      const path = new Path("p/one.txt");
      await fsx.write(path, "1");
      expect(await fsx.exists(path)).toBe(true);
      expect(await fsx.readText(path)).toBe("1");
      expect((await fsx.stat(path)).size).toBe(1);
      expect(await fsx.list(new Path("p"))).toEqual(["one.txt"]);
      await fsx.remove(path);
      expect(await fsx.exists(path)).toBe(false);
    });
  });
}
