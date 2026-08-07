import * as net from "node:net";
import { type LockClient } from "../transport.js";

export class IpcLockClient implements LockClient {
  constructor(private readonly socketPath: string) {}

  async acquire(
    id: string,
    workerId: string,
    staleMs: number,
  ): Promise<boolean> {
    return this.#send({ action: "ACQUIRE", id, workerId, staleMs });
  }

  async release(id: string, workerId: string): Promise<boolean> {
    return this.#send({ action: "RELEASE", id, workerId });
  }

  #send(payload: object): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = net.createConnection(this.socketPath, () => {
        socket.write(JSON.stringify(payload) + "\n");
      });

      socket.on("data", (data) => {
        const res = JSON.parse(data.toString());
        socket.destroy();
        resolve(res.success);
      });

      socket.on("error", () => resolve(false));
    });
  }
}
