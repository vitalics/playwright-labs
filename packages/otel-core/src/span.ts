import { OtelEvent } from "./events";

export type SpanStatus = "ok" | "error";

/**
 * Worker-side OTel **Span** — represents a named unit of work within a test.
 *
 * The span is forwarded to the reporter (and from there to the OTel backend)
 * as a child of the current test span when `end()` is called.  The fixture
 * teardown auto-calls `end()` for any span that was not explicitly closed,
 * but it is recommended to end spans as soon as the operation completes to
 * capture precise timing.
 *
 * Spans also implement `Disposable` so they can be used with the `using`
 * keyword for deterministic, scope-bound lifecycle management.
 *
 * @example
 * ```ts
 * test('track checkout', async ({ useSpan, page }) => {
 *   const span = useSpan('checkout.flow');
 *   await page.goto('/checkout');
 *   span.setAttribute('cart.items', 3);
 *   span.end();
 * });
 *
 * // Scope-bound with `using`
 * test('track search', async ({ useSpan, page }) => {
 *   {
 *     using span = useSpan('search.request');
 *     await page.goto('/search?q=shoes');
 *     span.setAttribute('query', 'shoes');
 *   } // span.end() called automatically here
 * });
 * ```
 */
export class Span implements Disposable {
  private readonly _startTime: number;
  private _attributes: Record<string, string | number | boolean> = {};
  private _status?: SpanStatus;
  private _statusMessage?: string;
  private _ended = false;

  constructor(readonly name: string) {
    this._startTime = Date.now();
  }

  /**
   * Sets a single attribute on the span.
   * @param key - Attribute key (dot-separated convention, e.g. `'http.method'`).
   * @param value - Attribute value.
   */
  setAttribute(key: string, value: string | number | boolean): this {
    this._attributes[key] = value;
    return this;
  }

  /**
   * Sets multiple attributes at once.
   * @param attributes - A flat key/value record.
   */
  setAttributes(attributes: Record<string, string | number | boolean>): this {
    Object.assign(this._attributes, attributes);
    return this;
  }

  /**
   * Sets the span status.
   * @param status - `'ok'` or `'error'`.
   * @param message - Optional human-readable message (typically used with `'error'`).
   */
  setStatus(status: SpanStatus, message?: string): this {
    this._status = status;
    this._statusMessage = message;
    return this;
  }

  /** `true` after `end()` has been called. */
  get ended(): boolean {
    return this._ended;
  }

  /**
   * Marks the span as complete and emits its data to the reporter.
   * Subsequent calls are no-ops.
   */
  end(): void {
    if (this._ended) return;
    this._ended = true;

    OtelEvent.emit({
      kind: "span",
      name: this.name,
      startTime: this._startTime,
      endTime: Date.now(),
      ...(Object.keys(this._attributes).length > 0 && {
        attributes: this._attributes,
      }),
      ...(this._status !== undefined && { status: this._status }),
      ...(this._statusMessage !== undefined && {
        statusMessage: this._statusMessage,
      }),
    });
  }

  /**
   * Called automatically when exiting a `using` block.
   * Equivalent to calling `end()`.
   */
  [Symbol.dispose](): void {
    this.end();
  }
}
