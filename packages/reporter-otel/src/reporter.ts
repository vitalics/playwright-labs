import path from "node:path";
import { cpuUsage, memoryUsage, argv, versions } from "node:process";
import {
  arch,
  cpus,
  availableParallelism,
  machine,
  userInfo,
  platform,
  release,
  type as osType,
  version as osVersion,
  freemem,
  hostname,
  networkInterfaces,
} from "node:os";

import opentelemetry, {
  SpanStatusCode,
  ROOT_CONTEXT,
  TraceFlags,
} from "@opentelemetry/api";
import type {
  Attributes,
  Counter,
  Histogram,
  Meter,
  Span,
  SpanContext,
  Tracer,
  UpDownCounter,
} from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import type { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import {
  ATTR_CODE_COLUMN,
  ATTR_CODE_FILEPATH,
  ATTR_CODE_LINENO,
  ATTR_TEST_CASE_NAME,
  ATTR_TEST_CASE_RESULT_STATUS,
  ATTR_TEST_SUITE_NAME,
} from "@opentelemetry/semantic-conventions/incubating";

import type {
  FullConfig,
  FullProject,
  FullResult,
  Suite,
  TestCase,
  TestError,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";
import { BaseReporter } from "@playwright-labs/reporter-core";

import {
  OtelEvent,
  type MetricPayload,
  type SpanPayload,
  WORKER_BASE_URL_ENV,
  WORKER_HEADERS_ENV,
  TRACEPARENT_ANNOTATION,
  resolveOtelConfig,
  createOtelSdk,
  type OtelCoreOptions,
} from "@playwright-labs/otel-core";

export { TRACEPARENT_ANNOTATION };

/**
 * Prefix that annotation types must start with to be forwarded as span
 * attributes. Annotations without this prefix are ignored.
 *
 * @example `"pw_otel.feature"` → span attribute `feature`
 */
export const ANNOTATION_PREFIX = "pw_otel.";

/**
 * Generates the annotation type string required for this reporter to
 * convert a `test.info().annotations` entry into a span attribute.
 *
 * @example
 * ```ts
 * test('checkout flow', async ({ page }) => {
 *   test.info().annotations.push({
 *     type: annotationLabel('feature'),
 *     description: 'shopping-cart',
 *   });
 * });
 * ```
 */
export function annotationLabel(label: string): string {
  return `${ANNOTATION_PREFIX}${label}`;
}

export type OtelReporterOptions = OtelCoreOptions;

export default class OtelReporter extends BaseReporter {
  protected readonly baseUrl: string;
  protected readonly headers: Record<string, string>;
  protected readonly prefix: string;
  protected readonly resourceAttributes: Record<
    string,
    string | number | boolean
  >;
  protected readonly exportIntervalMillis: number;

  private sdk: NodeSDK | undefined;
  protected tracer: Tracer | undefined;
  protected meter: Meter | undefined;

  // ── Span tracking ────────────────────────────────────────────────────────────
  /** test.id → startTime buffered from onTestBegin; span is created in onTestEnd */
  private readonly testStartTimes = new Map<string, Date>();
  /** test.id → buffered worker span payloads (flushed on test end) */
  private readonly workerSpanBuffer = new Map<string, SpanPayload[]>();

  // ── Metric instruments ───────────────────────────────────────────────────────
  private testsTotal: Counter | undefined;
  private testDuration: Histogram | undefined;
  private testRetries: Counter | undefined;
  private testAttachmentCount: Counter | undefined;
  private testAttachmentSize: Histogram | undefined;
  private testErrorCount: Counter | undefined;
  private testStepCount: Counter | undefined;
  private testStepDuration: Histogram | undefined;
  private testAnnotationCount: Counter | undefined;
  private runDuration: Histogram | undefined;

  // ── Observable gauge backing values ──────────────────────────────────────────
  private _heapUsed = 0;
  private _heapTotal = 0;
  private _rss = 0;
  private _external = 0;
  private _arrayBuffers = 0;
  private _freeMem = 0;
  private _cpuUser = 0;
  private _cpuSystem = 0;

  constructor(options: OtelReporterOptions = {}) {
    super();
    const config = resolveOtelConfig(options);
    this.baseUrl = config.baseUrl;
    this.headers = config.headers;
    this.prefix = config.prefix;
    this.resourceAttributes = config.resourceAttributes;
    this.exportIntervalMillis = config.exportIntervalMillis;

    // Expose endpoint to workers before they are spawned so they can set up
    // their own SDK instances using the same backend.
    process.env[WORKER_BASE_URL_ENV] = this.baseUrl;
    if (Object.keys(this.headers).length > 0) {
      process.env[WORKER_HEADERS_ENV] = JSON.stringify(this.headers);
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  onBegin(config: FullConfig, _suite: Suite): void {
    super.onBegin(config, _suite);
    const runtime = resolveRuntime();
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "playwright",
      [ATTR_SERVICE_VERSION]: config.version,
      "playwright.workers": config.workers,
      "playwright.config_file": config.configFile ?? "",
      "playwright.fully_parallel": config.fullyParallel,
      "playwright.shard_current": config.shard?.current ?? 1,
      "playwright.shard_total": config.shard?.total ?? 1,
      "os.arch": arch(),
      "os.cpus": cpus().length,
      "os.available_parallelism": availableParallelism(),
      "os.machine": machine(),
      "os.platform": platform(),
      "os.type": osType(),
      "os.release": release(),
      "os.version": osVersion(),
      "host.name": hostname(),
      "host.ip": getHostIp(),
      "host.user": userInfo().username,
      "process.runtime.name": runtime.name,
      "process.runtime.version": runtime.version,
      "process.argv": argv.join(" "),
      // Full runtime component versions: process.runtime.versions.node,
      // process.runtime.versions.v8, process.runtime.versions.openssl, …
      // (process.runtime.versions.bun under Bun, .deno under Deno)
      ...Object.fromEntries(
        Object.entries(versions).map(([key, value]) => [
          `process.runtime.versions.${key}`,
          value,
        ]),
      ),
      ...this.resourceAttributes,
    });

    this.sdk = this.createSdk(resource);
    this.sdk.start();

    this.tracer = opentelemetry.trace.getTracer("playwright", config.version);
    this.meter = opentelemetry.metrics.getMeter("playwright", config.version);

    this.initMetricInstruments();
    this.updateNodejsStats();
  }

  onTestBegin(test: TestCase, result: TestResult): void {
    // Buffer the start time only. The OTel span is created in onTestEnd so that
    // test annotations (including pw_otel.traceparent) are available when we
    // need to set the parent SpanContext.
    this.testStartTimes.set(test.id, result.startTime);
    this.updateNodejsStats();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    super.onTestEnd(test, result);
    const isPassing =
      result.status === "skipped" || result.status === test.expectedStatus;
    const project = findProject(test);
    const browserAttrs = resolveBrowserAttrs(project);

    if (this.tracer) {
      const startTime =
        this.testStartTimes.get(test.id) ?? result.startTime;
      this.testStartTimes.delete(test.id);

      // If the test annotated a W3C traceparent, create the span as a child of
      // that remote context so all spans share a single trace ID that tests can
      // propagate to downstream services via the traceparent header.
      const remoteCtx = this.resolveRemoteContext(test);
      const span = this.tracer.startSpan(
        this.formatTestTitle(test),
        { startTime },
        remoteCtx,
      );

      span.setAttributes({
        [ATTR_TEST_CASE_NAME]: test.title,
        [ATTR_TEST_SUITE_NAME]: test.parent.title,
        [ATTR_TEST_CASE_RESULT_STATUS]: isPassing ? "pass" : "fail",
        [ATTR_CODE_FILEPATH]: test.location.file,
        [ATTR_CODE_LINENO]: test.location.line,
        [ATTR_CODE_COLUMN]: test.location.column,
        "test.id": test.id,
        "test.status": result.status,
        "test.expected_status": test.expectedStatus,
        "test.duration_ms": result.duration,
        "test.retry": result.retry,
        "test.worker_index": result.workerIndex,
        "test.parallel_index": result.parallelIndex,
        "test.attachments_count": result.attachments.length,
        "test.steps_count": result.steps.length,
        ...browserAttrs,
        // user_agent is long — keep it in spans only, not in metric labels
        ...(project?.use.userAgent && {
          "browser.user_agent": project.use.userAgent.slice(0, 512),
        }),
      });

      // Forward pw_otel.* annotations as span attributes (skip traceparent itself)
      for (const annotation of test.annotations) {
        if (
          annotation.type.startsWith(ANNOTATION_PREFIX) &&
          annotation.type !== TRACEPARENT_ANNOTATION
        ) {
          span.setAttribute(
            annotation.type.slice(ANNOTATION_PREFIX.length),
            annotation.description ?? "",
          );
        }
      }

      if (!isPassing) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: result.error?.message ?? "",
        });
      }

      // Create step spans recursively from the completed result tree
      for (const step of result.steps) {
        this.createStepSpan(step, span);
      }

      this.flushWorkerSpans(test, span);

      span.end(new Date(startTime.getTime() + result.duration));
    }

    // Metrics — include project/browser attrs for grouping in dashboards.
    // user_agent is intentionally excluded (high cardinality, long string).
    const attrs = {
      "test.status": result.status,
      "test.result": isPassing ? "pass" : "fail",
      "test.suite": test.parent.title,
      ...browserAttrs,
    };
    this.testsTotal?.add(1, attrs);
    this.testDuration?.record(result.duration, attrs);
    if (result.retry > 0) {
      this.testRetries?.add(result.retry, { "test.suite": test.parent.title });
    }
    for (const attachment of result.attachments) {
      const size = attachment.body?.length ?? 0;
      this.testAttachmentCount?.add(1, {
        "attachment.content_type": attachment.contentType,
      });
      if (size > 0) this.testAttachmentSize?.record(size);
    }
    for (const annotation of test.annotations) {
      this.testAnnotationCount?.add(1, {
        "annotation.type": annotation.type,
        "test.suite": test.parent.title,
      });
    }

    // Step metrics — walked separately from span creation so they are
    // recorded even when no tracer is available.
    this.recordStepMetrics(result.steps, {
      "test.suite": test.parent.title,
      ...browserAttrs,
    });

    this.updateNodejsStats();
  }

  onStepBegin(
    _test: TestCase,
    _result: TestResult,
    _step: TestStep,
  ): void {
    // Step spans are created in onTestEnd from result.steps so that they share
    // the same trace context as the (deferred) test span.
    this.updateNodejsStats();
  }

  onStepEnd(
    _test: TestCase,
    _result: TestResult,
    _step: TestStep,
  ): void {
    this.updateNodejsStats();
  }

  /**
   * Intercepts stdout from worker processes to capture metric and span events
   * emitted by the `useCounter`, `useHistogram`, `useUpDownCounter`, and
   * `useSpan` fixtures.
   */
  onStdOut(chunk: string | Buffer, test: TestCase, _result: TestResult): void {
    const text =
      typeof chunk === "string" ? chunk : chunk.toString("utf-8");
    for (const line of text.split("\n")) {
      const payload = OtelEvent.parse(line);
      if (!payload) continue;
      if (payload.kind === "span") {
        const buf = this.workerSpanBuffer.get(test.id) ?? [];
        buf.push(payload);
        this.workerSpanBuffer.set(test.id, buf);
      } else {
        this.recordWorkerMetric(payload);
      }
    }
  }

  onError(error: TestError): void {
    this.testErrorCount?.add(1, {
      "error.location": this.location(error),
      "error.message": (error.message ?? "").slice(0, 256),
    });
    this.updateNodejsStats();
  }

  onEnd(result: FullResult): void {
    // Wall-clock duration of the whole run — the OTel equivalent of the
    // remote-write reporter's tests_total_duration.
    this.runDuration?.record(result.duration);
    this.updateNodejsStats();
  }

  async onExit(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
    }
  }

  printsToStdio(): boolean {
    return false;
  }

  // ── Protected factory — override in tests to inject custom exporters ──────────

  /**
   * Creates the `NodeSDK` used to export traces and metrics.
   * Override this in test subclasses to inject in-memory exporters.
   */
  protected createSdk(resource: Resource): NodeSDK {
    return createOtelSdk(resource, {
      baseUrl: this.baseUrl,
      headers: this.headers,
      exportIntervalMillis: this.exportIntervalMillis,
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  /**
   * Reads the `pw_otel.traceparent` annotation from a test and, if present,
   * returns a context with that remote SpanContext set as the active span.
   * Returns ROOT_CONTEXT when no annotation is found or the value is invalid.
   */
  private resolveRemoteContext(
    test: TestCase,
  ): typeof ROOT_CONTEXT {
    const annotation = test.annotations.find(
      (a) => a.type === TRACEPARENT_ANNOTATION,
    );
    if (!annotation?.description) return ROOT_CONTEXT;
    const spanContext = parseTraceparent(annotation.description);
    if (!spanContext) return ROOT_CONTEXT;
    return opentelemetry.trace.setSpanContext(ROOT_CONTEXT, spanContext);
  }

  /**
   * Recursively creates OTel spans for a TestStep and all its children.
   * Called from onTestEnd so the spans share the same trace as the test span.
   */
  private createStepSpan(step: TestStep, parentSpan: Span): void {
    if (!this.tracer) return;
    const ctx = opentelemetry.trace.setSpan(ROOT_CONTEXT, parentSpan);
    const span = this.tracer.startSpan(
      `${step.category}: ${step.title}`,
      { startTime: step.startTime },
      ctx,
    );
    span.setAttributes({
      "test.step.category": step.category,
      "test.step.name": step.title,
    });
    if (step.location) {
      span.setAttributes({
        [ATTR_CODE_FILEPATH]: step.location.file,
        [ATTR_CODE_LINENO]: step.location.line,
        [ATTR_CODE_COLUMN]: step.location.column,
      });
    }
    if (step.error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: step.error.message ?? "",
      });
    }
    for (const child of step.steps) {
      this.createStepSpan(child, span);
    }
    span.end(new Date(step.startTime.getTime() + step.duration));
  }

  /**
   * Recursively records step count/duration metrics for a TestStep tree.
   * Called from onTestEnd independently of span creation so the metrics are
   * exported even when tracing is disabled.
   */
  private recordStepMetrics(
    steps: TestStep[],
    attrs: Record<string, string>,
  ): void {
    for (const step of steps) {
      const stepAttrs = { ...attrs, "test.step.category": step.category };
      this.testStepCount?.add(1, stepAttrs);
      this.testStepDuration?.record(step.duration, stepAttrs);
      this.recordStepMetrics(step.steps, attrs);
    }
  }

  /**
   * Flushes all buffered worker span payloads for a test, creating OTel spans
   * in topological order (parents before children) so that nested `withSpan`
   * calls appear as a proper parent–child tree in Jaeger / Tempo.
   */
  private flushWorkerSpans(test: TestCase, testSpan: Span): void {
    if (!this.tracer) return;
    const payloads = this.workerSpanBuffer.get(test.id);
    if (!payloads?.length) return;
    this.workerSpanBuffer.delete(test.id);

    const sorted = topoSort(payloads);
    const otelSpanById = new Map<string, Span>();

    for (const event of sorted) {
      const parentOtelSpan = event.parentSpanId
        ? (otelSpanById.get(event.parentSpanId) ?? testSpan)
        : testSpan;

      const ctx = opentelemetry.trace.setSpan(ROOT_CONTEXT, parentOtelSpan);
      const span = this.tracer.startSpan(
        event.name,
        { startTime: event.startTime },
        ctx,
      );

      if (event.attributes) span.setAttributes(event.attributes as Attributes);

      if (event.status === "error") {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: event.statusMessage ?? "",
        });
      } else if (event.status === "ok") {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      span.end(event.endTime);
      otelSpanById.set(event.spanId, span);
    }
  }

  /**
   * Records a worker-emitted metric payload using the reporter's shared meter.
   * Instruments are created on demand — the OTel SDK deduplicates by name so
   * repeated calls for the same metric name are safe.
   */
  private recordWorkerMetric(event: MetricPayload): void {
    if (!this.meter) return;
    const opts = {
      description: event.description,
      unit: event.unit,
    };
    switch (event.type) {
      case "counter": {
        const instrument = this.meter.createCounter(event.name, opts);
        for (const dp of event.dataPoints) {
          instrument.add(dp.value, dp.attributes as Attributes);
        }
        break;
      }
      case "histogram": {
        const instrument = this.meter.createHistogram(event.name, opts);
        for (const dp of event.dataPoints) {
          instrument.record(dp.value, dp.attributes as Attributes);
        }
        break;
      }
      case "updown_counter": {
        const instrument = this.meter.createUpDownCounter(event.name, opts);
        for (const dp of event.dataPoints) {
          instrument.add(dp.value, dp.attributes as Attributes);
        }
        break;
      }
    }
  }

  private initMetricInstruments(): void {
    if (!this.meter) return;
    const p = this.prefix;
    const m = this.meter;

    this.testsTotal = m.createCounter(`${p}tests_total`, {
      description: "Total number of tests partitioned by status and result",
    });
    this.testDuration = m.createHistogram(`${p}test_duration`, {
      description: "Test execution duration",
      unit: "ms",
    });
    this.testRetries = m.createCounter(`${p}test_retries`, {
      description: "Number of test retries",
    });
    this.testAttachmentCount = m.createCounter(`${p}test_attachment_count`, {
      description: "Number of test attachments",
    });
    this.testAttachmentSize = m.createHistogram(`${p}test_attachment_size`, {
      description: "Test attachment sizes",
      unit: "bytes",
    });
    this.testErrorCount = m.createCounter(`${p}test_error_count`, {
      description: "Number of global test errors",
    });
    this.testStepCount = m.createCounter(`${p}test_step_count`, {
      description: "Total number of test steps partitioned by category",
    });
    this.testStepDuration = m.createHistogram(`${p}test_step_duration`, {
      description: "Test step execution duration",
      unit: "ms",
    });
    this.testAnnotationCount = m.createCounter(`${p}test_annotation_count`, {
      description: "Number of test annotations partitioned by type",
    });
    this.runDuration = m.createHistogram(`${p}run_duration`, {
      description: "Total test run duration (wall clock)",
      unit: "ms",
    });

    // Observable gauges — backing values are updated on every lifecycle event
    m.createObservableGauge(`${p}process_memory_heap_used`, {
      description: "Node.js heap memory used",
      unit: "bytes",
    }).addCallback((r) => r.observe(this._heapUsed));

    m.createObservableGauge(`${p}process_memory_heap_total`, {
      description: "Node.js heap memory total",
      unit: "bytes",
    }).addCallback((r) => r.observe(this._heapTotal));

    m.createObservableGauge(`${p}process_memory_rss`, {
      description: "Node.js resident set size",
      unit: "bytes",
    }).addCallback((r) => r.observe(this._rss));

    m.createObservableGauge(`${p}process_memory_external`, {
      description: "Node.js memory used by C++ objects bound to JS objects",
      unit: "bytes",
    }).addCallback((r) => r.observe(this._external));

    m.createObservableGauge(`${p}process_memory_array_buffers`, {
      description: "Memory allocated for ArrayBuffers and SharedArrayBuffers",
      unit: "bytes",
    }).addCallback((r) => r.observe(this._arrayBuffers));

    m.createObservableGauge(`${p}os_memory_free`, {
      description: "OS free memory",
      unit: "bytes",
    }).addCallback((r) => r.observe(this._freeMem));

    m.createObservableGauge(`${p}process_cpu_user`, {
      description: "Node.js CPU user time",
      unit: "us",
    }).addCallback((r) => r.observe(this._cpuUser));

    m.createObservableGauge(`${p}process_cpu_system`, {
      description: "Node.js CPU system time",
      unit: "us",
    }).addCallback((r) => r.observe(this._cpuSystem));
  }

  private updateNodejsStats(): void {
    const mem = memoryUsage();
    this._heapUsed = mem.heapUsed;
    this._heapTotal = mem.heapTotal;
    this._rss = mem.rss;
    this._external = mem.external;
    this._arrayBuffers = mem.arrayBuffers;
    this._freeMem = freemem();

    const cpu = cpuUsage();
    this._cpuUser = cpu.user;
    this._cpuSystem = cpu.system;
  }

  private formatTestTitle(test: TestCase): string {
    const [, projectName, , ...titles] = test.titlePath();
    const projectPrefix = projectName ? `[${projectName}] › ` : "";
    const filePath = path.relative(process.cwd(), test.location.file);
    return `${projectPrefix}${filePath}:${test.location.line} › ${titles.join(" › ")}`;
  }

  private location(item: TestCase | TestStep | TestError): string {
    const file = path.relative(
      process.cwd(),
      item.location?.file ?? "unknown",
    );
    return `${file}:${item.location?.line ?? 0}:${item.location?.column ?? 0}`;
  }
}

/** Returns the first non-internal IPv4 address, or "unknown". */
function getHostIp(): string {
  const nets = networkInterfaces();
  for (const addrs of Object.values(nets)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) return addr.address;
    }
  }
  return "unknown";
}

/**
 * Walks up the suite hierarchy to find the `FullProject` for a test.
 * Returns `undefined` for tests that don't belong to a project (e.g. global
 * setup / teardown) or when running outside of a normal Playwright suite.
 */
function findProject(test: TestCase): FullProject | undefined {
  let suite: Suite | undefined = test.parent;
  while (suite) {
    const p = suite.project();
    if (p !== undefined) return p;
    suite = suite.parent;
  }
  return undefined;
}

/**
 * Sorts worker span payloads so every parent appears before its children.
 * Spans whose parentSpanId is unknown (cross-test or missing) are treated as
 * roots and placed first.
 */
function topoSort(payloads: SpanPayload[]): SpanPayload[] {
  const byId = new Map(payloads.map((p) => [p.spanId, p]));
  const result: SpanPayload[] = [];
  const visited = new Set<string>();

  function visit(p: SpanPayload): void {
    if (visited.has(p.spanId)) return;
    visited.add(p.spanId);
    if (p.parentSpanId) {
      const parent = byId.get(p.parentSpanId);
      if (parent) visit(parent);
    }
    result.push(p);
  }

  for (const p of payloads) visit(p);
  return result;
}

/** Runtime identity used for the `process.runtime.*` resource attributes. */
export type RuntimeInfo = {
  /** OTel `process.runtime.name` value: `nodejs`, `bun`, or `deno`. */
  name: "nodejs" | "bun" | "deno";
  /** OTel `process.runtime.version` value — the runtime's own version. */
  version: string;
};

/**
 * Detects the JavaScript runtime executing the test process.
 *
 * Playwright normally runs on Node.js, but the reporter also works when the
 * process runs under Bun or Deno — both expose a `bun` / `deno` key in
 * `process.versions`.
 *
 * @example
 * ```ts
 * resolveRuntime({ node: "20.11.0", v8: "11.3.244.8" });
 * // { name: "nodejs", version: "20.11.0" }
 * resolveRuntime({ bun: "1.1.29", node: "20.11.0" });
 * // { name: "bun", version: "1.1.29" }
 * ```
 */
export function resolveRuntime(
  processVersions: Record<string, string | undefined> = versions,
): RuntimeInfo {
  if (processVersions.bun) {
    return { name: "bun", version: processVersions.bun };
  }
  if (processVersions.deno) {
    return { name: "deno", version: processVersions.deno };
  }
  return { name: "nodejs", version: processVersions.node ?? "unknown" };
}

/**
 * Parses a W3C traceparent string into an OTel SpanContext.
 * Returns `undefined` if the value does not match the expected format.
 *
 * Format: `00-{32-hex traceId}-{16-hex spanId}-{2-hex flags}`
 *
 * @example
 * ```ts
 * const ctx = parseTraceparent('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
 * // { traceId: '4bf92f3577b34da6a3ce929d0e0e4736', spanId: '00f067aa0ba902b7', traceFlags: 1, isRemote: true }
 * ```
 */
export function parseTraceparent(traceparent: string): SpanContext | undefined {
  const parts = traceparent.split("-");
  if (parts.length < 4 || parts[0] !== "00") return undefined;
  const [, traceId, spanId, flags] = parts;
  if (!/^[0-9a-f]{32}$/.test(traceId)) return undefined;
  if (!/^[0-9a-f]{16}$/.test(spanId)) return undefined;
  return {
    traceId,
    spanId,
    traceFlags: Number.isNaN(parseInt(flags, 16)) ? TraceFlags.SAMPLED : parseInt(flags, 16),
    isRemote: true,
  };
}

/**
 * Extracts metric-safe browser/project attributes from a `FullProject`.
 * user_agent is excluded here because it is long and high-cardinality;
 * include it in spans separately if needed.
 */
function resolveBrowserAttrs(
  project: FullProject | undefined,
): Record<string, string> {
  if (!project) return {};
  const vp = project.use.viewport;
  return {
    "test.project": project.name,
    "browser.name": project.use.browserName ?? "",
    "browser.channel": project.use.channel ?? "",
    "browser.headless": String(project.use.headless ?? true),
    "browser.viewport": vp ? `${vp.width}x${vp.height}` : "",
    "browser.locale": project.use.locale ?? "",
  };
}
