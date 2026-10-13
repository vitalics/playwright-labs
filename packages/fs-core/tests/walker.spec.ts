import { expect, test } from "@playwright/test";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import nodePath from "node:path";
import {
  Directory,
  FILTER,
  File,
  FSWalker,
  RealFileSystem,
  VirtualFileSystem,
  WALKER,
  type FileSystem,
  type FsEntry,
} from "../src/index.js";

/**
 * e
 * ├─ one.txt (4)
 * ├─ sub
 * │  ├─ three.txt (3)
 * │  └─ deep
 * │     └─ four.txt (2)
 * └─ empty
 */
function tree(): Directory {
  return new Directory("e", [
    new File("one.txt", "1234"),
    new Directory("sub", [
      new File("three.txt", "abc"),
      new Directory("deep", [new File("four.txt", "xy")]),
    ]),
    new Directory("empty"),
  ]);
}

function drain(walker: FSWalker): string[] {
  const names: string[] = [];
  for (let entry = walker.nextNode(); entry; entry = walker.nextNode()) {
    names.push(entry.name);
  }
  return names;
}

test.describe("FSWalker", () => {
  test("nextNode walks in document order", () => {
    const walker = new FSWalker(tree());
    expect(walker.currentNode).toBe(walker.root);
    expect(drain(walker)).toEqual([
      "one.txt",
      "sub",
      "three.txt",
      "deep",
      "four.txt",
      "empty",
    ]);
    // exhausted: the cursor stays on the last visited entry
    expect(walker.nextNode()).toBeNull();
    expect(walker.currentNode.name).toBe("empty");
  });

  test("Symbol.iterator drains the walk", () => {
    const walker = new FSWalker(tree());
    expect([...walker].map((entry) => entry.path.toString())).toEqual([
      "e/one.txt",
      "e/sub",
      "e/sub/three.txt",
      "e/sub/deep",
      "e/sub/deep/four.txt",
      "e/empty",
    ]);
    expect([...walker]).toEqual([]); // already drained
  });

  test("previousNode mirrors nextNode and can land on the root", () => {
    const walker = new FSWalker(tree());
    drain(walker); // cursor on "empty"

    const names: string[] = [];
    for (let entry = walker.previousNode(); entry; entry = walker.prevNode()) {
      names.push(entry.name);
    }
    expect(names).toEqual([
      "four.txt",
      "deep",
      "three.txt",
      "sub",
      "one.txt",
      "e",
    ]);
    expect(walker.currentNode).toBe(walker.root);
  });

  test("firstChild, lastChild, siblings and parentNode", () => {
    const walker = new FSWalker(tree());
    expect(walker.firstChild()?.name).toBe("one.txt");
    expect(walker.nextSibling()?.name).toBe("sub");
    expect(walker.firstChild()?.name).toBe("three.txt");
    expect(walker.nextSibling()?.name).toBe("deep");
    expect(walker.nextSibling()).toBeNull();
    expect(walker.currentNode.name).toBe("deep"); // unchanged on null
    expect(walker.previousSibling()?.name).toBe("three.txt");
    expect(walker.parentNode()?.name).toBe("sub");
    expect(walker.lastChild()?.name).toBe("deep");
    expect(walker.parentNode()?.name).toBe("sub");
    // the root can be reached, but never passed
    expect(walker.parentNode()).toBe(walker.root);
    expect(walker.parentNode()).toBeNull();
    expect(walker.firstChild()?.name).toBe("one.txt");
    expect(walker.previousSibling()).toBeNull();
    expect(walker.lastChild()).toBeNull(); // a file has no children
  });

  test("a boolean filter skips entries but still descends into them", () => {
    const walker = new FSWalker(tree(), WALKER.SHOW_ALL_FILES);
    expect(drain(walker)).toEqual(["one.txt", "three.txt", "four.txt"]);

    const fresh = new FSWalker(tree(), WALKER.SHOW_ALL_FILES);
    expect(fresh.firstChild()?.name).toBe("one.txt");
    fresh.reset();
    expect(fresh.lastChild()?.name).toBe("four.txt");

    const dirs = new FSWalker(tree(), WALKER.SHOW_ALL_DIRECTORIES);
    expect(drain(dirs)).toEqual(["sub", "deep", "empty"]);
  });

  test("FILTER.REJECT prunes the subtree", () => {
    const walker = new FSWalker(tree(), (entry) =>
      entry.name === "sub" ? FILTER.REJECT : FILTER.ACCEPT,
    );
    expect(drain(walker)).toEqual(["one.txt", "empty"]);
  });

  test("WALKER.prune turns a predicate into a shallow walk", () => {
    const walker = new FSWalker(tree(), WALKER.prune(WALKER.SHOW_ALL_FILES));
    expect(drain(walker)).toEqual(["one.txt"]);
  });

  test("WALKER combinators", () => {
    const root = tree();
    const bigFiles = WALKER.every(
      WALKER.SHOW_ALL_FILES,
      (entry: FsEntry) => entry.size >= 3,
    );
    expect([...root.walk(bigFiles)].map((entry) => entry.name)).toEqual([
      "one.txt",
      "three.txt",
    ]);
    expect(
      [...root.walk(WALKER.not(WALKER.SHOW_ALL_FILES))].map(
        (entry) => entry.name,
      ),
    ).toEqual(["sub", "deep", "empty"]);
    expect(
      [
        ...root.walk(
          WALKER.some(
            (entry: FsEntry) => entry.name === "empty",
            (entry: FsEntry) => entry.name === "four.txt",
          ),
        ),
      ].map((entry) => entry.name),
    ).toEqual(["four.txt", "empty"]);
  });

  test("currentNode can be moved inside the root and rejects outsiders", () => {
    const root = tree();
    const walker = new FSWalker(root);
    const deep = root.directory("sub")?.directory("deep");
    walker.currentNode = deep!;
    expect(walker.nextNode()?.name).toBe("four.txt");
    expect(walker.nextNode()?.name).toBe("empty");

    expect(() => {
      walker.currentNode = new File("outsider.txt", "x");
    }).toThrow(RangeError);
    expect(walker.currentNode.name).toBe("empty");
  });

  test("Directory.walk honours REJECT the same way", () => {
    const root = tree();
    expect(
      [...root.walk(WALKER.prune(WALKER.SHOW_ALL_FILES))].map(
        (entry) => entry.name,
      ),
    ).toEqual(["one.txt"]);
  });
});

const backends: Array<[name: string, create: (root: string) => FileSystem]> = [
  ["RealFileSystem", (root) => new RealFileSystem(root)],
  ["VirtualFileSystem", (root) => new VirtualFileSystem(root)],
];

for (const [name, create] of backends) {
  test.describe(`FSWalker.from: ${name}`, () => {
    let root: string;
    let fsx: FileSystem;

    test.beforeEach(async () => {
      root = await fsp.mkdtemp(nodePath.join(os.tmpdir(), "fs-core-walker-"));
      fsx = create(name === "VirtualFileSystem" ? "/root" : root);
      await fsx.write("e/one.txt", "1234");
      await fsx.write("e/sub/three.txt", "abc");
      await fsx.write("e/sub/deep/four.txt", "xy");
      await fsx.mkdir("e/empty");
    });

    test.afterEach(async () => {
      await fsp.rm(root, { recursive: true, force: true });
    });

    test("walks a directory read from the filesystem", async () => {
      const walker = await FSWalker.from(fsx, "e");
      expect(walker.root.name).toBe("e");
      expect(walker.root.size).toBe(9);
      // the real backend lists in readdir order, so compare as a set
      expect(
        [...walker].map((entry) => entry.path.toString()).sort(),
      ).toEqual([
        "e/empty",
        "e/one.txt",
        "e/sub",
        "e/sub/deep",
        "e/sub/deep/four.txt",
        "e/sub/three.txt",
      ]);
    });

    test("entries stay bound, so content is readable during the walk", async () => {
      const walker = await FSWalker.from(fsx, "e", WALKER.SHOW_ALL_FILES);
      const contents: string[] = [];
      for (const entry of walker) contents.push(await (entry as File).toText());
      expect(contents.sort()).toEqual(["1234", "abc", "xy"]);
    });

    test("refresh re-reads the tree and keeps the cursor by path", async () => {
      const walker = await FSWalker.from(fsx, "e");
      walker.currentNode = walker.root.file("one.txt")!;

      await fsx.write("e/sub/five.txt", "12345");
      await walker.refresh();

      expect(walker.currentNode.path.toString()).toBe("e/one.txt");
      expect(walker.root.size).toBe(14);
      expect(
        [...walker].map((entry) => entry.path.toString()),
      ).toContain("e/sub/five.txt");
    });

    test("refresh falls back to the root when the entry is gone", async () => {
      const walker = await FSWalker.from(fsx, "e");
      walker.currentNode = walker.root.directory("sub")!.file("three.txt")!;
      await fsx.remove("e/sub/three.txt");
      await walker.refresh();
      expect(walker.currentNode).toBe(walker.root);
    });
  });
}
