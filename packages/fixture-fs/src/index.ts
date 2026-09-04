export {
  test,
  expect,
  createFixture,
  type CreateFixtureOptions,
  type Fixture,
} from "./fixture";

export {
  Directory,
  File,
  RealFileSystem,
  VirtualFileSystem,
  type FileSystem,
  type FileContent,
  type FileStat,
  type FsEntry,
  type WriteOptions,
} from "@playwright-labs/fs-core";
