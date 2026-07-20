import {
  OtelEvent,
  type MetricPayload,
} from "@playwright-labs/otel-core";

import { test, expect, Counter, Histogram } from "../src/index";

// The global-metrics registry is per worker, and these tests rely on state
// carried across tests — serial mode keeps the whole file in one worker,
// running tests in declaration order (the config sets fullyParallel: true).
test.describe.configure({ mode: "serial" });

/** Captures every chunk written to `process.stdout` until the returned restore function is called. */
function spyOnStdout(buffer: string[]): () => void {
  const original = process.stdout.write;
  process.stdout.write = function (
    chunk: unknown,
    ...rest: unknown[]
  ): boolean {
    buffer.push(String(chunk));
    return (original as (...args: unknown[]) => boolean).call(
      process.stdout,
      chunk,
      ...rest,
    );
  } as typeof process.stdout.write;
  return () => {
    process.stdout.write = original;
  };
}

/** Decodes all captured stdout chunks into metric events for `name`. */
function metricEvents(writes: string[], name: string): MetricPayload[] {
  return writes
    .map((chunk) => OtelEvent.parse(chunk))
    .filter(
      (p): p is MetricPayload => p?.kind === "metric" && p.name === name,
    );
}

// ── useGlobalCounter — shared instance ────────────────────────────────────────

let sharedCounter: Counter | undefined;

test.describe("useGlobalCounter", () => {
  test("first test creates the shared instance", ({ useGlobalCounter }) => {
    const counter = useGlobalCounter("gm_url_calls", { unit: "requests" });
    sharedCounter = counter;
    counter.add(1, { url: "/home" });
    expect(counter).toHaveOtelCallCount(1);
  });

  test("second test returns the same instance with accumulated values", ({
    useGlobalCounter,
  }) => {
    const counter = useGlobalCounter("gm_url_calls");
    expect(counter).toBe(sharedCounter);
    counter.add(1, { url: "/dashboard" });
    // callCount is a lifetime counter — values accumulate across tests.
    expect(counter).toHaveOtelCallCount(2);
  });

  test("options are ignored after first creation", ({ useGlobalCounter }) => {
    const first = useGlobalCounter("gm_options", {
      unit: "requests",
      description: "applies",
    });
    const second = useGlobalCounter("gm_options", {
      unit: "bytes",
      description: "ignored",
    });
    expect(second).toBe(first);
  });
});

// ── Auto-flush at fixture teardown ────────────────────────────────────────────

const autoflushWrites: string[] = [];
let restoreStdout: (() => void) | undefined;

test.describe("useGlobalCounter — auto-flush", () => {
  test("records a data point without calling collect()", ({
    useGlobalCounter,
  }) => {
    // The spy must outlive this test body: the fixture teardown (which
    // triggers the flush) runs after the body completes. It is restored in
    // the next test.
    restoreStdout = spyOnStdout(autoflushWrites);
    const counter = useGlobalCounter("gm_autoflush");
    counter.add(1, { url: "/auto" });
    // No manual collect() — the teardown flush is what we are proving.
  });

  test("teardown of the previous test flushed the data point to stdout", () => {
    try {
      const events = metricEvents(autoflushWrites, "gm_autoflush");
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("counter");
      expect(events[0].dataPoints).toEqual([
        { value: 1, attributes: { url: "/auto" } },
      ]);
    } finally {
      restoreStdout?.();
    }
  });
});

// ── useGlobalHistogram — shared instance ──────────────────────────────────────

let sharedHistogram: Histogram | undefined;

test.describe("useGlobalHistogram", () => {
  test("first test creates the shared instance", ({ useGlobalHistogram }) => {
    const histogram = useGlobalHistogram("gm_page_load", { unit: "ms" });
    sharedHistogram = histogram;
    histogram.record(120, { route: "/dashboard" });
    expect(histogram).toHaveOtelCallCount(1);
  });

  test("second test returns the same instance with accumulated values", ({
    useGlobalHistogram,
  }) => {
    const histogram = useGlobalHistogram("gm_page_load");
    expect(histogram).toBe(sharedHistogram);
    histogram.record(340, { route: "/users" });
    expect(histogram).toHaveOtelCallCount(2);
  });
});

// ── Kind collision ────────────────────────────────────────────────────────────

test.describe("global metrics — kind collision", () => {
  test("requesting a registered counter name as a histogram throws", ({
    useGlobalCounter,
    useGlobalHistogram,
  }) => {
    useGlobalCounter("gm_collision");
    expect(() => useGlobalHistogram("gm_collision")).toThrow(
      'Global metric "gm_collision" is already registered as a counter',
    );
  });

  test("requesting a registered histogram name as a counter throws", ({
    useGlobalCounter,
    useGlobalHistogram,
  }) => {
    useGlobalHistogram("gm_collision_reverse");
    expect(() => useGlobalCounter("gm_collision_reverse")).toThrow(
      'Global metric "gm_collision_reverse" is already registered as a histogram',
    );
  });
});

// ── Manual collect() ──────────────────────────────────────────────────────────

test.describe("global metrics — manual collect()", () => {
  test("collect() drains; a second collect() emits nothing", ({
    useGlobalCounter,
  }) => {
    const writes: string[] = [];
    const restore = spyOnStdout(writes);
    try {
      const counter = useGlobalCounter("gm_manual_collect");
      counter.add(1);
      counter.collect();
      expect(metricEvents(writes, "gm_manual_collect")).toHaveLength(1);

      // No new data since the last flush — no new event is written.
      counter.collect();
      expect(metricEvents(writes, "gm_manual_collect")).toHaveLength(1);

      counter.add(2);
      counter.collect();
      const events = metricEvents(writes, "gm_manual_collect");
      expect(events).toHaveLength(2);
      expect(events[1].dataPoints).toEqual([{ value: 2 }]);
      expect(counter).toHaveOtelCallCount(2);
    } finally {
      restore();
    }
  });
});
