import * as crypto from "node:crypto";
import * as os from "node:os";
import * as path from "node:path";

import { expect, test } from "@playwright/test";

import { HttpLockServer } from "../../src/servers/http";
import { IpcLockServer } from "../../src/servers/ipc";
import type { Server } from "../../src/servers/types";
import { WebSocketLockServer } from "../../src/servers/ws";

function uniqueSocketPath(): string {
  // keep the whole path well under the ~104 byte sun_path limit on macOS
  const name = crypto.randomBytes(6).toString("hex");
  return process.platform === "win32"
    ? `\\\\.\\pipe\\${name}`
    : path.join(os.tmpdir(), `${name}.sock`);
}

const factories: { name: string; create: () => Server<any> }[] = [
  { name: "HttpLockServer", create: () => new HttpLockServer() },
  { name: "WebSocketLockServer", create: () => new WebSocketLockServer() },
  { name: "IpcLockServer", create: () => new IpcLockServer(uniqueSocketPath()) },
];

for (const { name, create } of factories) {
  test.describe(name, () => {
    test("Symbol.asyncDispose removes every listener registered on the server", async () => {
      const server = create();
      server.on("start", () => {});
      server.on("stop", () => {});
      server.on("error", () => {});

      await server.start();
      expect(server.listenerCount("start")).toBeGreaterThan(0);

      await server[Symbol.asyncDispose]();

      expect(server.listenerCount("start")).toBe(0);
      expect(server.listenerCount("stop")).toBe(0);
      expect(server.listenerCount("error")).toBe(0);
      expect(server.eventNames()).toEqual([]);
    });

    test("listeners registered before dispose still fire — cleanup happens after emitting", async () => {
      const server = create();
      let stopped = false;
      server.on("stop", () => {
        stopped = true;
      });

      await server.start();
      await server[Symbol.asyncDispose]();

      expect(stopped).toBe(true);
    });

    test("dispose without ever starting the server clears listeners without throwing", async () => {
      const server = create();
      server.on("error", () => {});

      await expect(server[Symbol.asyncDispose]()).resolves.toBeUndefined();
      expect(server.eventNames()).toEqual([]);
    });

    test("dispose is safe to call twice", async () => {
      const server = create();
      await server.start();

      await server[Symbol.asyncDispose]();
      await expect(server[Symbol.asyncDispose]()).resolves.toBeUndefined();
    });

    test("`await using` disposes the server and drops its listeners", async () => {
      const server = create();
      let started = false;

      {
        await using scoped = server;
        scoped.on("start", () => {
          started = true;
        });
        await scoped.start();
      }

      expect(started).toBe(true);
      expect(server.eventNames()).toEqual([]);
    });
  });
}
