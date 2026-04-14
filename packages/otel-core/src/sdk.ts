import { NodeSDK } from "@opentelemetry/sdk-node";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import type { Resource } from "@opentelemetry/resources";

export type OtelCoreOptions = {
  /**
   * Hostname of the OpenTelemetry collector.
   * @default 'localhost'
   */
  host?: string;
  /**
   * Port of the OpenTelemetry collector (OTLP/HTTP).
   * @default 4318
   */
  port?: number;
  /**
   * Connection protocol.
   * @default 'http'
   */
  protocol?: "http" | "https";
  /**
   * Additional HTTP headers sent with every export request.
   * Useful for API keys or multi-tenant routing.
   * @example { 'X-Scope-OrgID': 'my-tenant' }
   */
  headers?: Record<string, string>;
  /**
   * Basic auth credentials for the OTEL collector.
   */
  auth?: {
    username?: string;
    password?: string;
  };
  /**
   * Prefix prepended to every built-in metric name.
   * @default 'pw_'
   */
  prefix?: string;
  /**
   * Extra OTel resource attributes attached to every signal (trace + metric).
   * @example { 'deployment.environment': 'staging', 'service.version': '2.1.0' }
   */
  resourceAttributes?: Record<string, string | number | boolean>;
  /**
   * Env vars to expose as resource attributes under `env.<key>`.
   * Defaults to `{}` for security — opt-in explicitly.
   * @example { CI: process.env.CI, BUILD_ID: process.env.BUILD_ID }
   */
  env?: Record<string, string | undefined>;
  /**
   * How often (ms) to push metrics to the collector.
   * A forced flush always runs on exit.
   * @default 60000
   */
  exportIntervalMillis?: number;
};

export const DEFAULT_HOST = "localhost";
export const DEFAULT_PORT = 4318;
export const DEFAULT_PROTOCOL = "http";
export const DEFAULT_PREFIX = "pw_";
export const DEFAULT_EXPORT_INTERVAL = 60_000;

export type ResolvedOtelConfig = {
  baseUrl: string;
  headers: Record<string, string>;
  prefix: string;
  resourceAttributes: Record<string, string | number | boolean>;
  exportIntervalMillis: number;
};

/**
 * Resolves raw {@link OtelCoreOptions} into a normalised config object,
 * applying defaults and encoding any `auth` credentials into the `Authorization`
 * header.
 */
export function resolveOtelConfig(
  options: OtelCoreOptions = {},
): ResolvedOtelConfig {
  const host = options.host ?? DEFAULT_HOST;
  const port = options.port ?? DEFAULT_PORT;
  const protocol = options.protocol ?? DEFAULT_PROTOCOL;
  const baseUrl = `${protocol}://${host}:${port}`;

  const headers: Record<string, string> = { ...options.headers };
  if (options.auth?.username && options.auth?.password) {
    const encoded = Buffer.from(
      `${options.auth.username}:${options.auth.password}`,
    ).toString("base64");
    headers["Authorization"] = `Basic ${encoded}`;
  }

  const resourceAttributes: Record<string, string | number | boolean> = {
    ...options.resourceAttributes,
  };
  for (const [key, value] of Object.entries(options.env ?? {})) {
    if (value !== undefined) {
      resourceAttributes[`env.${key}`] = value;
    }
  }

  return {
    baseUrl,
    headers,
    prefix: options.prefix ?? DEFAULT_PREFIX,
    resourceAttributes,
    exportIntervalMillis: options.exportIntervalMillis ?? DEFAULT_EXPORT_INTERVAL,
  };
}

/**
 * Creates a {@link NodeSDK} configured with OTLP/HTTP trace and metric
 * exporters pointing at `baseUrl`.
 *
 * Override this in subclasses or tests to inject in-memory exporters.
 */
export function createOtelSdk(
  resource: Resource,
  config: Pick<ResolvedOtelConfig, "baseUrl" | "headers" | "exportIntervalMillis">,
): NodeSDK {
  return new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({
      url: `${config.baseUrl}/v1/traces`,
      headers: config.headers,
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${config.baseUrl}/v1/metrics`,
        headers: config.headers,
      }),
      exportIntervalMillis: config.exportIntervalMillis,
      exportTimeoutMillis: Math.min(config.exportIntervalMillis, 30_000),
    }),
    instrumentations: [],
  });
}
