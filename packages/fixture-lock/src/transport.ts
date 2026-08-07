/**
 * Any Lock client. E.g. websocket, HTTP, IPC
 */
export interface LockClient {
  acquire(id: string, workerId: string, staleMs: number): Promise<boolean>;
  release(id: string, workerId: string): Promise<boolean>;
}

export interface ResourceOptions<T> {
  id: string;
  data: T;
  client?: LockClient;
  workerId?: string;
  staleMs?: number;
}
