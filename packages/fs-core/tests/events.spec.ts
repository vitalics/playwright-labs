import { expect, test } from "@playwright/test";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import nodePath from "node:path";
import { once } from "node:events";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  Directory,
  File,
  RealFileSystem,
  VirtualFileSystem,
  type FileSystem,
  type FileSystemEvent,
} from "../src/index.js";

/** Records every event a filesystem emits, in order. */
function record(fsx: FileSystem): Array<[FileSystemEvent, string]> {
  const seen: Array<[FileSystemEvent, string]> = [];
  const events: FileSystemEvent[] = [
    "file.read",
    "file.write",
    "file.append",
    "file.remove",
    "directory.create",
    "directory.remove",
  ];
  for (const event of events) {
    fsx.on(event, (entry: File | Directory) => {
      seen.push([event, entry.path.toString()]);
    });
  }
  return seen;
}

const backends: Array<[name: string, create: (root: string) => FileSystem]> = [
  ["RealFileSystem", (root) => new RealFileSystem(root)],
  ["VirtualFileSystem", (root) => new VirtualFileSystem(root)],
];

for (const [name, create] of backends) {
  test.describe(`events: ${name}`, () => {
    let root: string;
    let fsx: FileSystem;

    test.beforeEach(async () => {
      root = await fsp.mkdtemp(nodePath.join(os.tmpdir(), "fs-core-events-"));
      fsx = create(name === "VirtualFileSystem" ? "/root" : root);
    });

    test.afterEach(async () => {
      await fsp.rm(root, { recursive: true, force: true });
    });

    test("write, read, append and remove of a file", async () => {
      const seen = record(fsx);
      await fsx.write("a.txt", "one");
      await fsx.append("a.txt", "-two");
      await fsx.read("a.txt");
      await fsx.readText("a.txt");
      await fsx.remove("a.txt");
      expect(seen).toEqual([
        ["file.write", "a.txt"],
        ["file.append", "a.txt"],
        ["file.read", "a.txt"],
        ["file.read", "a.txt"],
        ["file.remove", "a.txt"],
      ]);
    });

    test("the payload is a File carrying size, type and times", async () => {
      const [event] = await Promise.all([
        once(fsx, "file.write") as Promise<[File]>,
        fsx.write("report.csv", "a,b\n1,2"),
      ]);
      const [file] = event;
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe("report.csv");
      expect(file.size).toBe(7);
      expect(file.type).toBe("text/csv");
      expect(file.mtimeMs).toBeGreaterThan(0);
      // bound to the filesystem that emitted it
      expect(await file.toText()).toBe("a,b\n1,2");
    });

    test("directory.create fires once, only for new directories", async () => {
      const seen = record(fsx);
      await fsx.mkdir("shots/login");
      await fsx.mkdir("shots/login"); // already there — silent
      expect(seen).toEqual([["directory.create", "shots/login"]]);

      const [event] = await Promise.all([
        once(fsx, "directory.create") as Promise<[Directory]>,
        fsx.mkdir("downloads"),
      ]);
      expect(event[0]).toBeInstanceOf(Directory);
      expect(event[0].name).toBe("downloads");
    });

    test("directory.remove fires for a directory, file.remove for a file", async () => {
      await fsx.write("d/a.txt", "1");
      const seen = record(fsx);
      await fsx.remove("d");
      await fsx.remove("missing"); // no-op, no event
      expect(seen).toEqual([["directory.remove", "d"]]);
    });

    test("listeners are optional — no listeners, no work", async () => {
      await fsx.write("a.txt", "1");
      expect(fsx.listenerCount("file.write")).toBe(0);
      const off = () => undefined;
      fsx.on("file.write", off);
      expect(fsx.listenerCount("file.write")).toBe(1);
      fsx.off("file.write", off);
      expect(fsx.listenerCount("file.write")).toBe(0);
    });
  });

  test.describe(`streams: ${name}`, () => {
    let root: string;
    let fsx: FileSystem;

    test.beforeEach(async () => {
      root = await fsp.mkdtemp(nodePath.join(os.tmpdir(), "fs-core-streams-"));
      fsx = create(name === "VirtualFileSystem" ? "/root" : root);
    });

    test.afterEach(async () => {
      await fsp.rm(root, { recursive: true, force: true });
    });

    test("createReadStream reads the whole file", async () => {
      await fsx.write("a.txt", "hello world");
      const chunks: Buffer[] = [];
      for await (const chunk of fsx.createReadStream("a.txt")) {
        chunks.push(chunk as Buffer);
      }
      expect(Buffer.concat(chunks).toString()).toBe("hello world");
    });

    test("createReadStream honours encoding, start and end", async () => {
      await fsx.write("a.txt", "hello world");
      const stream = fsx.createReadStream("a.txt", {
        encoding: "utf8",
        start: 6,
        end: 10,
      });
      let text = "";
      for await (const chunk of stream) text += chunk;
      expect(text).toBe("world");
    });

    test("createReadStream of a missing file emits ENOENT", async () => {
      const stream = fsx.createReadStream("missing.txt");
      const error = await new Promise<NodeJS.ErrnoException>((resolve) => {
        stream.once("error", resolve);
      });
      expect(error.code).toBe("ENOENT");
    });

    test("createReadStream emits file.read when drained", async () => {
      await fsx.write("a.txt", "1");
      const [event] = await Promise.all([
        once(fsx, "file.read") as Promise<[File]>,
        (async () => {
          for await (const _chunk of fsx.createReadStream("a.txt")) {
            // drain
          }
        })(),
      ]);
      expect(event[0].path.toString()).toBe("a.txt");
    });

    test("createWriteStream writes, creating parent directories", async () => {
      await pipeline(
        Readable.from(["one", "-two"]),
        fsx.createWriteStream("deep/nested/a.txt"),
      );
      expect(await fsx.readText("deep/nested/a.txt")).toBe("one-two");
    });

    test("createWriteStream appends with flags 'a' and emits file.append", async () => {
      await fsx.write("a.txt", "one");
      const seen = record(fsx);
      await pipeline(
        Readable.from(["-two"]),
        fsx.createWriteStream("a.txt", { flags: "a" }),
      );
      expect(await fsx.readText("a.txt")).toBe("one-two");
      expect(seen.map(([event]) => event)).toContain("file.append");
    });

    test("createWriteStream emits file.write on finish", async () => {
      const [event] = await Promise.all([
        once(fsx, "file.write") as Promise<[File]>,
        pipeline(Readable.from(["1234"]), fsx.createWriteStream("a.txt")),
      ]);
      expect(event[0].path.toString()).toBe("a.txt");
      expect(event[0].size).toBe(4);
    });

    test("streams respect the root", () => {
      expect(() => fsx.createReadStream("../evil.txt")).toThrow();
      expect(() => fsx.createWriteStream("../evil.txt")).toThrow();
    });
  });
}
