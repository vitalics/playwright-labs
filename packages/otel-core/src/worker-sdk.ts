import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { WORKER_BASE_URL_ENV, WORKER_HEADERS_ENV } from "./events";

// ── Singleton ─────────────────────────────────────────────────────────────────

let _sdk: NodeSDK | undefined;

// ── Public API ────────────────────────────────────────────────────────────────

export interface WorkerSdkOptions {
  /**
   * OpenTelemetry instrumentation plugins to activate in the worker process.
   * Pass any instrumentations here — e.g. from
   * `@opentelemetry/auto-instrumentations-node` or individual packages such as
   * `@opentelemetry/instrumentation-http`.
   *
   * @example
   * ```ts
   * import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
   *
   * startWorkerSdk({
   *   instrumentations: [getNodeAutoInstrumentations()],
   * });
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instrumentations?: any[];
}

/**
 * Initialises a `NodeSDK` in the **worker process** and exports spans directly
 * to the OTLP endpoint configured by the reporter.
 *
 * Call this **once** — typically in a Playwright `globalSetup` file or a
 * worker-scoped fixture — before any test code runs.  Subsequent calls are
 * no-ops (singleton per worker process).
 *
 * When the `PLAYWRIGHT_OTEL_BASE_URL` env var is not set (i.e. the reporter is
 * not running), the function returns immediately without starting anything.
 *
 * @example Setup file (`worker-setup.ts`)
 * ```ts
 * import { startWorkerSdk } from '@playwright-labs/otel-core';
 * import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
 *
 * startWorkerSdk({
 *   instrumentations: [getNodeAutoInstrumentations()],
 * });
 * ```
 *
 * @example `playwright.config.ts` — register the setup file
 * ```ts
 * export default defineConfig({
 *   require: ['./worker-setup.ts'],
 * });
 * ```
 *
 * @example Worker-scoped fixture
 * ```ts
 * export const test = base.extend<{}, { otelWorker: void }>({
 *   otelWorker: [
 *     async ({}, use) => {
 *       startWorkerSdk({ instrumentations: [getNodeAutoInstrumentations()] });
 *       await use();
 *     },
 *     { scope: 'worker' },
 *   ],
 * });
 * ```
 */
export function startWorkerSdk(options: WorkerSdkOptions = {}): void {
  if (_sdk) return; // already initialised for this worker process

  const baseUrl = process.env[WORKER_BASE_URL_ENV];
  if (!baseUrl) return; // reporter not running — skip silently

  const rawHeaders = process.env[WORKER_HEADERS_ENV];
  const headers: Record<string, string> = rawHeaders
    ? (JSON.parse(rawHeaders) as Record<string, string>)
    : {};

  _sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: `${baseUrl}/v1/traces`,
      headers,
    }),
    instrumentations: options.instrumentations ?? [],
  });

  _sdk.start();

  // Flush any in-flight spans when the worker exits.
  process.once("beforeExit", () => {
    _sdk?.shutdown().catch(() => {});
  });
}
