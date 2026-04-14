import { Span } from "@playwright-labs/otel-core";

/**
 * Wraps a synchronous or asynchronous operation in an OTel span.
 *
 * The span is created before the callback runs and ended automatically when
 * the callback completes — whether it resolves or throws.  On error the span
 * is marked with `status = "error"` before being ended, so the failure shows
 * up highlighted in Jaeger / Tempo.
 *
 * ## Integration with `test.step`
 *
 * `withSpan` is designed to pair naturally with Playwright's `test.step`.
 * Using them together gives visibility in **two places** simultaneously:
 *
 * - **Playwright Trace Viewer** — the step title appears in the test timeline
 * - **OTel backend / Jaeger** — the span appears as a child of the test span
 *
 * ```ts
 * import { test } from '@playwright/test';
 * import { withSpan } from '@playwright-labs/fixture-otel';
 *
 * test('checkout flow', async ({ page }) => {
 *   await test.step('add item to cart', () =>
 *     withSpan('cart.add', (span) => {
 *       span.setAttribute('product.id', 'abc-123');
 *       return page.click('[data-testid="add-to-cart"]');
 *     })
 *   );
 *
 *   await test.step('complete checkout', () =>
 *     withSpan('checkout.submit', async (span) => {
 *       span.setAttribute('cart.items', 3);
 *       span.setAttribute('payment.method', 'credit_card');
 *       await page.click('[data-testid="checkout"]');
 *       span.setStatus('ok');
 *     })
 *   );
 * });
 * ```
 *
 * ## Standalone usage (without `test.step`)
 *
 * ```ts
 * const user = await withSpan('db.users.find', async (span) => {
 *   span.setAttribute('db.table', 'users');
 *   return db.findById(userId);
 * });
 * ```
 *
 * ## Error handling
 *
 * If the callback throws or rejects, the span's status is set to `"error"`
 * with the error message, then the span is ended and the error re-thrown:
 *
 * ```ts
 * // Span status = "error", message = "HTTP 500 Internal Server Error"
 * await withSpan('api.orders', async (span) => {
 *   const res = await fetch('/api/orders');
 *   if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
 *   return res.json();
 * });
 * ```
 *
 * ## Nesting
 *
 * Nested `withSpan` calls produce sibling spans in the OTel backend
 * (all are children of the test span).  For logical grouping use the span
 * name and attributes rather than relying on OTel parent–child nesting:
 *
 * ```ts
 * await test.step('checkout', () =>
 *   withSpan('checkout.flow', async (checkoutSpan) => {
 *     checkoutSpan.setAttribute('cart.items', 3);
 *
 *     await withSpan('checkout.payment', async (paySpan) => {
 *       paySpan.setAttribute('method', 'credit_card');
 *     });
 *   })
 * );
 * ```
 *
 * @param name - Span name as it will appear in the OTel tracing backend.
 * @param fn   - Callback that receives the span.  May be sync or async.
 * @returns    The value returned (or resolved) by `fn`.
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => T | Promise<T>,
): Promise<T> {
  const span = new Span(name);
  try {
    return await fn(span);
  } catch (error) {
    span.setStatus(
      "error",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  } finally {
    span.end();
  }
}
