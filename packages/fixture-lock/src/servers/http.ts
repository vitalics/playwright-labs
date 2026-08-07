import * as http from "node:http";
import { AddressInfo } from "node:net";

import { DefaultEvents, Server, StartInfo } from "./types";
import EventEmitter from "node:events";

export class HttpLockServer
  extends EventEmitter<DefaultEvents>
  implements Server
{
  #server: http.Server | null = null;
  #locks = new Map<
    string,
    { workerId: string; acquiredAt: number; staleMs: number }
  >();

  start(): Promise<StartInfo> {
    return new Promise((resolve, reject) => {
      this.#server = http.createServer((req, res) => {
        let body = "";
        req.on("data", (chunk) => {
          this.emit("data", chunk);
          return (body += chunk);
        });
        req.on("end", () => {
          const payload = body ? JSON.parse(body) : {};
          this.#handleRequest(req, res, payload);
        });
      });

      this.#server.listen(0, "127.0.0.1", () => {
        const address = this.#server?.address() as AddressInfo;
        const info: StartInfo = {
          addr: address,
          url: new URL(`http://127.0.0.1:${address.port}`),
          port: address.port,
        };
        this.emit("start", info);
        resolve(info);
      });

      this.#server.on("error", (reason) => {
        this.emit("error", reason);
        reject(reason);
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.#server) return resolve();
      this.#server.close((reason) => {
        this.emit("stop", reason);
        resolve();
      });
    });
  }

  #handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    payload: any,
  ) {
    const { id, workerId, staleMs } = payload;

    if (req.url === "/api/locks/acquire" && req.method === "POST") {
      const existing = this.#locks.get(id);

      if (existing) {
        const isStale = Date.now() - existing.acquiredAt > existing.staleMs;
        if (!isStale) {
          res.writeHead(409);
          return res.end(JSON.stringify({ success: false }));
        }
      }

      this.#locks.set(id, {
        workerId,
        acquiredAt: Date.now(),
        staleMs: staleMs || 30000,
      });
      res.writeHead(200);
      return res.end(JSON.stringify({ success: true }));
    }

    if (req.url === "/api/locks/release" && req.method === "POST") {
      this.#locks.delete(id);
      res.writeHead(200);
      return res.end(JSON.stringify({ success: true }));
    }

    res.writeHead(404);
    res.end();
  }
  async [Symbol.asyncDispose]() {
    await this.stop();
    this.removeAllListeners();
  }
}
