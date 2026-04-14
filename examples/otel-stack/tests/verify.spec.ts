/**
 * Verification tests — assert that OTel data from the `generate` project
 * actually arrived in the backends.
 *
 * Runs after the `generate` project via Playwright project dependencies.
 * The reporter's `onExit` flushes the SDK before this project starts, so all
 * traces and metrics should be available in the collector.
 *
 * Backends queried:
 *   Jaeger             — http://localhost:16686  (traces)
 *   OTel Collector     — http://localhost:8889   (prometheus scrape endpoint)
 *   Prometheus         — http://localhost:9090   (metrics, after scrape)
 *
 * The verify tests also log the Grafana URL so the user can explore results
 * interactively after the run.
 */
import { test, expect } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

const JAEGER_BASE = "http://localhost:16686";
const OTEL_COLLECTOR_METRICS = "http://localhost:8889";

/** Poll interval when using expect.poll — generous to allow export delays. */
const POLL_OPTS = { timeout: 45_000, intervals: [2_000, 3_000, 5_000] };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches the raw Prometheus text from the OTel Collector scrape endpoint and
 * polls until `predicate` returns `true`.
 *
 * @example
 * await pollMetrics(request, (t) => t.includes("my_metric_total")).toBe(true);
 */
function pollMetrics(
  request: APIRequestContext,
  predicate: (metricsText: string) => boolean,
) {
  return expect.poll(async () => {
    const resp = await request.get(`${OTEL_COLLECTOR_METRICS}/metrics`);
    if (!resp.ok()) return false;
    return predicate(await resp.text());
  }, POLL_OPTS);
}

/**
 * Parses the numeric value of the first Prometheus series matching `pattern`.
 * The pattern must capture the numeric value in group 1.
 * Returns `NaN` when the series is not found.
 *
 * @example
 * parseMetricValue(text, /e2e_api_requests_total\{[^}]*endpoint="\/users"[^}]*\}\s+([\d.]+)/);
 */
function parseMetricValue(text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  return match ? parseFloat(match[1]) : NaN;
}

// ─────────────────────────────────────────────────────────────────────────────
// Trace verification (Jaeger)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("OTel reporter — trace verification (Jaeger)", () => {
  test("Jaeger receives traces from the playwright service", async ({
    request,
  }) => {
    await expect
      .poll(async () => {
        const resp = await request.get(`${JAEGER_BASE}/api/services`);
        if (!resp.ok()) return [];
        const body = await resp.json();
        return (body.data as string[]) ?? [];
      }, POLL_OPTS)
      .toContain("playwright");
  });

  test("Jaeger has at least one trace from the generate project", async ({
    request,
  }) => {
    await expect
      .poll(async () => {
        const resp = await request.get(
          `${JAEGER_BASE}/api/traces?service=playwright&limit=5`,
        );
        if (!resp.ok()) return 0;
        const body = await resp.json();
        return (body.data as unknown[])?.length ?? 0;
      }, POLL_OPTS)
      .toBeGreaterThan(0);
  });

  test("Jaeger trace contains e2e.checkout.flow span as child", async ({
    request,
  }) => {
    await expect
      .poll(async () => {
        const resp = await request.get(
          `${JAEGER_BASE}/api/traces?service=playwright&limit=20`,
        );
        if (!resp.ok()) return false;
        const body = await resp.json();
        const traces: { spans: { operationName: string }[] }[] =
          body.data ?? [];
        return traces.some((trace) =>
          trace.spans.some((s) => s.operationName === "e2e.checkout.flow"),
        );
      }, POLL_OPTS)
      .toBe(true);
  });

  test("Jaeger trace contains error span with correct status", async ({
    request,
  }) => {
    await expect
      .poll(async () => {
        const resp = await request.get(
          `${JAEGER_BASE}/api/traces?service=playwright&limit=20`,
        );
        if (!resp.ok()) return false;
        const body = await resp.json();
        const traces: { spans: { operationName: string; tags: { key: string; value: unknown }[] }[] }[] =
          body.data ?? [];
        return traces.some((trace) =>
          trace.spans.some(
            (s) =>
              s.operationName === "e2e.failed.operation" &&
              s.tags.some(
                (t) => t.key === "otel.status_code" && t.value === "ERROR",
              ),
          ),
        );
      }, POLL_OPTS)
      .toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Built-in metric verification (pw_* metrics)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("OTel reporter — built-in metric verification", () => {
  test("pw_tests_total counter is exported", async ({ request }) => {
    await pollMetrics(request, (t) => t.includes("pw_tests_total")).toBe(true);
  });

  test("pw_tests_total has test_result label", async ({ request }) => {
    await pollMetrics(
      request,
      (t) =>
        t.includes("pw_tests_total") &&
        (t.includes('test_result="pass"') || t.includes('test_result="fail"')),
    ).toBe(true);
  });

  test("pw_test_duration_milliseconds histogram is exported", async ({ request }) => {
    await pollMetrics(request, (t) =>
      t.includes("pw_test_duration_milliseconds_bucket") &&
      t.includes("pw_test_duration_milliseconds_sum") &&
      t.includes("pw_test_duration_milliseconds_count"),
    ).toBe(true);
  });

  test("pw_test_duration_milliseconds_sum has non-zero value", async ({ request }) => {
    await pollMetrics(request, (t) => {
      const v = parseMetricValue(
        t,
        /pw_test_duration_milliseconds_sum\{[^}]*\}\s+([\d.]+)/,
      );
      return !isNaN(v) && v > 0;
    }).toBe(true);
  });

  test("pw_process_memory_heap_used_bytes gauge is exported", async ({ request }) => {
    await pollMetrics(request, (t) =>
      t.includes("pw_process_memory_heap_used_bytes"),
    ).toBe(true);
  });

  test("pw_process_memory_heap_used_bytes has non-zero value", async ({ request }) => {
    await pollMetrics(request, (t) => {
      const v = parseMetricValue(
        t,
        /pw_process_memory_heap_used_bytes\{[^}]*\}\s+([\d.]+)/,
      );
      return !isNaN(v) && v > 0;
    }).toBe(true);
  });

  test("pw_os_memory_free_bytes gauge is exported", async ({ request }) => {
    await pollMetrics(request, (t) =>
      t.includes("pw_os_memory_free_bytes"),
    ).toBe(true);
  });

  test("pw_process_cpu_user_microseconds gauge is exported", async ({ request }) => {
    await pollMetrics(request, (t) =>
      t.includes("pw_process_cpu_user_microseconds"),
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Custom metric verification (worker fixtures: useCounter / useHistogram / etc.)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("OTel reporter — custom metric verification (worker fixtures)", () => {
  /**
   * useCounter — e2e_api_requests
   *
   * sample.spec.ts adds:
   *   add(1, { endpoint: '/users',  method: 'GET'  })
   *   add(1, { endpoint: '/orders', method: 'GET'  })
   *   add(1, { endpoint: '/orders', method: 'POST' })
   *
   * Expected Prometheus metric: e2e_api_requests_total
   * (name already ends with the unit "requests", so no unit suffix is added;
   *  _total is added by the Prometheus exporter for counters)
   */
  test("useCounter → e2e_api_requests_total is exported", async ({ request }) => {
    await pollMetrics(request, (t) =>
      t.includes("e2e_api_requests_total"),
    ).toBe(true);
  });

  test("useCounter → e2e_api_requests_total has endpoint labels for all three calls", async ({
    request,
  }) => {
    await pollMetrics(
      request,
      (t) =>
        t.includes("e2e_api_requests_total") &&
        t.includes('endpoint="/users"') &&
        t.includes('endpoint="/orders"'),
    ).toBe(true);
  });

  test("useCounter → e2e_api_requests_total has method labels GET and POST", async ({
    request,
  }) => {
    await pollMetrics(
      request,
      (t) =>
        t.includes("e2e_api_requests_total") &&
        t.includes('method="GET"') &&
        t.includes('method="POST"'),
    ).toBe(true);
  });

  test("useCounter → e2e_api_requests_total{endpoint='/users'} value is ≥ 1", async ({
    request,
  }) => {
    await pollMetrics(request, (t) => {
      const v = parseMetricValue(
        t,
        /e2e_api_requests_total\{[^}]*endpoint="\/users"[^}]*\}\s+([\d.]+)/,
      );
      return !isNaN(v) && v >= 1;
    }).toBe(true);
  });

  /**
   * useHistogram — e2e_page_load_ms
   *
   * sample.spec.ts records:
   *   120 ms  { route: '/home' }
   *   340 ms  { route: '/dashboard' }
   *   85  ms  { route: '/login' }
   *
   * Expected Prometheus metric: e2e_page_load_ms_milliseconds_bucket/sum/count
   * ("ms" maps to "milliseconds" in the unit table; name does not end with
   *  "milliseconds" so the suffix IS appended)
   */
  test("useHistogram → e2e_page_load_ms_milliseconds_bucket is exported", async ({
    request,
  }) => {
    await pollMetrics(request, (t) =>
      t.includes("e2e_page_load_ms_milliseconds_bucket"),
    ).toBe(true);
  });

  test("useHistogram → e2e_page_load_ms_milliseconds has route labels for all three routes", async ({
    request,
  }) => {
    await pollMetrics(
      request,
      (t) =>
        t.includes("e2e_page_load_ms_milliseconds") &&
        t.includes('route="/home"') &&
        t.includes('route="/dashboard"') &&
        t.includes('route="/login"'),
    ).toBe(true);
  });

  test("useHistogram → e2e_page_load_ms_milliseconds_sum{route='/home'} is ≥ 120", async ({
    request,
  }) => {
    // 120 ms recorded for /home; value accumulates across runs so >= 120 is safe
    await pollMetrics(request, (t) => {
      const v = parseMetricValue(
        t,
        /e2e_page_load_ms_milliseconds_sum\{[^}]*route="\/home"[^}]*\}\s+([\d.]+)/,
      );
      return !isNaN(v) && v >= 120;
    }).toBe(true);
  });

  test("useHistogram → e2e_page_load_ms_milliseconds_count{route='/dashboard'} is ≥ 1", async ({
    request,
  }) => {
    await pollMetrics(request, (t) => {
      const v = parseMetricValue(
        t,
        /e2e_page_load_ms_milliseconds_count\{[^}]*route="\/dashboard"[^}]*\}\s+([\d.]+)/,
      );
      return !isNaN(v) && v >= 1;
    }).toBe(true);
  });

  /**
   * useUpDownCounter — e2e_requests_in_flight
   *
   * sample.spec.ts does:  add(3)  add(-1)  →  net value = 2
   *
   * Maps to a Prometheus Gauge (UpDownCounter → Gauge in OTel→Prometheus).
   * No unit was specified, so the metric name has no suffix.
   */
  test("useUpDownCounter → e2e_requests_in_flight gauge is exported", async ({
    request,
  }) => {
    await pollMetrics(request, (t) =>
      t.includes("e2e_requests_in_flight"),
    ).toBe(true);
  });

  /**
   * Symbol.dispose / using — e2e_symbol_dispose_counter
   *
   * sample.spec.ts inside a `using` block:
   *   add(10)  add(20)  →  total = 30
   *
   * Expected: e2e_symbol_dispose_counter_total ≥ 30
   */
  test("using keyword → e2e_symbol_dispose_counter_total is exported", async ({
    request,
  }) => {
    await pollMetrics(request, (t) =>
      t.includes("e2e_symbol_dispose_counter_total"),
    ).toBe(true);
  });

  test("using keyword → e2e_symbol_dispose_counter_total value is ≥ 30", async ({
    request,
  }) => {
    // add(10) + add(20) = 30 per run; cumulative across runs, so >= 30 is safe
    await pollMetrics(request, (t) => {
      const v = parseMetricValue(
        t,
        /e2e_symbol_dispose_counter_total\{[^}]*\}\s+([\d.]+)/,
      );
      return !isNaN(v) && v >= 30;
    }).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Interactive UIs (smoke check + helpful console output)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("OTel reporter — interactive UIs", () => {
  test("Jaeger UI is accessible", async ({ request }) => {
    const resp = await request.get(`${JAEGER_BASE}/`);
    expect(resp.ok()).toBeTruthy();
    console.log("  Jaeger UI → http://localhost:16686");
    console.log("    Select service: playwright → Find Traces");
  });

  test("Prometheus UI is accessible", async ({ request }) => {
    const resp = await request.get("http://localhost:9090/-/ready");
    expect(resp.ok()).toBeTruthy();
    console.log("  Prometheus UI → http://localhost:9090");
    console.log("    Try query: pw_tests_total");
  });

  test("Grafana UI is accessible", async ({ request }) => {
    const resp = await request.get("http://localhost:3000/api/health");
    expect(resp.ok()).toBeTruthy();
    console.log("  Grafana UI → http://localhost:3000");
    console.log("    Dashboard: Playwright OTel — Base");
    console.log("    Explore → Prometheus: pw_tests_total");
    console.log("    Explore → Jaeger: service=playwright");
  });
});
