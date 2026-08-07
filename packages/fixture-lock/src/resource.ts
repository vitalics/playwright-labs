import { LockClient, ResourceOptions } from "./transport.js";
import { createLockClientFromEnv } from "./env.js";

/**
 * Wraps a piece of data behind a named lock, acquired/released through a
 * pluggable `LockClient` transport.
 */
export class Resource<T> implements AsyncDisposable {
  readonly id: string;
  readonly #data: T;
  readonly #workerId: string;
  readonly #staleMs: number;
  readonly #client: LockClient;
  #isLocked = false;

  constructor({
    id,
    data,
    client,
    workerId,
    staleMs = 30000,
  }: ResourceOptions<T>) {
    if (!id || typeof id !== "string") {
      throw new Error("Resource ID must be a non-empty string.");
    }

    this.id = id;
    // freeze the data
    this.#data = Object.freeze(structuredClone(data));
    this.#workerId = workerId || `worker-${process.env.TEST_WORKER_INDEX ?? 0}`;
    this.#staleMs = staleMs;

    // Внедрение зависимости (Dependency Injection):
    // Используем переданный клиент или создаем его автоматически из process.env
    this.#client = client || createLockClientFromEnv();
  }

  /**
   * get data when unlocked
   */
  get data(): Readonly<T> {
    if (!this.#isLocked) {
      throw new Error(
        `Cannot read data of resource [${this.id}] without acquiring a lock.`,
      );
    }
    return this.#data;
  }

  get isLocked(): boolean {
    return this.#isLocked;
  }

  /**
   * Lock resource
   */
  async acquire(options?: {
    timeoutMs?: number;
    retryIntervalMs?: number;
  }): Promise<void> {
    const timeoutMs = options?.timeoutMs ?? 30000;
    const retryIntervalMs = options?.retryIntervalMs ?? 100;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const success = await this.#client.acquire(
        this.id,
        this.#workerId,
        this.#staleMs,
      );

      if (success) {
        this.#isLocked = true;
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
    }

    throw new Error(
      `Timeout: Could not acquire lock for resource [${this.id}] within ${timeoutMs}ms`,
    );
  }

  /**
   * Release resource
   */
  async release(): Promise<void> {
    if (!this.#isLocked) return;

    await this.#client.release(this.id, this.#workerId);
    this.#isLocked = false;
  }

  /**
   * Support `await using`
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.release();
  }
}
