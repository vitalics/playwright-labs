import { test, expect } from "@playwright/test";
import { Counter, Histogram, DEFAULT_BUCKETS } from "../src/index";

function captureStdoutWrites(fn: () => void): string[] {
  const originalWrite = process.stdout.write;
  const writes: string[] = [];
  process.stdout.write = ((chunk: unknown) => {
    writes.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  try {
    fn();
    return writes;
  } finally {
    process.stdout.write = originalWrite;
  }
}

/** Parses newline-delimited stdout writes back into events. */
function parseEvents(writes: string[]) {
  return writes
    .flatMap((write) => write.split("\n"))
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));
}

function lastValue(counter: Counter): number {
  return counter._getSeries().samples.at(-1)!.value;
}

function bucketValue(histogram: Histogram, le: string): number {
  const bucket = histogram.buckets.find(
    (counter) => counter._getSeries().labels.le === le,
  );
  expect(bucket, `bucket le="${le}" should exist`).toBeDefined();
  return lastValue(bucket!);
}

test.describe("Histogram — constructor", () => {
  test("throws when name is missing", () => {
    expect(() => new Histogram({} as { name: string })).toThrow(
      `"name" property for metadata is required`,
    );
  });

  test("throws for empty buckets", () => {
    expect(() => new Histogram({ name: "h", buckets: [] })).toThrow(
      `"buckets" must be a non-empty array of finite numbers in strictly ascending order`,
    );
  });

  test("throws for non-finite bucket bounds", () => {
    expect(() => new Histogram({ name: "h", buckets: [0.1, Infinity] })).toThrow(
      `"buckets" must be a non-empty array of finite numbers in strictly ascending order`,
    );
    expect(() => new Histogram({ name: "h", buckets: [NaN, 1] })).toThrow(
      `"buckets" must be a non-empty array of finite numbers in strictly ascending order`,
    );
  });

  test("throws when bucket bounds are not strictly ascending", () => {
    expect(() => new Histogram({ name: "h", buckets: [1, 0.5] })).toThrow(
      `"buckets" must be a non-empty array of finite numbers in strictly ascending order`,
    );
    expect(() => new Histogram({ name: "h", buckets: [0.5, 0.5, 1] })).toThrow(
      `"buckets" must be a non-empty array of finite numbers in strictly ascending order`,
    );
  });

  test("creates bucket/sum/count series with the default buckets", () => {
    const histogram = new Histogram({ name: "http_duration" });

    expect(histogram.buckets).toHaveLength(DEFAULT_BUCKETS.length + 1);
    for (const counter of histogram.buckets) {
      expect(counter).toBeInstanceOf(Counter);
      expect(counter._getSeries().labels.__name__).toBe("http_duration_bucket");
    }
    expect(histogram.buckets.map((c) => c._getSeries().labels.le)).toEqual([
      ...DEFAULT_BUCKETS.map(String),
      "+Inf",
    ]);
    expect(histogram.sum._getSeries().labels.__name__).toBe("http_duration_sum");
    expect(histogram.count._getSeries().labels.__name__).toBe(
      "http_duration_count",
    );
  });

  test("respects custom buckets", () => {
    const histogram = new Histogram({ name: "latency", buckets: [0.1, 0.5, 1] });

    expect(histogram.buckets.map((c) => c._getSeries().labels.le)).toEqual([
      "0.1",
      "0.5",
      "1",
      "+Inf",
    ]);
  });

  test("spreads extra metadata labels onto every child series", () => {
    const histogram = new Histogram({
      name: "labeled_histogram",
      buckets: [1],
      job: "e2e",
      browser: "chromium",
    });

    const children = [...histogram.buckets, histogram.sum, histogram.count];
    for (const counter of children) {
      expect(counter._getSeries().labels.job).toBe("e2e");
      expect(counter._getSeries().labels.browser).toBe("chromium");
    }
  });
});

test.describe("Histogram — observe()", () => {
  test("increments only buckets whose bound is >= value, cumulatively", () => {
    const histogram = new Histogram({ name: "observe_histogram" });

    histogram.observe(0.3);

    expect(bucketValue(histogram, "0.005")).toBe(0);
    expect(bucketValue(histogram, "0.05")).toBe(0);
    expect(bucketValue(histogram, "0.1")).toBe(0);
    expect(bucketValue(histogram, "0.25")).toBe(0);
    expect(bucketValue(histogram, "0.5")).toBe(1);
    expect(bucketValue(histogram, "1")).toBe(1);
    expect(bucketValue(histogram, "10")).toBe(1);
    expect(bucketValue(histogram, "+Inf")).toBe(1);

    histogram.observe(0.7);

    // buckets are cumulative — the first observation stays counted
    expect(bucketValue(histogram, "0.5")).toBe(1);
    expect(bucketValue(histogram, "1")).toBe(2);
    expect(bucketValue(histogram, "+Inf")).toBe(2);
  });

  test("a value above every finite bound lands only in the +Inf bucket", () => {
    const histogram = new Histogram({ name: "overflow_histogram" });

    histogram.observe(1000);

    for (const bound of DEFAULT_BUCKETS) {
      expect(bucketValue(histogram, String(bound))).toBe(0);
    }
    expect(bucketValue(histogram, "+Inf")).toBe(1);
  });

  test("sum and count track the observations", () => {
    const histogram = new Histogram({ name: "sum_count_histogram" });

    histogram.observe(0.3).observe(0.2).observe(1.5);

    expect(lastValue(histogram.count)).toBe(3);
    expect(lastValue(histogram.sum)).toBeCloseTo(2);
  });

  test("observe() returns the histogram for chaining", () => {
    const histogram = new Histogram({ name: "chain_histogram" });
    expect(histogram.observe(1)).toBe(histogram);
  });
});

test.describe("Histogram — collect()", () => {
  test("writes one newline-delimited JSON event per non-pristine child", () => {
    const histogram = new Histogram({
      name: "collect_histogram",
      buckets: [0.5, 1],
    });
    histogram.observe(0.7);

    const writes = captureStdoutWrites(() => histogram.collect());
    const events = parseEvents(writes);

    // first flush: every child had at least its constructor sample pending —
    // 3 bucket counters (0.5, 1, +Inf) + sum + count
    expect(events).toHaveLength(5);
    for (const event of events) {
      expect(event.name).toBe("prometheus-remote-writer");
    }
    expect(writes.every((write) => write.endsWith("\n"))).toBe(true);

    const names = events.map((event) => event.payload.labels.__name__);
    expect(names.sort()).toEqual([
      "collect_histogram_bucket",
      "collect_histogram_bucket",
      "collect_histogram_bucket",
      "collect_histogram_count",
      "collect_histogram_sum",
    ]);

    const bucketEvents = events.filter(
      (event) => event.payload.labels.__name__ === "collect_histogram_bucket",
    );
    const byLe = Object.fromEntries(
      bucketEvents.map((event) => [
        event.payload.labels.le,
        event.payload.samples.at(-1).value,
      ]),
    );
    expect(byLe).toEqual({ "0.5": 0, "1": 1, "+Inf": 1 });
  });

  test("second collect() without new observations writes nothing", () => {
    const histogram = new Histogram({ name: "drain_histogram" });
    histogram.observe(1);

    const firstWrites = captureStdoutWrites(() => histogram.collect());
    const secondWrites = captureStdoutWrites(() => histogram.collect());

    expect(firstWrites.length).toBeGreaterThan(0);
    expect(secondWrites).toHaveLength(0);
  });

  test("after a flush only children with new samples emit events", () => {
    const histogram = new Histogram({
      name: "partial_histogram",
      buckets: [0.5, 1],
    });
    captureStdoutWrites(() => histogram.collect());

    histogram.observe(0.7); // hits le="1", le="+Inf", sum and count
    const writes = captureStdoutWrites(() => histogram.collect());
    const events = parseEvents(writes);

    expect(events).toHaveLength(4);
    const bucketLes = events
      .filter(
        (event) => event.payload.labels.__name__ === "partial_histogram_bucket",
      )
      .map((event) => event.payload.labels.le);
    expect(bucketLes.sort()).toEqual(["+Inf", "1"]);
    const names = events.map((event) => event.payload.labels.__name__);
    expect(names).toContain("partial_histogram_sum");
    expect(names).toContain("partial_histogram_count");
  });
});

test.describe("Histogram — reset() and Symbol.dispose", () => {
  test("reset() returns a fresh Histogram with the same metadata and buckets", () => {
    const histogram = new Histogram({
      name: "reset_histogram",
      buckets: [0.5, 1],
      job: "e2e",
    });
    histogram.observe(0.7);

    const fresh = histogram.reset();

    expect(fresh).not.toBe(histogram);
    expect(fresh).toBeInstanceOf(Histogram);
    expect(fresh.buckets.map((c) => c._getSeries().labels.le)).toEqual([
      "0.5",
      "1",
      "+Inf",
    ]);
    expect(fresh.buckets[0]._getSeries().labels.job).toBe("e2e");
    expect(lastValue(fresh.count)).toBe(0);
    expect(lastValue(fresh.sum)).toBe(0);
    // original instance is unchanged
    expect(lastValue(histogram.count)).toBe(1);
    expect(lastValue(histogram.sum)).toBe(0.7);
  });

  test("Symbol.dispose collects pending samples", () => {
    const histogram = new Histogram({
      name: "dispose_histogram",
      buckets: [1],
    });
    histogram.observe(0.5);

    const writes = captureStdoutWrites(() => histogram[Symbol.dispose]());
    const events = parseEvents(writes);

    expect(events.length).toBeGreaterThan(0);
    const count = events.find(
      (event) => event.payload.labels.__name__ === "dispose_histogram_count",
    );
    expect(count.payload.samples.at(-1).value).toBe(1);
  });
});
