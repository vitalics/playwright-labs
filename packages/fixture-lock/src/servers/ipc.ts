import * as net from "node:net";
import { EventEmitter } from "node:events";
import type { AddressInfo } from "node:net";

import type { DefaultEvents, MergeEvents, Server, StartInfo } from "./types.js";

type Events = {
  data: [buffer: string | Buffer];
};

type Merged = MergeEvents<DefaultEvents, Events>;

export class IpcLockServer
  extends EventEmitter<Merged>
  implements Server<Events>
{
  #server: net.Server | null = null;
  readonly #socketPath: string;
  #locks = new Map<
    string,
    { workerId: string; acquiredAt: number; staleMs: number }
  >();

  constructor(socketPath: string) {
    super();
    this.#socketPath = socketPath;
    this.#createServer();
  }

  #createServer() {
    this.#server = net.createServer((socket) => {
      socket.on("data", (buffer) => {
        this.emit("data", buffer);

        let payload: any;
        try {
          payload = JSON.parse(buffer.toString());
        } catch {
          return;
        }

        const response = this.#processMessage(payload);
        socket.write(`${JSON.stringify(response)}\n`);
      });

      socket.on("error", (reason) => {
        this.emit("error", reason);
      });
    });
  }

  start(): Promise<StartInfo> {
    return new Promise((resolve, reject) => {
      if (!this.#server) {
        throw new ReferenceError("Cannot start server due to stopping.");
      }

      this.#server.listen(this.#socketPath, () => {
        const info: StartInfo = {
          addr: {
            address: this.#socketPath,
            family: "IPC",
            port: 0,
          } as AddressInfo,
          url: new URL(`ipc://${this.#socketPath}`),
        };
        this.emit("start", info);
        resolve(info);
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.#server) return resolve();
      this.#server.close(() => {
        this.emit("stop");
        resolve();
      });
    });
  }

  #processMessage(data: any): { success: boolean } {
    const { action, id, workerId, staleMs } = data;

    if (action === "ACQUIRE") {
      const existing = this.#locks.get(id);
      if (existing) {
        const isStale = Date.now() - existing.acquiredAt > existing.staleMs;
        if (!isStale) return { success: false };
      }
      this.#locks.set(id, {
        workerId,
        acquiredAt: Date.now(),
        staleMs: staleMs || 30000,
      });
      return { success: true };
    }

    if (action === "RELEASE") {
      this.#locks.delete(id);
      return { success: true };
    }

    return { success: false };
  }

  async [Symbol.asyncDispose]() {
    await this.stop();
    this.removeAllListeners();
  }
}
