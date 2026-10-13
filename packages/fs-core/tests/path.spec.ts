import { expect, test } from "@playwright/test";
import nodePath from "node:path";
import { Path } from "../src/index.js";

test.describe("Path", () => {
  test("joins and normalizes parts on construction", () => {
    expect(new Path("fixtures", "img/../shot.png").toString()).toBe(
      "fixtures/shot.png",
    );
    expect(new Path("a//b/./c").toString()).toBe("a/b/c");
    expect(new Path("").toString()).toBe(".");
    expect(new Path(".").toString()).toBe(".");
    expect(new Path("a/b", new Path("c")).toString()).toBe("a/b/c");
  });

  test("reads Windows separators and drive roots", () => {
    const path = new Path("C:\\Users\\test\\shot.png");
    expect(path.isAbsolute).toBe(true);
    expect(path.root?.toString()).toBe("C:/");
    expect(path.toString()).toBe("C:/Users/test/shot.png");
  });

  test("collapses '..' and keeps relative escapes", () => {
    expect(new Path("/root/a/../../evil").toString()).toBe("/evil");
    expect(new Path("a/../../evil").toString()).toBe("../evil");
    // '..' above an absolute root is the root itself
    expect(new Path("/..").toString()).toBe("/");
  });

  test("name, stem, ext, parent, depth", () => {
    const path = new Path("/tmp/reports/summary.tar.gz");
    expect(path.name).toBe("summary.tar.gz");
    expect(path.stem).toBe("summary.tar");
    expect(path.ext).toBe(".gz");
    expect(path.parent.toString()).toBe("/tmp/reports");
    expect(path.depth).toBe(3);
    expect(new Path("/").isRoot).toBe(true);
    expect(new Path("/").parent.toString()).toBe("/");
    expect(new Path(".").parent.toString()).toBe(".");
    expect(new Path(".gitignore").ext).toBe("");
  });

  test("join keeps absolute parts, resolve restarts at them", () => {
    expect(new Path("a").join("/b").toString()).toBe("a/b");
    expect(new Path("a").resolve("/b").toString()).toBe("/b");
    expect(new Path("/a").resolve("b", "c").toString()).toBe("/a/b/c");
  });

  test("relative", () => {
    expect(new Path("/a/b").relative("/a/b/c/d").toString()).toBe("c/d");
    expect(new Path("/a/b/c").relative("/a/x").toString()).toBe("../../x");
    expect(new Path("/a").relative("relative/one").toString()).toBe(
      "relative/one",
    );
  });

  test("withName, withStem, withExt", () => {
    const path = new Path("shots/login.png");
    expect(path.withName("logout.png").toString()).toBe("shots/logout.png");
    expect(path.withStem("logout").toString()).toBe("shots/logout.png");
    expect(path.withExt("jpeg").toString()).toBe("shots/login.jpeg");
    expect(path.withExt(".webp").toString()).toBe("shots/login.webp");
    expect(path.withExt("").toString()).toBe("shots/login");
  });

  test("equals, startsWith, isInside", () => {
    const path = new Path("/a/b/c.txt");
    expect(path.equals("/a/./b/c.txt")).toBe(true);
    expect(path.equals("/a/b")).toBe(false);
    expect(path.startsWith("/a/b")).toBe(true);
    expect(path.startsWith("a/b")).toBe(false);
    expect(path.isInside("/a/b")).toBe(true);
    expect(path.isInside(path)).toBe(false);
  });

  test("stringifies and iterates", () => {
    const path = new Path("a/b/c");
    expect(`${path}`).toBe("a/b/c");
    expect(String(path)).toBe("a/b/c");
    expect(JSON.stringify({ path })).toBe('{"path":"a/b/c"}');
    expect([...path]).toEqual(["a", "b", "c"]);
    expect([...path.segments]).toEqual(["a", "b", "c"]);
  });

  test("toNative uses the platform separator", () => {
    expect(new Path("a/b").toNative()).toBe(nodePath.join("a", "b"));
  });

  test("Path.from and Path.cwd", () => {
    expect(Path.from("a", "b").toString()).toBe("a/b");
    expect(Path.cwd().toString()).toBe(new Path(process.cwd()).toString());
    expect(Path.cwd().isAbsolute).toBe(true);
  });

  test("instances are immutable", () => {
    const path = new Path("a/b");
    const joined = path.join("c");
    expect(path.toString()).toBe("a/b");
    expect(joined.toString()).toBe("a/b/c");
    expect(() => {
      (path.segments as string[]).push("x");
    }).toThrow();
  });
});
