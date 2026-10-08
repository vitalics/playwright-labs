/**
 * Any Lock client. E.g. websocket, HTTP, IPC
 */
export interface LockClient {
  acquire(
    id: string,
    workerId: string,
    staleMs: number,
    data?: unknown,
  ): Promise<boolean>;
  release(id: string, workerId: string): Promise<boolean>;
  getData(id: string): Promise<unknown>;
}

export interface ResourceOptions<T> {
  id: string;
  data?: T;
  client?: LockClient;
  workerId?: string;
  staleMs?: number;
}
