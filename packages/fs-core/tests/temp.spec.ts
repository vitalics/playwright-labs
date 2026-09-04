import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import nodePath from "node:path";
import { Directory, TempDirectory, WALKER } from "../src/index.js";

test.describe("TempDirectory", () => {
  test("create makes a directory under os.tmpdir()", async () => {
    const temp = await TempDirectory.create({ prefix: "downloads-" });
    try {
      expect(temp).toBeInstanceOf(Directory);
      expect(temp.path.isAbsolute).toBe(true);
      expect(temp.name.startsWith("downloads-")).toBe(true);
      expect(temp.path.parent.toNative()).toBe(
        nodePath.resolve(os.tmpdir()),
      );
      expect(existsSync(temp.path.toNative())).toBe(true);
      expect(temp.disposed).toBe(false);
    } finally {
      await temp.remove();
    }
  });

  test("create honours a custom root, creating it when missing", async () => {
    const root = nodePath.join(
      await fs.mkdtemp(nodePath.join(os.tmpdir(), "fs-core-root-")),
      "nested",
    );
    const temp = await TempDirectory.create({ root });
    try {
      expect(temp.path.parent.toNative()).toBe(root);
    } finally {
      await temp.remove();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  test("fs is rooted inside the directory and drives the listing", async () => {
    const temp = await TempDirectory.create();
    try {
      await temp.fs.write("report.csv", "a,b\n1,2");
      await temp.fs.write("shots/login.png", Buffer.from([1, 2, 3]));
      expect(
        existsSync(nodePath.join(temp.path.toNative(), "report.csv")),
      ).toBe(true);

      // the snapshot starts empty — refresh (or the async iterator) fills it
      expect([...temp]).toEqual([]);
      await temp.refresh();
      expect([...temp].map((entry) => entry.name).sort()).toEqual([
        "report.csv",
        "shots",
      ]);
      expect(temp.size).toBe(10);
      expect(await temp.file("report.csv")?.toText()).toBe("a,b\n1,2");
      expect(
        [...temp.walk(WALKER.SHOW_ALL_FILES)]
          .map((entry) => entry.path.toString())
          .sort()
          .map((path) => path.slice(temp.path.toString().length + 1)),
      ).toEqual(["report.csv", "shots/login.png"]);
    } finally {
      await temp.remove();
    }
  });

  test("Symbol.asyncIterator lists the directory from disk", async () => {
    const temp = await TempDirectory.create();
    try {
      await temp.fs.write("a.txt", "1");
      const names: string[] = [];
      for await (const entry of temp) names.push(entry.name);
      expect(names).toEqual(["a.txt"]);
    } finally {
      await temp.remove();
    }
  });

  test("remove is idempotent and marks the directory disposed", async () => {
    const temp = await TempDirectory.create();
    const location = temp.path.toNative();
    await temp.remove();
    expect(temp.disposed).toBe(true);
    expect(existsSync(location)).toBe(false);
    await temp.remove();
  });

  test("keep leaves the directory on disk", async () => {
    const temp = await TempDirectory.create({ keep: true });
    const location = temp.path.toNative();
    expect(temp.kept).toBe(true);
    await temp.remove();
    expect(temp.disposed).toBe(true);
    expect(existsSync(location)).toBe(true);
    await fs.rm(location, { recursive: true, force: true });
  });

  test("Symbol.dispose removes it at the end of a `using` scope", async () => {
    let location = "";
    {
      using temp = TempDirectory.createSync({ prefix: "sync-" });
      location = temp.path.toNative();
      expect(existsSync(location)).toBe(true);
    }
    expect(existsSync(location)).toBe(false);
  });

  test("Symbol.asyncDispose removes it at the end of an `await using` scope", async () => {
    let location = "";
    {
      await using temp = await TempDirectory.create({ prefix: "async-" });
      location = temp.path.toNative();
      await temp.fs.write("a.txt", "1");
      expect(existsSync(location)).toBe(true);
    }
    expect(existsSync(location)).toBe(false);
  });

  test("adopts an existing directory", async () => {
    const location = await fs.mkdtemp(nodePath.join(os.tmpdir(), "adopted-"));
    {
      await using temp = new TempDirectory(location);
      expect(temp.path.toNative()).toBe(location);
      await temp.fs.write("a.txt", "1");
      expect(await temp.fs.readText("a.txt")).toBe("1");
    }
    expect(existsSync(location)).toBe(false);
  });
});
