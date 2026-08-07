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
  ): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/api/locks/acquire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, workerId, staleMs }),
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
}
