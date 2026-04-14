/** Env var the reporter sets so workers can find the OTLP base URL. */
export const WORKER_BASE_URL_ENV = "PLAYWRIGHT_OTEL_BASE_URL";

/** Env var the reporter sets to pass serialised HTTP headers to workers. */
export const WORKER_HEADERS_ENV = "PLAYWRIGHT_OTEL_HEADERS";

/** Prefix that OTel event lines written to stdout must start with. */
export const OTEL_EVENT_PREFIX = "__pw_otel__";

// ── Metric types ──────────────────────────────────────────────────────────────

export type MetricType = "counter" | "histogram" | "updown_counter";

/** A single recorded data point with an optional attribute set. */
export type DataPoint = {
  value: number;
  attributes?: Record<string, string | number | boolean>;
};

// ── Payload shapes ────────────────────────────────────────────────────────────

export type MetricPayload = {
  kind: "metric";
  type: MetricType;
  name: string;
  description?: string;
  unit?: string;
  dataPoints: DataPoint[];
};

export type SpanPayload = {
  kind: "span";
  /** Span display name. */
  name: string;
  /** Unix epoch milliseconds when the span started. */
  startTime: number;
  /** Unix epoch milliseconds when the span ended. */
  endTime: number;
  attributes?: Record<string, string | number | boolean>;
  status?: "ok" | "error";
  statusMessage?: string;
};

/** Union of all payload shapes that can be transported over stdout. */
export type OtelPayload = MetricPayload | SpanPayload;

// ── Event bridge ──────────────────────────────────────────────────────────────

/**
 * Emits and parses OTel payloads over the worker's stdout stream.
 *
 * Workers call `OtelEvent.emit()` to forward metrics / spans to the reporter.
 * The reporter's `onStdOut` hook calls `OtelEvent.parse()` to decode them.
 */
export class OtelEvent {
  static readonly PREFIX = OTEL_EVENT_PREFIX;

  /**
   * Writes a single-line JSON event to the worker's stdout.
   * The reporter will intercept this via `onStdOut`.
   */
  static emit(payload: OtelPayload): void {
    process.stdout.write(`${OtelEvent.PREFIX}${JSON.stringify(payload)}\n`);
  }

  /**
   * Tries to decode a single stdout line as an OTel event.
   * Returns `null` when the line is unrelated to this reporter.
   */
  static parse(line: string): OtelPayload | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith(OtelEvent.PREFIX)) return null;
    try {
      return JSON.parse(trimmed.slice(OtelEvent.PREFIX.length)) as OtelPayload;
    } catch {
      return null;
    }
  }
}
