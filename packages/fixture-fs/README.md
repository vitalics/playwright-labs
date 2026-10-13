# @playwright-labs/fixture-fs

Filesystem fixture for Playwright — every test gets its own filesystem
handle (`fs`) with `expect` matchers on top:

- **virtual** (default) — fresh in-memory FS per test
  ([`@playwright-labs/fs-core`](../fs-core) `VirtualFileSystem`); tests
  running in parallel are fully isolated
- **real** — the fixture works against the real disk rooted at `cwd`
  (`RealFileSystem`). **No automatic cleanup** — files stay after the test.

## Install

```sh
npm install --save-dev @playwright-labs/fixture-fs
```

## Quick start

```ts
import { test, expect } from "@playwright-labs/fixture-fs";

test("write and read back", async ({ fs }) => {
  await fs.write("hello.txt", "hello world");

  await expect(fs).toExist("hello.txt");
  await expect(fs).toHaveText("hello.txt", "hello world");
  await expect(fs).toHaveText("hello.txt", /hello \w+/);
});
```

The zero-config export ≡ `createFixture().test` in virtual mode.

### Screenshot interop

`fs.write` accepts a `Buffer`, so Playwright screenshots land straight in
the (virtual) filesystem:

```ts
import { test, expect } from "@playwright-labs/fixture-fs";

test("captures a screenshot", async ({ page, fs }) => {
  await page.setContent("<h1>hello</h1>");

  await fs.write("shot.png", await page.screenshot());

  await expect(fs).toExist("shot.png");
  expect((await fs.stat("shot.png")).size).toBeGreaterThan(0);
});
```

## `createFixture(options?)`

```ts
import { createFixture } from "@playwright-labs/fixture-fs";

const { test, expect } = createFixture({
  mode: "real",
  cwd: process.env.ARTIFACTS_DIR, // ?? process.cwd()
});

test("writes an artifact to disk", async ({ fs }) => {
  await fs.write("report.json", JSON.stringify({ ok: true }));
  // stays on disk after the test — real mode does not clean up
});
```

Passing `cwd` in virtual mode, or an unknown `mode`, is a `TypeError`.

### Options

| Option | Default | Description |
|---|---|---|
| `mode` | `"virtual"` | `"virtual"` (in-memory, per-test) or `"real"` (disk) |
| `cwd` | `process.cwd()` | Root directory — **real mode only** |

### `fs` handle

The `FileSystem` interface from `@playwright-labs/fs-core`:
`write`, `read`, `readText`, `append`, `exists`, `stat`, `mkdir`
(recursive), `remove` (recursive, missing = no-op), `list` (`"."` default).
All paths are relative to the FS root.

## Matchers

Received value is the `FileSystem` instance. Missing-file reads produce a
clean assertion failure, not an unhandled error.

| Matcher | Description |
|---|---|
| `toExist(path)` | File or directory exists at `path` (`.not` supported) |
| `toHaveText(path, expected)` | Text content equals string / matches RegExp |
| `toHaveContent(path, expected)` | Binary content equals `Buffer`/`Uint8Array` byte for byte |
| `toBeEmptyDir(path)` | Path exists, is a directory, and has zero entries |

```ts
await expect(fs).toExist("out");
await expect(fs).not.toExist("missing.txt");
await expect(fs).toHaveText("log.txt", /done in \d+ms/);
await expect(fs).toHaveContent("shot.png", referencePng);
await expect(fs).toBeEmptyDir("tmp");
```

### Merging with your fixtures

```ts
import { mergeTests } from "@playwright/test";
import { createFixture } from "@playwright-labs/fixture-fs";

export const test = mergeTests(createFixture().test, myTest);
```

## License

MIT
