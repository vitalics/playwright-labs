import { EventEmitter } from "node:events";
import type { Directory, File } from "./entry.js";

/**
 * Events every {@link FileSystem} emits for the operations that go through
 * it. Only its own API is observed — changes made to the disk by anything
 * else are not watched.
 *
 * ```ts
 * fs.on("directory.create", (dir) => console.log("dir:", `${dir.path}`));
 * fs.on("file.write", (file) => console.log(file.name, file.size, file.type));
 * ```
 */
export type FileSystemEvents = {
  /** A file was read (`read`, `readText`, or a drained read stream). */
  "file.read": [file: File];
  /** A file was written (`write` or a finished write stream). */
  "file.write": [file: File];
  /** A file was appended to (`append` or a finished `flags: "a"` stream). */
  "file.append": [file: File];
  /** A file was removed — the entry is its state just before removal. */
  "file.remove": [file: File];
  /** A directory was created by `mkdir` (existing directories are silent). */
  "directory.create": [directory: Directory];
  /** A directory was removed recursively. */
  "directory.remove": [directory: Directory];
};

/** Name of a {@link FileSystemEvents} event. */
export type FileSystemEvent = keyof FileSystemEvents;

/**
 * `EventEmitter` base of both backends, typed with {@link FileSystemEvents}.
 * `captureRejections` is on, so a rejected async listener surfaces as an
 * `error` event instead of an unhandled rejection.
 */
export class FileSystemEmitter extends EventEmitter<FileSystemEvents> {
  constructor() {
    super({ captureRejections: true });
  }

  /**
   * Emits `event` only when something listens — so building the entry (which
   * may need a `stat`) costs nothing on an unobserved filesystem.
   */
  protected notify<E extends FileSystemEvent>(
    event: E,
    build: () => FileSystemEvents[E][0],
  ): void {
    if (this.listenerCount(event) === 0) return;
    // the typed overload cannot see through the generic event name
    const emitter = this as unknown as {
      emit(event: E, ...args: unknown[]): boolean;
    };
    emitter.emit(event, build());
  }
}
