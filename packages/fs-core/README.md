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
Every path argument also accepts a `Path`. Resolving outside the root (via
`..`) throws; `write` creates parent directories recursively; `remove` is
`rm -rf`-style (missing paths are a no-op); reading a missing file throws an
`Error` with `code: "ENOENT"`.

```ts
import { Path, TempDirectory, WALKER } from "@playwright-labs/fs-core";

// a temp directory that deletes itself at the end of the scope
await using temp = await TempDirectory.create({ prefix: "downloads-" });
await temp.fs.write(new Path("reports", "summary.csv"), "a,b\n1,2");

for await (const entry of temp) {
  console.log(entry.name, entry.size); // fresh listing, read from disk
}

const report = (await temp.refresh()).directory("reports")?.file("summary.csv");
report?.type; // "text/csv"
await report?.toBlob(); // Blob { type: "text/csv" }

for (const file of temp.walk(WALKER.SHOW_ALL_FILES)) console.log(`${file.path}`);
```

## API

### `FileSystem` methods

Every `path` accepts a `string` or a [`Path`](#path).

| Method | Description |
|---|---|
| `write(path, content, options?)` | Writes `string \| Buffer \| Uint8Array \| Readable \| ReadableStream` (streams buffered in memory); creates parent dirs; `options.encoding` applies to string content (default `utf8`) |
| `read(path)` | Resolves with a `Buffer`; throws `ENOENT` when missing |
| `readText(path, encoding?)` | Resolves with a string (default `utf8`); throws `ENOENT` when missing |
| `append(path, content)` | Appends `string \| Buffer \| Uint8Array`, creating the file (and parents) if needed |
| `exists(path)` | `true`/`false` for files and directories |
| `stat(path)` | `{ size, mtimeMs, ctimeMs, isDirectory }`; throws `ENOENT` when missing |
| `mkdir(path)` | Creates a directory recursively; existing dirs are fine |
| `remove(path)` | Removes a file or directory recursively; missing paths are a no-op |
| `list(path?)` | Entry names (not full paths) of a directory; `path` defaults to `"."` |
| `entries(path?)` | `(File \| Directory)[]` — entries carrying `name`, `size`, times and their path, bound to the filesystem they came from, so `file.toBuffer()` and `directory.refresh()` read through it |

### `Path`

Immutable POSIX-style path value object. Parts are joined and normalized on
construction (`.` dropped, `..` collapsed, `\` read as `/`, a drive letter
becomes the root); every method returns a new `Path`.

```ts
const path = new Path("fixtures", "img/../shot.png"); // "fixtures/shot.png"
path.name;            // "shot.png"
path.stem;            // "shot"
path.ext;             // ".png"
path.parent;          // Path "fixtures"
path.withExt(".webp") // Path "fixtures/shot.webp"
[...path];            // ["fixtures", "shot.png"]
`${path}`;            // "fixtures/shot.png"
```

| Member | Description |
|---|---|
| `segments`, `depth` | Normalized segments and their count |
| `isAbsolute`, `isRoot`, `root` | Root information (`/`, `C:/`) |
| `name`, `stem`, `ext`, `parent` | Basename, basename without extension, extension with the dot, containing directory |
| `join(...)`, `resolve(...)`, `relative(to)` | `path.join` / `path.resolve` / `path.relative` semantics |
| `withName`, `withStem`, `withExt` | Copies with the last segment, stem or extension replaced |
| `equals`, `startsWith`, `isInside` | Comparisons, segment-wise |
| `toString()`, `toJSON()`, `toNative()`, `Symbol.iterator`, `Symbol.toPrimitive` | POSIX string, platform string (`\` on Windows), iteration over segments |
| `Path.from(...)`, `Path.cwd()` | Static constructors |

### `File`

Either a listing snapshot (name, size, times — content read on demand through
the filesystem it came from) or a standalone value holding its own content.

```ts
const file = new File("report.csv", "a,b\n1,2");
file.size;              // 7
file.type;              // "text/csv" — IANA type from the extension
await file.toBuffer();  // <Buffer 61 2c 62 ...>
await file.toText();    // "a,b\n1,2"
await file.toBlob();    // Blob { type: "text/csv" }

new File("b.bin", Buffer.from([0, 1, 255]));          // Buffer content
new File("big.bin", 4096);                            // size only, no content
new File("data.bin", { type: "application/x-custom" }) // explicit media type
await File.from("d.txt", Readable.from(["foo"]));     // buffers a stream
```

| Member | Description |
|---|---|
| `name`, `path`, `stem`, `ext` | Entry name and its `Path` inside the filesystem |
| `type` / `mime` | IANA media type from the extension, `application/octet-stream` when unknown, or the explicit `type` |
| `size`, `loaded` | Bytes; whether the content is in memory |
| `mtime`, `ctime`, `mtimeMs`, `ctimeMs` | Times as `Date` and epoch ms |
| `toBuffer()`, `toText(encoding?)`, `toBlob()` | Content, read through the bound filesystem when not in memory; throws `ENOENT` when there is neither |
| `parent`, `isDirectory`, `isFile`, `toJSON()`, `toString()` | Owning `Directory`, discriminants, plain object, path |

`mimeType(name)` and `MIME_BY_EXTENSION` are exported for lookups outside a
`File`. The table is curated (zero dependencies), so pass `{ type }` for
anything it misses.

### `Directory`

A snapshot of children plus, when it came from a `FileSystem`, a live handle
onto it. `size` is the recursive total of every file inside.

```ts
for (const entry of dir) console.log(entry.name);       // snapshot children
for await (const entry of dir) console.log(entry.name); // re-read from the FS
for (const file of dir.walk(WALKER.SHOW_ALL_FILES)) console.log(`${file.path}`);
```

| Member | Description |
|---|---|
| `Symbol.iterator` | Immediate children, from the snapshot |
| `Symbol.asyncIterator` | Immediate children, re-read from the filesystem (and cached) when bound |
| `children`, `files`, `directories`, `size` | Immediate children, split by kind; recursive byte total |
| `find(name \| filter)`, `file(name)`, `directory(name)`, `has(name)` | Immediate-child lookups |
| `walk(filter?)`, `walkAsync(filter?)` | Depth-first descendants, from the snapshot or re-read per level |
| `refresh()` | Re-reads the children from the bound filesystem; throws when unbound |
| `mtime`, `ctime`, `parent`, `path`, `toJSON()`, `toString()` | As on `File` |

### `FSWalker`

The `TreeWalker` of this module — the same methods and the same traversal
algorithms as the DOM, over `File` and `Directory`. Every method moves
`currentNode` and returns the entry it landed on, or `null` (leaving the
cursor where it was).

```ts
const walker = await FSWalker.from(fs, "test-results", WALKER.SHOW_ALL_FILES);

walker.firstChild();      // first visible child of currentNode
walker.nextSibling();
walker.parentNode();      // nearest visible ancestor, never above the root
walker.nextNode();        // document-order next visible entry
walker.previousNode();    // and back — prevNode() is an alias
walker.currentNode;       // where the cursor sits; assignable inside the root

for (const entry of walker) console.log(`${entry.path}`); // drains the walk

await walker.refresh();   // re-read the tree, keeping the cursor by path
walker.reset();           // back to the root
```

| Member | Description |
|---|---|
| `new FSWalker(root, filter?)` | Walks a materialized `Directory` tree; synchronous |
| `FSWalker.from(fs, path?, filter?)` | Reads the tree from a filesystem first |
| `root`, `filter`, `currentNode`, `reset()`, `refresh()` | Cursor state; `currentNode` throws a `RangeError` when set outside the root |
| `parentNode()`, `firstChild()`, `lastChild()`, `nextSibling()`, `previousSibling()`, `nextNode()`, `previousNode()`/`prevNode()` | DOM `TreeWalker` navigation |
| `Symbol.iterator` | `nextNode()` in a loop — so it moves the cursor |

### Filters

`WALKER` holds ready-made filters — the `NodeFilter` of this module:
`SHOW_ALL`, `SHOW_ALL_FILES`, `SHOW_ALL_DIRECTORIES`,
`SHOW_ALL_FILES_MTIME_BETWEEN(from, to)`,
`SHOW_ALL_FILES_CTIME_BETWEEN(from, to)` (bounds are epoch ms or `Date`),
plus the combinators `not(f)`, `every(...f)`, `some(...f)` and `prune(f)`.

A filter returns a boolean or a `FILTER` code:

| Result | Meaning |
|---|---|
| `true` / `FILTER.ACCEPT` | the entry is visible |
| `false` / `FILTER.SKIP` | the entry is hidden, its children are still visited |
| `FILTER.REJECT` | the entry and its whole subtree are skipped |

`WALKER.prune(filter)` turns skipping into pruning, e.g.
`WALKER.prune(WALKER.SHOW_ALL_FILES)` lists only top-level files.

### Events

Both backends are `EventEmitter`s typed with `FileSystemEvents`. Only
operations that go through the instance are observed — the disk is not
watched.

```ts
fs.on("directory.create", (dir) => console.log("dir:", `${dir.path}`));
fs.on("file.write", (file) => console.log(file.name, file.size, file.type));
```

| Event | Payload | Fired by |
|---|---|---|
| `file.write` | `File` | `write`, a finished write stream |
| `file.append` | `File` | `append`, a finished `flags: "a"` stream |
| `file.read` | `File` | `read`, `readText`, a drained read stream |
| `file.remove` | `File` | `remove` of a file (state just before removal) |
| `directory.create` | `Directory` | `mkdir` of a directory that did not exist |
| `directory.remove` | `Directory` | `remove` of a directory |

Payload entries are bound to the filesystem, so `await file.toText()` works
inside a listener. Nothing is built when there are no listeners.

### Streams

```ts
// read
for await (const chunk of fs.createReadStream("big.log", { encoding: "utf8" })) {
  process.stdout.write(chunk);
}

// write (parent directories are created)
await pipeline(Readable.from(["a", "b"]), fs.createWriteStream("out/a.txt"));

// append
fs.createWriteStream("out/a.txt", { flags: "a" });
```

`createReadStream(path, { encoding?, start?, end?, highWaterMark? })` — `end`
is inclusive, like `node:fs`; a missing file fails through the stream's
`error` event with `code: "ENOENT"`. `createWriteStream(path, { encoding?,
flags? })` — `flags: "a"` appends. The virtual backend implements both in
memory.

### `TempDirectory`

A real temporary directory that removes itself on disposal — a `Directory`
whose `fs` is a `RealFileSystem` rooted inside it.

```ts
// TypeScript 5.2+ / Node 20.11+ for `using`; otherwise call remove() yourself
await using temp = await TempDirectory.create({ prefix: "downloads-" });
using syncTemp = TempDirectory.createSync();

const temp = await TempDirectory.create({ root: "test-results", keep: true });
await temp.remove(); // idempotent; a no-op with keep: true
```

| Member | Description |
|---|---|
| `TempDirectory.create(options?)` | `mkdtemp` under `options.root` (default `os.tmpdir()`), creating the root when missing |
| `TempDirectory.createSync(options?)` | Same, without awaiting — for a `using` scope |
| `new TempDirectory(location, { keep? })` | Adopts an existing directory; disposal removes it |
| `fs`, `path` | `RealFileSystem` rooted at the directory; its absolute `Path` |
| `remove()`, `removeSync()`, `disposed`, `kept` | Explicit `rm -rf`, idempotent |
| `Symbol.dispose`, `Symbol.asyncDispose` | `using` / `await using` support |

Options: `prefix` (default `"fs-core-"`), `root` (default `os.tmpdir()`),
`keep` (default `false` — leaves the directory on disk, handy while debugging
a failing test).

### Implementations

- `new RealFileSystem(root?)` — backed by `node:fs/promises`; `root` defaults
  to `process.cwd()` and is resolved to an absolute path.
- `new VirtualFileSystem(root?)` — in-memory `Map` of files; directories are
  implicit from paths; `root` defaults to `"/"`. `mtimeMs` is `Date.now()`
  on write; `ctimeMs` is the first write and survives overwrites.

### `collectContent(content, encoding?)`

Buffers any accepted write content (including Node `Readable` and web
`ReadableStream`) into a single `Buffer`:

```ts
import { collectContent, collectContentSync } from "@playwright-labs/fs-core";

const buffer = await collectContent(Readable.from(["a", "b"])); // <Buffer 61 62>
collectContentSync("fffe", "hex"); // <Buffer ff fe> — no stream support
```

## License

MIT
