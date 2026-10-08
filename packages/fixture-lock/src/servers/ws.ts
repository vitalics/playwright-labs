import * as http from "node:http";
import * as crypto from "node:crypto";
import { AddressInfo } from "node:net";
import type { Duplex } from "node:stream";

import type { DefaultEvents, Server, StartInfo, MergeEvents } from "./types";
import EventEmitter from "node:events";

type WsEvents = {
  upgrade: [request: http.IncomingMessage, socket: Duplex];
};

type Merged = MergeEvents<DefaultEvents, WsEvents>;

export class WebSocketLockServer
  extends EventEmitter<Merged>
  implements Server<WsEvents>
{
  #server: http.Server | null = null;
  #sockets = new Set<Duplex>();
  #locks = new Map<
    string,
    { workerId: string; acquiredAt: number; staleMs: number }
  >();
  // data survives release() — releasing frees the lock, not the data
  #dataStore = new Map<string, unknown>();

  constructor() {
    super();
    if (this.#server) {
      return;
    }
    this.#createServer();
  }
  #createServer() {
    this.#server = http.createServer();

    this.#server.on("upgrade", (req, socket) => {
      const key = req.headers["sec-websocket-key"];
      const acceptKey = crypto
        .createHash("sha1")
        .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
        .digest("base64");

      const headers = [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${acceptKey}`,
      ];

      socket.write(headers.join("\r\n") + "\r\n\r\n");
      this.emit("upgrade", req, socket);

      this.#sockets.add(socket);
      socket.on("close", () => this.#sockets.delete(socket));

      socket.on("data", (buffer) => {
        const payload = this.#parseWsFrame(buffer);
        if (!payload) return;

        const response = this.#processMessage(payload);
        const info = this.#buildWsFrame(JSON.stringify(response));
        socket.write(info);
        this.emit("data", info);
      });
    });

    this.#server.on("error", (e) => this.emit("error", e));
  }

  start(): Promise<StartInfo> {
    return new Promise((res) => {
      if (!this.#server) {
        throw new ReferenceError("Cannot start server. Its closed");
      }
      this.#server.listen(0, "127.0.0.1", () => {
        const address = this.#server?.address() as AddressInfo;
        const info: StartInfo = {
          addr: address,
          url: new URL(`ws://127.0.0.1:${address.port}`),
          port: address.port,
        };
        this.emit("start", info);
        res(info);
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.#server) return resolve();

      // http.Server#close() waits for open connections to end on their own;
      // these are raw upgraded sockets that never get a close handshake, so
      // force them shut instead of hanging forever.
      for (const socket of this.#sockets) socket.destroy();
      this.#sockets.clear();

      this.#server.close(() => {
        this.emit("stop");
        resolve();
      });
    });
  }

  #processMessage(data: any): { success: boolean; data?: unknown } {
    const { action, id, workerId, staleMs, data: payloadData } = data;

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
      // first writer wins
      if (payloadData !== undefined && !this.#dataStore.has(id)) {
        this.#dataStore.set(id, payloadData);
      }
      return { success: true };
    }

    if (action === "RELEASE") {
      this.#locks.delete(id);
      return { success: true };
    }

    if (action === "GET_DATA") {
      return { success: true, data: this.#dataStore.get(id) };
    }

    return { success: false };
  }

  #parseWsFrame(buffer: Buffer): any {
    try {
      const secondByte = buffer[1];
      const length = secondByte & 127;
      let maskStart = 2;
      if (length === 126) maskStart = 4;
      else if (length === 127) maskStart = 10;

      const masks = buffer.subarray(maskStart, maskStart + 4);
      const data = buffer.subarray(maskStart + 4);
      const decoded = Buffer.alloc(data.length);

      for (let i = 0; i < data.length; i++) {
        decoded[i] = data[i] ^ masks[i % 4];
      }
      return JSON.parse(decoded.toString("utf8"));
    } catch {
      return null;
    }
  }

  #buildWsFrame(message: string): Buffer {
    const byteLength = Buffer.byteLength(message);
    let headerLength = 2;
    if (byteLength > 65535) headerLength = 10;
    else if (byteLength > 125) headerLength = 4;

    const frame = Buffer.alloc(headerLength + byteLength);
    frame[0] = 0x81; // Text frame + FIN
    if (byteLength > 65535) {
      frame[1] = 127;
      frame.writeUInt32BE(0, 2);
      frame.writeUInt32BE(byteLength, 6);
    } else if (byteLength > 125) {
      frame[1] = 126;
      frame.writeUInt16BE(byteLength, 2);
    } else {
      frame[1] = byteLength;
    }
    frame.write(message, headerLength);
    return frame;
  }
  async [Symbol.asyncDispose]() {
    await this.stop();
    this.removeAllListeners();
  }
}
