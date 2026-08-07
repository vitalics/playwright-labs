import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

import { LockClient } from "../transport.js";

export class FsLockClient implements LockClient {
  readonly #lockDir: string;

  constructor(lockDir = path.join(os.tmpdir(), "playwright-locks")) {
    this.#lockDir = lockDir;
  }

  async acquire(
    id: string,
    workerId: string,
    staleMs: number,
  ): Promise<boolean> {
    await fs.mkdir(this.#lockDir, { recursive: true });
    const lockFilePath = path.join(this.#lockDir, `${id}.lock`);

    if (await this.#tryCreate(lockFilePath, workerId)) return true;

    // stale lock: clean it up and retry once, so a single acquire() call
    // can steal it — matching the http/ws/ipc transports' behavior
    await this.#cleanIfStale(lockFilePath, staleMs);
    return this.#tryCreate(lockFilePath, workerId);
  }

  async release(id: string): Promise<boolean> {
    const lockFilePath = path.join(this.#lockDir, `${id}.lock`);
    try {
      await fs.unlink(lockFilePath);
      return true;
    } catch (error: any) {
      // already unlocked is not a failure — matches the http/ws/ipc servers,
      // which report success for releasing a lock nobody holds
      return error.code === "ENOENT";
    }
  }

  async #tryCreate(lockFilePath: string, workerId: string): Promise<boolean> {
    try {
      const handle = await fs.open(lockFilePath, "wx");
      await handle.writeFile(
        JSON.stringify({ workerId, createdAt: Date.now() }),
      );
      await handle.close();
      return true;
    } catch (error: any) {
      if (error.code === "EEXIST") {
        return false;
      }
      throw error;
    }
  }

  async #cleanIfStale(filePath: string, staleMs: number): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      if (Date.now() - stats.mtimeMs > staleMs) {
        await fs.unlink(filePath);
      }
    } catch {
      // ignore if it disappeared, or is otherwise inaccessible
    }
  }
}
