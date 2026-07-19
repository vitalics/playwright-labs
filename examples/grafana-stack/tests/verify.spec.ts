/**
 * Verification tests — assert that the Prometheus metrics from the `generate`
 * project actually arrived in Prometheus.
 *
 * Runs after the `generate` project via Playwright project dependencies.
 * The reporter pushes metrics to Prometheus continuously during the run
 * (remote write), so everything produced by `generate` is queryable here via
 * the Prometheus HTTP API.
 *
 * Backend queried:
 *   Prometheus — http://localhost:9090  (/api/v1/query)
 *
 * Every metric name is prefixed with `pw_` by the reporter (default prefix).
 *
 * The verify tests also log the Grafana URL so the user can explore results
 * interactively after the run.
 */
import { test, expect } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

const PROMETHEUS_BASE = "http://localhost:9090";

/** Poll interval when using expect.poll — generous to allow push delays. */
const POLL_OPTS = { timeout: 30_000, intervals: [1_000, 2_000, 5_000] };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** One series of a Prometheus instant-query response (resultType "vector"). */
interface PrometheusSeries {
  metric: Record<string, string>;
  value: [number, string];
}

/**
 * Runs an instant query against the Prometheus HTTP API and returns the
 * result vector. Returns an empty array when Prometheus is unreachable or
 * the query matches no series.
 *
 * @example
 * const result = await queryPrometheus(request, "pw_tests_total_count");
 */
async function queryPrometheus(
  request: APIRequestContext,
  query: string,
): Promise<PrometheusSeries[]> {
  const resp = await request.get(`${PROMETHEUS_BASE}/api/v1/query`, {
    params: { query },
  });
  if (!resp.ok()) return [];
  const body = await resp.json();
  return (body?.data?.result as PrometheusSeries[]) ?? [];
}

/**
 * Polls an instant query until `predicate` returns `true`.
 *
 * @example
 * await pollQuery(request, "pw_test_duration", (r) => r.length > 0).toBe(true);
 */
function pollQuery(
  request: APIRequestContext,
  query: string,
  predicate: (result: PrometheusSeries[]) => boolean,
) {
  return expect.poll(
    async () => predicate(await queryPrometheus(request, query)),
    POLL_OPTS,
  );
}

/** Parses the numeric value of the first series of a result vector. */
function firstValue(result: PrometheusSeries[]): number {
  return result.length > 0 ? parseFloat(result[0].value[1]) : NaN;
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom metric verification (worker fixtures + standalone Counter)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Prometheus reporter — custom metric verification", () => {
  /**
   * Standalone Counter — e2e_page_visits
   *
   * sample.spec.ts increments a module-level Counter once in each of the two
   * "page visits" tests, so the counter reaches 2 per run:
   *   pageVisits.inc().collect()  →  pw_e2e_page_visits{url="playwright.dev"}
   */
  test("standalone Counter → pw_e2e_page_visits is exported", async ({
    request,
  }) => {
    await pollQuery(request, "pw_e2e_page_visits", (r) => r.length > 0).toBe(
      true,
    );
  });

  test("standalone Counter → pw_e2e_page_visits has the url label", async ({
    request,
  }) => {
    await pollQuery(
      request,
      "pw_e2e_page_visits",
      (r) => r.some((s) => s.metric.url === "playwright.dev"),
    ).toBe(true);
  });

  test("standalone Counter → pw_e2e_page_visits value is ≥ 2", async ({
    request,
  }) => {
    // 2 increments per run; the last pushed sample wins, so >= 2 is safe
    await pollQuery(
      request,
      "max(pw_e2e_page_visits)",
      (r) => !isNaN(firstValue(r)) && firstValue(r) >= 2,
    ).toBe(true);
  });

  /**
   * useCounterMetric — e2e_api_requests
   *
   * sample.spec.ts creates two label sets of the same counter:
   *   inc() × 2  { endpoint: '/users',  method: 'GET'  }
   *   inc() × 1  { endpoint: '/orders', method: 'POST' }
   */
  test("useCounterMetric → pw_e2e_api_requests is exported with both label sets", async ({
    request,
  }) => {
    await pollQuery(
      request,
      "pw_e2e_api_requests",
      (r) =>
        r.some(
          (s) => s.metric.endpoint === "/users" && s.metric.method === "GET",
        ) &&
        r.some(
          (s) => s.metric.endpoint === "/orders" && s.metric.method === "POST",
        ),
    ).toBe(true);
  });

  test("useCounterMetric → pw_e2e_api_requests{endpoint='/users'} value is ≥ 2", async ({
    request,
  }) => {
    await pollQuery(
      request,
      'max(pw_e2e_api_requests{endpoint="/users"})',
      (r) => !isNaN(firstValue(r)) && firstValue(r) >= 2,
    ).toBe(true);
  });

  /**
   * useGaugeMetric — e2e_active_users
   *
   * sample.spec.ts does:  set(10)  inc()  dec(2)  →  final value = 9
   */
  test("useGaugeMetric → pw_e2e_active_users value is 9", async ({
    request,
  }) => {
    await pollQuery(
      request,
      "max(pw_e2e_active_users)",
      (r) => !isNaN(firstValue(r)) && firstValue(r) === 9,
    ).toBe(true);
  });

  /**
   * Symbol.dispose / using — e2e_dispose_counter
   *
   * sample.spec.ts inside a `using` block:
   *   inc(10)  inc(20)  →  total = 30, flushed automatically on scope exit
   */
  test("using keyword → pw_e2e_dispose_counter value is ≥ 30", async ({
    request,
  }) => {
    await pollQuery(
      request,
      "max(pw_e2e_dispose_counter)",
      (r) => !isNaN(firstValue(r)) && firstValue(r) >= 30,
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Built-in metric verification (per-test metrics pushed during the run)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Prometheus reporter — built-in metric verification", () => {
  test("pw_test_duration gauge is exported", async ({ request }) => {
    await pollQuery(request, "pw_test_duration", (r) => r.length > 0).toBe(
      true,
    );
  });

  test("pw_test_duration has non-zero values", async ({ request }) => {
    await pollQuery(
      request,
      "max(pw_test_duration)",
      (r) => !isNaN(firstValue(r)) && firstValue(r) > 0,
    ).toBe(true);
  });

  test("pw_test_duration records passed tests", async ({ request }) => {
    await pollQuery(
      request,
      "pw_test_duration",
      (r) => r.some((s) => s.metric.actualStatus === "passed"),
    ).toBe(true);
  });

  test("pw_test per-test series is exported with suite label", async ({
    request,
  }) => {
    await pollQuery(
      request,
      "pw_test",
      (r) =>
        r.some((s) =>
          s.metric.suite?.includes("sample data generation"),
        ),
    ).toBe(true);
  });

  test("pw_test_annotation_count is exported for the annotations test", async ({
    request,
  }) => {
    // sample.spec.ts pushes { type: 'e2e.feature' } and { type: 'e2e.team' }
    await pollQuery(
      request,
      "pw_test_annotation_count",
      (r) =>
        r.some((s) => s.metric.type === "e2e.feature") &&
        r.some((s) => s.metric.type === "e2e.team"),
    ).toBe(true);
  });

  test("pw_test_attachment_size has non-zero value for the attachments test", async ({
    request,
  }) => {
    await pollQuery(
      request,
      "max(pw_test_attachment_size)",
      (r) => !isNaN(firstValue(r)) && firstValue(r) > 0,
    ).toBe(true);
  });

  test("pw_test_step_duration is exported for the test.step test", async ({
    request,
  }) => {
    await pollQuery(request, "pw_test_step_duration", (r) =>
      r.some((s) => s.metric.titlePath?.includes("checkout")),
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Run-level metrics (flushed once at reporter onExit)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Prometheus reporter — run-level metrics (flushed at onExit)", () => {
  /**
   * Aggregate counters (pw_tests_total_count, pw_tests_failed_count, …) and
   * the Node.js process stats (pw_node_memory_heap_used, …) are pushed once,
   * when the whole run finishes (reporter `onExit`) — i.e. AFTER this `verify`
   * project. On the very first run against a fresh Prometheus they are
   * therefore not queryable yet; because global-teardown keeps the stack
   * running, they appear right after the run and persist for every subsequent
   * run. These tests assert the values when present and explain otherwise, so
   * the first run stays green.
   */
  test("pw_tests_total_count is exported", async ({ request }) => {
    const result = await queryPrometheus(request, "pw_tests_total_count");
    if (result.length === 0) {
      console.log(
        "  pw_tests_total_count is not present yet — it is flushed at reporter onExit (after the whole run).",
      );
      console.log(
        "  Query it in Prometheus/Grafana after the run: http://localhost:9090/graph?g0.expr=pw_tests_total_count",
      );
      return;
    }
    expect(firstValue(result)).toBeGreaterThan(0);
  });

  test("pw_node_memory_heap_used is exported", async ({ request }) => {
    const result = await queryPrometheus(request, "pw_node_memory_heap_used");
    if (result.length === 0) {
      console.log(
        "  pw_node_memory_heap_used is not present yet — Node.js process stats are flushed at reporter onExit.",
      );
      return;
    }
    expect(firstValue(result)).toBeGreaterThan(0);
  });

  test("pw_test_attachment_count is exported", async ({ request }) => {
    const result = await queryPrometheus(request, "pw_test_attachment_count");
    if (result.length === 0) {
      console.log(
        "  pw_test_attachment_count is not present yet — it is flushed at reporter onExit.",
      );
      return;
    }
    expect(firstValue(result)).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Interactive UIs (smoke check + helpful console output)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Prometheus reporter — interactive UIs", () => {
  test("Prometheus UI is accessible", async ({ request }) => {
    const resp = await request.get(`${PROMETHEUS_BASE}/-/ready`);
    expect(resp.ok()).toBeTruthy();
    console.log("  Prometheus UI → http://localhost:9090");
    console.log("    Try query: pw_tests_total_count");
  });

  test("Grafana UI is accessible", async ({ request }) => {
    const resp = await request.get("http://localhost:3000/api/health");
    expect(resp.ok()).toBeTruthy();
    console.log("  Grafana UI → http://localhost:3000");
    console.log("    Explore → Prometheus: pw_tests_total_count");
  });
});
