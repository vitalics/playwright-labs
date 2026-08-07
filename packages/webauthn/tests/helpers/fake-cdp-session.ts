import { EventEmitter } from "node:events";

import type { CDPSession } from "@playwright/test";

type SendHandler = (params: unknown) => unknown;

/**
 * A minimal in-memory stand-in for `CDPSession` used to unit-test
 * `WebAuthn`/`VirtualAuthenticator` without launching a real browser.
 * Register a handler per CDP method with `onSend`, then use `emit(...)`
 * (inherited from `EventEmitter`) to simulate CDP events.
 */
export class FakeCDPSession extends EventEmitter {
  #handlers = new Map<string, SendHandler>();
  readonly sentCommands: { method: string; params: unknown }[] = [];
  detached = false;

  onSend(method: string, handler: SendHandler): void {
    this.#handlers.set(method, handler);
  }

  async send(method: string, params?: unknown): Promise<unknown> {
    this.sentCommands.push({ method, params });
    const handler = this.#handlers.get(method);
    if (!handler) {
      throw new Error(`FakeCDPSession: no handler registered for "${method}"`);
    }
    return handler(params);
  }

  async detach(): Promise<void> {
    this.detached = true;
  }
}

export function createFakeSession(): CDPSession & FakeCDPSession {
  return new FakeCDPSession() as unknown as CDPSession & FakeCDPSession;
}
