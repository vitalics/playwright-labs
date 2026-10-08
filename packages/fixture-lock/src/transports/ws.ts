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
      const ws = new WebSocket(this.#wsUrl);

      ws.onopen = () => {
        ws.send(JSON.stringify(payload));
      };

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data.toString());
          ws.close();
          resolve(response);
        } catch {
          ws.close();
          resolve(null);
        }
      };

      ws.onerror = () => {
        resolve(null);
      };
    });
  }
}
