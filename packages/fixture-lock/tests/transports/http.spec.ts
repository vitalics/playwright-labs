import { expect, test } from "@playwright/test";

import { HttpLockServer } from "../../src/servers/http";
import { HttpLockClient } from "../../src/transports/http";

let server: HttpLockServer;
let client: HttpLockClient;
let baseUrl: string;

test.beforeEach(async () => {
  server = new HttpLockServer();
  const info = await server.start();
  baseUrl = info.url.toString();
  client = new HttpLockClient(baseUrl);
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

test("release on a lock nobody holds still succeeds", async () => {
  await expect(client.release("never-locked", "w1")).resolves.toBe(true);
});

test("a stale lock can be stolen by another worker", async () => {
  await client.acquire("res-1", "w1", 20);
  await new Promise((resolve) => setTimeout(resolve, 40));

  await expect(client.acquire("res-1", "w2", 20)).resolves.toBe(true);
});

test("strips a trailing slash from the base URL", async () => {
  // new URL(...).toString() always ends in "/" — the client must not
  // double it up against the leading "/" of each request path.
  const trailingSlashClient = new HttpLockClient(`${baseUrl}/`);

  await expect(trailingSlashClient.acquire("res-2", "w1", 5000)).resolves.toBe(true);
});

test("data sent on acquire is readable by id via getData", async () => {
  await client.acquire("res-1", "w1", 5000, { email: "a@b.c" });

  await expect(client.getData("res-1")).resolves.toEqual({ email: "a@b.c" });
});

test("getData returns undefined when no data was published", async () => {
  await expect(client.getData("never-published")).resolves.toBeUndefined();
});

test("data survives release", async () => {
  await client.acquire("res-1", "w1", 5000, { seat: 1 });
  await client.release("res-1", "w1");

  await expect(client.getData("res-1")).resolves.toEqual({ seat: 1 });
});

test("first writer wins — later acquires do not overwrite stored data", async () => {
  await client.acquire("res-1", "w1", 5000, { v: 1 });
  await client.release("res-1", "w1");
  await client.acquire("res-1", "w2", 5000, { v: 2 });

  await expect(client.getData("res-1")).resolves.toEqual({ v: 1 });
});
