import path from "node:path";
import { createHash } from "node:crypto";
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

import opentelemetry, { SpanStatusCode, ROOT_CONTEXT } from "@opentelemetry/api";
import type {
  Attributes,
  Counter,
  Histogram,
  Meter,
  Span,
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
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";

import {
  OtelEvent,
  type MetricPayload,
  type SpanPayload,
  WORKER_BASE_URL_ENV,
  WORKER_HEADERS_ENV,
  resolveOtelConfig,
  createOtelSdk,
  type OtelCoreOptions,
} from "@playwright-labs/otel-core";

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

export default class OtelReporter implements Reporter {
  protected readonly baseUrl: string;
  protected readonly headers: Record<string, string>;
  protected readonly prefix: string;
  protected readonly resourceAttributes: Record<
    string,
    string | number | boolean
  >;
  protected readonly exportIntervalMillis: number;

  private sdk: NodeSDK | undefined;
  private tracer: Tracer | undefined;
  private meter: Meter | undefined;

  // ── Span tracking ────────────────────────────────────────────────────────────
  /** test.id → root span for that test */
  private readonly testSpans = new Map<string, Span>();
  /** step hash → span */
  private readonly stepSpans = new Map<string, Span>();

  // ── Metric instruments ───────────────────────────────────────────────────────
  private testsTotal: Counter | undefined;
  private testDuration: Histogram | undefined;
  private testRetries: Counter | undefined;
  private testAttachmentCount: Counter | undefined;
  private testAttachmentSize: Histogram | undefined;
  private testErrorCount: Counter | undefined;

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
      "process.runtime.name": "nodejs",
      "process.runtime.version": versions.node,
      "process.argv": argv.join(" "),
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
    if (!this.tracer) return;
    const span = this.tracer.startSpan(
      this.formatTestTitle(test),
      { startTime: result.startTime },
      ROOT_CONTEXT,
    );
    this.testSpans.set(test.id, span);
    this.updateNodejsStats();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const isPassing =
      result.status === "skipped" || result.status === test.expectedStatus;
    const project = findProject(test);
    const browserAttrs = resolveBrowserAttrs(project);

    const span = this.testSpans.get(test.id);
    if (span) {
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

      // Forward pw_otel.* annotations as span attributes
      for (const annotation of test.annotations) {
        if (annotation.type.startsWith(ANNOTATION_PREFIX)) {
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

      span.end(new Date(result.startTime.getTime() + result.duration));
      this.testSpans.delete(test.id);
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

    this.updateNodejsStats();
  }

  onStepBegin(test: TestCase, _result: TestResult, step: TestStep): void {
    if (!this.tracer) return;
    const parentSpan = step.parent
      ? this.stepSpans.get(this.stepSpanKey(test, step.parent))
      : this.testSpans.get(test.id);

    const ctx = parentSpan
      ? opentelemetry.trace.setSpan(ROOT_CONTEXT, parentSpan)
      : ROOT_CONTEXT;

    const span = this.tracer.startSpan(
      `${step.category}: ${step.title}`,
      { startTime: step.startTime },
      ctx,
    );
    this.stepSpans.set(this.stepSpanKey(test, step), span);
    this.updateNodejsStats();
  }

  onStepEnd(test: TestCase, _result: TestResult, step: TestStep): void {
    const key = this.stepSpanKey(test, step);
    const span = this.stepSpans.get(key);
    if (span) {
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
      span.end(new Date(step.startTime.getTime() + step.duration));
      this.stepSpans.delete(key);
    }
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
        this.forwardWorkerSpan(payload, test);
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

  onEnd(_result: FullResult): void {
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
   * Creates a child span under the test span from a worker-emitted span event.
   * This makes worker-side `useSpan()` spans appear as children of the test
   * span in Jaeger / Zipkin / etc.
   */
  private forwardWorkerSpan(event: SpanPayload, test: TestCase): void {
    if (!this.tracer) return;
    const parentSpan = this.testSpans.get(test.id);
    const ctx = parentSpan
      ? opentelemetry.trace.setSpan(ROOT_CONTEXT, parentSpan)
      : ROOT_CONTEXT;

    const span = this.tracer.startSpan(
      event.name,
      { startTime: event.startTime },
      ctx,
    );
    if (event.attributes) {
      span.setAttributes(event.attributes as Attributes);
    }
    if (event.status === "error") {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: event.statusMessage ?? "",
      });
    } else if (event.status === "ok") {
      span.setStatus({ code: SpanStatusCode.OK });
    }
    span.end(event.endTime);
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

  private stepSpanKey(test: TestCase, step: TestStep): string {
    return createHash("sha256")
      .update(test.id)
      .update(step.titlePath().join("||"))
      .update(String(step.startTime.getTime()))
      .digest("hex");
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
