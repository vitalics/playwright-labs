export {
  test,
  expect,
  createFixture,
  type CreateFixtureOptions,
  type Fixture,
} from "./fixture";

export {
  RealFileSystem,
  VirtualFileSystem,
  type FileSystem,
  type FileContent,
  type FileStat,
  type WriteOptions,
} from "@playwright-labs/fs-core";
