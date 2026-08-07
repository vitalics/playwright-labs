import { type LockClient } from "../transport.js";

export class WebSocketLockClient implements LockClient {
  #wsUrl: string;

  constructor(wsUrl: string) {
    this.#wsUrl = wsUrl;
  }

  async acquire(
    id: string,
    workerId: string,
    staleMs: number,
  ): Promise<boolean> {
    return this.#sendMessage({ action: "ACQUIRE", id, workerId, staleMs });
  }

  async release(id: string, workerId: string): Promise<boolean> {
    return this.#sendMessage({ action: "RELEASE", id, workerId });
  }

  #sendMessage(payload: object): Promise<boolean> {
    return new Promise((resolve) => {
      const ws = new WebSocket(this.#wsUrl);

      ws.onopen = () => {
        ws.send(JSON.stringify(payload));
      };

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data.toString());
          ws.close();
          resolve(Boolean(response.success));
        } catch {
          ws.close();
          resolve(false);
        }
      };

      ws.onerror = () => {
        resolve(false);
      };
    });
  }
}
