import { type LockClient } from "../transport.js";

export class HttpLockClient implements LockClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    // strip trailing slash: new URL(...).toString() always adds one, which
    // would otherwise double up against the leading slash of each path below
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async acquire(
    id: string,
    workerId: string,
    staleMs: number,
    data?: unknown,
  ): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/api/locks/acquire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, workerId, staleMs, data }),
    });
    return res.ok;
  }

  async release(id: string, workerId: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/api/locks/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, workerId }),
    });
    return res.ok;
  }

  async getData(id: string): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}/api/locks/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    // 404 keeps this usable against older servers that lack the endpoint
    if (!res.ok) return undefined;
    const body = (await res.json()) as { data?: unknown };
    return body.data;
  }
}
