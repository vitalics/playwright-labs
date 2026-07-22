/** Env var the reporter sets so workers can find the OTLP base URL. */
export const WORKER_BASE_URL_ENV = "PLAYWRIGHT_OTEL_BASE_URL";

/** Env var the reporter sets to pass serialised HTTP headers to workers. */
export const WORKER_HEADERS_ENV = "PLAYWRIGHT_OTEL_HEADERS";

/** Prefix that OTel event lines written to stdout must start with. */
export const OTEL_EVENT_PREFIX = "__pw_otel__";

/** Attachment name used when events are transported via `testInfo.attachments`. */
export const OTEL_ATTACHMENT_NAME = "__pw_otel__";

/**
 * Annotation type used to carry a W3C traceparent from a test fixture to the
 * reporter.  When present, the reporter creates the test span as a child of
 * the remote span described by the value, ensuring all spans produced by the
 * test share a single trace ID that can be propagated to downstream services.
 *
 * Value format: `00-{32-hex traceId}-{16-hex spanId}-{2-hex flags}`
 *
 * @example `"00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"`
 */
export const TRACEPARENT_ANNOTATION = "pw_otel.traceparent";

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
  /** Worker-side span ID used to wire parent–child relationships. */
  spanId: string;
  /** Worker-side parent span ID, present only for nested spans. */
  parentSpanId?: string;
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
 * Custom transport for OTel payloads, installed via {@link OtelEvent.setWriter}.
 */
export type OtelEventWriter = (payload: OtelPayload) => void;

/**
 * Emits and parses OTel payloads between worker and reporter processes.
 *
 * Workers call `OtelEvent.emit()` to forward metrics / spans to the reporter.
 * Inside a test, fixture-otel installs an attachment-based writer so events
 * travel via `testInfo.attachments` and stay out of the console; the reporter
 * decodes them with `OtelEvent.fromAttachment()` in `onTestEnd`. Outside a
 * test context, `emit()` falls back to writing a prefixed line to stdout,
 * which the reporter's `onStdOut` hook decodes with `OtelEvent.parse()`.
 */
export class OtelEvent {
  static readonly PREFIX = OTEL_EVENT_PREFIX;

  private static writer: OtelEventWriter | undefined;

  /**
   * Routes subsequent `emit()` calls through `writer` instead of stdout.
   * Pass `undefined` to restore the stdout fallback.
   */
  static setWriter(writer: OtelEventWriter | undefined): void {
    OtelEvent.writer = writer;
  }

  /**
   * Forwards a single event to the reporter — through the installed writer
   * when one is active, otherwise as a single-line JSON event on stdout.
   */
  static emit(payload: OtelPayload): void {
    if (OtelEvent.writer) {
      OtelEvent.writer(payload);
      return;
    }
    process.stdout.write(`${OtelEvent.PREFIX}${JSON.stringify(payload)}\n`);
  }

  /**
   * Tries to decode a test attachment as an OTel event.
   * Returns `null` when the attachment is unrelated to this transport.
   */
  static fromAttachment(attachment: {
    name: string;
    body?: Buffer;
  }): OtelPayload | null {
    if (attachment.name !== OTEL_ATTACHMENT_NAME || !attachment.body) {
      return null;
    }
    try {
      return JSON.parse(attachment.body.toString("utf-8")) as OtelPayload;
    } catch {
      return null;
    }
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
