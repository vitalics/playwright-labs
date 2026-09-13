import * as net from "node:net";
import { type LockClient } from "../transport.js";

export class IpcLockClient implements LockClient {
  constructor(private readonly socketPath: string) {}

  async acquire(
    id: string,
    workerId: string,
    staleMs: number,
    data?: unknown,
  ): Promise<boolean> {
    const response = await this.#send({ action: "ACQUIRE", id, workerId, staleMs, data });
    return Boolean(response?.success);
  }

  async release(id: string, workerId: string): Promise<boolean> {
    const response = await this.#send({ action: "RELEASE", id, workerId });
    return Boolean(response?.success);
  }

  async getData(id: string): Promise<unknown> {
    const response = await this.#send({ action: "GET_DATA", id });
    return response?.success ? response.data : undefined;
  }

  #send(payload: object): Promise<any> {
    return new Promise((resolve) => {
      const socket = net.createConnection(this.socketPath, () => {
        socket.write(JSON.stringify(payload) + "\n");
      });

      socket.on("data", (data) => {
        const res = JSON.parse(data.toString());
        socket.destroy();
        resolve(res);
      });

      socket.on("error", () => resolve(null));
    });
  }
}
