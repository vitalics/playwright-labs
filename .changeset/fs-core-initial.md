---
"@playwright-labs/fs-core": major
---

Initial release — filesystem abstraction with one `FileSystem` interface and two backends.

- `RealFileSystem(root?)` — real FS on `node:fs/promises`, rooted at `process.cwd()` by default; paths are POSIX-style, escaping the root via `..` throws, `write` creates parent directories
- `VirtualFileSystem(root?)` — in-memory FS (`Map`-backed) with the same semantics: implicit directories, Node-style `ENOENT` errors, `mtimeMs` on write
- Shared interface: `write`/`read`/`readText`/`append`/`exists`/`stat`/`mkdir`/`remove` (`rm -rf` semantics)/`list`/`entries` (`FsEntry` — `name`, `isDirectory`, `size`; directory size is the recursive total of the files inside)
- `collectContent` — buffers `string`/`Buffer`/`Uint8Array`/`Readable`/`ReadableStream` into a `Buffer`

Used by `@playwright-labs/fixture-fs`.
