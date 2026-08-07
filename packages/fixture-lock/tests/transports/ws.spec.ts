import { expect, test } from "@playwright/test";

import { WebSocketLockServer } from "../../src/servers/ws";
import { WebSocketLockClient } from "../../src/transports/ws";

let server: WebSocketLockServer;
let client: WebSocketLockClient;

test.beforeEach(async () => {
  server = new WebSocketLockServer();
  const info = await server.start();
  client = new WebSocketLockClient(info.url.toString());
});

test.afterEach(async () => {
  await server.stop();
});

test("acquire succeeds when the resource is free", async () => {
  await expect(client.acquire("res-1", "w1", 5000)).resolves.toBe(true);
});

test("acquire fails while another worker holds a fresh lock", async () => {
  await client.acquire("res-1", "w1", 5000);
  await expect(client.acquire("res-1", "w2", 5000)).resolves.toBe(false);
});

test("release frees the lock for the next acquire", async () => {
  await client.acquire("res-1", "w1", 5000);
  await expect(client.release("res-1", "w1")).resolves.toBe(true);
  await expect(client.acquire("res-1", "w2", 5000)).resolves.toBe(true);
});

test("a stale lock can be stolen by another worker", async () => {
  await client.acquire("res-1", "w1", 20);
  await new Promise((resolve) => setTimeout(resolve, 40));

  await expect(client.acquire("res-1", "w2", 20)).resolves.toBe(true);
});

test("resolves false when the server is unreachable", async () => {
  await server.stop();

  await expect(client.acquire("res-1", "w1", 5000)).resolves.toBe(false);
});
