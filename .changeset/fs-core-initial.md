---
"@playwright-labs/fs-core": major
---

Initial release — filesystem abstraction with one `FileSystem` interface and two backends.

- `RealFileSystem(root?)` — real FS on `node:fs/promises`, rooted at `process.cwd()` by default; paths are POSIX-style, escaping the root via `..` throws, `write` creates parent directories
- `VirtualFileSystem(root?)` — in-memory FS (`Map`-backed) with the same semantics: implicit directories, Node-style `ENOENT` errors, `mtimeMs` on write
- Shared interface: `write`/`read`/`readText`/`append`/`exists`/`stat` (`size`, `mtimeMs`, `ctimeMs`, `isDirectory`)/`mkdir`/`remove` (`rm -rf` semantics)/`list`/`entries`; every path argument accepts a `string` or a `Path`
- `Path` — immutable POSIX-style path value object: normalizing constructor, `name`/`stem`/`ext`/`parent`/`segments`, `join`/`resolve`/`relative`, `withName`/`withStem`/`withExt`, `equals`/`startsWith`/`isInside`, `toNative`, `Symbol.iterator`, `Symbol.toPrimitive`
- `File` — `string`/`Buffer`/`Uint8Array` content or a size-only listing snapshot, IANA media type from the extension (`type`/`mime`, overridable), `size`, `mtime`/`ctime`, `toBuffer`/`toText`/`toBlob` (reading through the filesystem the entry came from), `File.from` for streams; `mimeType`/`MIME_BY_EXTENSION` exported separately
- `Directory` — `Symbol.iterator` over the snapshot of immediate children, `Symbol.asyncIterator` re-reading them from the filesystem, `size` (recursive total), `files`/`directories`/`find`/`file`/`directory`/`has`, `walk`/`walkAsync` with the `WALKER` filters, `refresh`
- `FSWalker` — a DOM `TreeWalker` over the entry tree: `parentNode`/`firstChild`/`lastChild`/`nextSibling`/`previousSibling`/`nextNode`/`previousNode`, movable `currentNode`, `reset`/`refresh`, `Symbol.iterator`; `FSWalker.from(fs, path?, filter?)` reads the tree first
- Filters — `WALKER` predicates (`SHOW_ALL`, `SHOW_ALL_FILES`, `SHOW_ALL_DIRECTORIES`, `SHOW_ALL_FILES_MTIME_BETWEEN`, `SHOW_ALL_FILES_CTIME_BETWEEN`) plus `not`/`every`/`some`/`prune`, and the `FILTER.ACCEPT`/`SKIP`/`REJECT` codes of `NodeFilter` (booleans still work — `false` skips, `REJECT` prunes a subtree)
- Events — both backends are `EventEmitter`s typed with `FileSystemEvents`: `file.write`, `file.append`, `file.read`, `file.remove`, `directory.create`, `directory.remove`; payloads are `File`/`Directory` entries bound to the filesystem, and nothing is built without listeners
- Streams — `createReadStream(path, { encoding?, start?, end?, highWaterMark? })` and `createWriteStream(path, { encoding?, flags? })` on both backends (the virtual one in memory); missing files fail through the stream's `error` event
- `TempDirectory` — real temp directory with `Symbol.dispose`/`Symbol.asyncDispose` (`using` / `await using`), `create`/`createSync`, an `fs` rooted inside it, `remove`/`removeSync`, `keep`
- `collectContent`/`collectContentSync` — buffers `string`/`Buffer`/`Uint8Array`/`Readable`/`ReadableStream` into a `Buffer`

Used by `@playwright-labs/fixture-fs`.
