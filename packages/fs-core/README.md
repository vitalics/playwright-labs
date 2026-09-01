# @playwright-labs/fs-core

Filesystem abstraction for Playwright tests — a real filesystem rooted at a
directory (`RealFileSystem`, over `node:fs/promises`) or an in-memory virtual
filesystem (`VirtualFileSystem`), behind one `FileSystem` interface. Zero
dependencies.

Shared core for [`@playwright-labs/fixture-fs`](../fixture-fs), but usable
standalone.

## Install

```sh
npm install @playwright-labs/fs-core
```

Requires Node.js 18+.

## Usage

```ts
import { RealFileSystem, VirtualFileSystem } from "@playwright-labs/fs-core";

// Real filesystem, rooted at process.cwd() (or any directory you pass)
const real = new RealFileSystem();
await real.write("test-results/notes.txt", "hello");
await real.append("test-results/notes.txt", " world");
console.log(await real.readText("test-results/notes.txt")); // "hello world"

// In-memory filesystem — same interface, never touches disk
const virtual = new VirtualFileSystem();
await virtual.write("fixtures/data.json", JSON.stringify({ ok: true }));
console.log(await virtual.list()); // ["fixtures"]
```

Paths are POSIX-style with `/` and resolved against the instance `root`.
Resolving outside the root (via `..`) throws; `write` creates parent
directories recursively; `remove` is `rm -rf`-style (missing paths are a
no-op); reading a missing file throws an `Error` with `code: "ENOENT"`.

## API

### `FileSystem` methods

| Method | Description |
|---|---|
| `write(path, content, options?)` | Writes `string \| Buffer \| Uint8Array \| Readable \| ReadableStream` (streams buffered in memory); creates parent dirs; `options.encoding` applies to string content (default `utf8`) |
| `read(path)` | Resolves with a `Buffer`; throws `ENOENT` when missing |
| `readText(path, encoding?)` | Resolves with a string (default `utf8`); throws `ENOENT` when missing |
| `append(path, content)` | Appends `string \| Buffer \| Uint8Array`, creating the file (and parents) if needed |
| `exists(path)` | `true`/`false` for files and directories |
| `stat(path)` | `{ size, mtimeMs, isDirectory }`; throws `ENOENT` when missing |
| `mkdir(path)` | Creates a directory recursively; existing dirs are fine |
| `remove(path)` | Removes a file or directory recursively; missing paths are a no-op |
| `list(path?)` | Entry names (not full paths) of a directory; `path` defaults to `"."` |

### Implementations

- `new RealFileSystem(root?)` — backed by `node:fs/promises`; `root` defaults
  to `process.cwd()` and is resolved to an absolute path.
- `new VirtualFileSystem(root?)` — in-memory `Map` of files; directories are
  implicit from paths; `root` defaults to `"/"`. `mtimeMs` is `Date.now()`
  on write.

### `collectContent(content)`

Buffers any accepted write content (including Node `Readable` and web
`ReadableStream`) into a single `Buffer`:

```ts
import { collectContent } from "@playwright-labs/fs-core";

const buffer = await collectContent(Readable.from(["a", "b"])); // <Buffer 61 62>
```

## License

MIT
