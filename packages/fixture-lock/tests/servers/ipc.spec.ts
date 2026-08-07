import * as crypto from "node:crypto";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";

import { expect, test } from "@playwright/test";

import { IpcLockServer } from "../../src/servers/ipc";

function uniqueSocketPath(): string {
  // keep the whole path well under the ~104 byte sun_path limit on macOS
  const name = crypto.randomBytes(6).toString("hex");
  return process.platform === "win32"
    ? `\\\\.\\pipe\\${name}`
    : path.join(os.tmpdir(), `${name}.sock`);
}

function send(socketPath: string, payload: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath, () => {
      socket.write(payload);
    });
    socket.once("data", (data) => {
      socket.end();
      resolve(data.toString());
    });
    socket.once("error", reject);
    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(null);
    });
  });
}

let server: IpcLockServer;
let socketPath: string;

test.beforeEach(async () => {
  socketPath = uniqueSocketPath();
  server = new IpcLockServer(socketPath);
  await server.start();
});

test.afterEach(async () => {
  await server.stop();
});

test("responds success:false for an unknown action", async () => {
  const response = await send(
    socketPath,
    `${JSON.stringify({ action: "NOPE", id: "res-1", workerId: "w1" })}\n`,
  );
  expect(JSON.parse(response!)).toEqual({ success: false });
});

test("ignores malformed JSON without crashing the server", async () => {
  await expect(send(socketPath, "not json{{{\n")).resolves.toBeNull();

  // the server must still be alive and able to serve a well-formed request
  const response = await send(
    socketPath,
    `${JSON.stringify({ action: "ACQUIRE", id: "res-1", workerId: "w1", staleMs: 5000 })}\n`,
  );
  expect(JSON.parse(response!)).toEqual({ success: true });
});
