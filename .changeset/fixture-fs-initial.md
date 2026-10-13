---
"@playwright-labs/fixture-fs": major
---

Initial release — filesystem fixture for Playwright built on `@playwright-labs/fs-core`.

- `fs` fixture — per-test `VirtualFileSystem` (default, parallel-safe isolation) or `RealFileSystem` rooted at `cwd` via `createFixture({ mode: "real", cwd })`
- Explicit writes of Playwright artifacts: `await fs.write("shot.png", await page.screenshot())`
- Matchers on the `fs` instance: `toExist(path)`, `toHaveText(path, string | RegExp)`, `toHaveContent(path, Buffer | Uint8Array)`, `toBeEmptyDir(path)` — all with `.not` support and clean assertion messages on missing files
- Zero-config `test`/`expect` exports plus `createFixture(options)` factory
