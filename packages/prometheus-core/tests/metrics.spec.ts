import { test, expect } from "@playwright/test";
import { Counter, Gauge } from "../src/index";

test.describe("Counter", () => {
  test("constructor throws when name is missing", () => {
    expect(() => new Counter({} as { name: string })).toThrow(
      `"name" property for metadata is required`,
    );
  });

  test("initial sample value is 0", () => {
    const counter = new Counter({ name: "initial_counter" });
    expect(counter._getSeries().samples[0].value).toBe(0);
  });

  test("respects custom initial value", () => {
    const counter = new Counter({ name: "custom_counter" }, 10);
    expect(counter._getSeries().samples[0].value).toBe(10);
  });

  test("inc() increments by 1 and appends a sample", () => {
    const counter = new Counter({ name: "inc_counter" });
    counter.inc();
    const samples = counter._getSeries().samples;
    expect(samples).toHaveLength(2);
    expect(samples[1].value).toBe(1);
  });

  test("inc(5) increments by 5 and appends samples with increasing values", () => {
    const counter = new Counter({ name: "inc5_counter" });
    counter.inc().inc(5);
    const samples = counter._getSeries().samples;
    expect(samples).toHaveLength(3);
    expect(samples.map((s) => s.value)).toEqual([0, 1, 6]);
  });

  test("labels() merges extra labels into the series", () => {
    const counter = new Counter({ name: "labels_counter" });
    counter.labels({ endpoint: "/users", method: "GET" });
    expect(counter._getSeries().labels).toEqual({
      __name__: "labels_counter",
      endpoint: "/users",
      method: "GET",
    });
  });

  test("metadata labels from constructor land in the series labels", () => {
    const counter = new Counter({
      name: "meta_counter",
      job: "e2e",
      browser: "chromium",
    });
    expect(counter._getSeries().labels).toEqual({
      __name__: "meta_counter",
      job: "e2e",
      browser: "chromium",
    });
  });

  test("reset() returns a fresh Counter with the initial value", () => {
    const counter = new Counter({ name: "reset_counter" }, 3);
    counter.inc(10);

    const fresh = counter.reset();

    expect(fresh).not.toBe(counter);
    expect(fresh).toBeInstanceOf(Counter);
    expect(fresh._getSeries().samples[0].value).toBe(3);
    // Original instance is unchanged
    expect(counter._getSeries().samples.map((s) => s.value)).toEqual([3, 13]);
  });
});

test.describe("Gauge", () => {
  test("dec() decrements by 1", () => {
    const gauge = new Gauge({ name: "dec_gauge" }, 5);
    gauge.dec();
    const samples = gauge._getSeries().samples;
    expect(samples[samples.length - 1].value).toBe(4);
  });

  test("dec(3) decrements by 3", () => {
    const gauge = new Gauge({ name: "dec3_gauge" }, 5);
    gauge.dec(3);
    const samples = gauge._getSeries().samples;
    expect(samples[samples.length - 1].value).toBe(2);
  });

  test("set() sets the value", () => {
    const gauge = new Gauge({ name: "set_gauge" });
    gauge.set(42);
    const samples = gauge._getSeries().samples;
    expect(samples[samples.length - 1].value).toBe(42);
  });

  test("zero() sets the value to 0", () => {
    const gauge = new Gauge({ name: "zero_gauge" }, 7);
    gauge.zero();
    const samples = gauge._getSeries().samples;
    expect(samples[samples.length - 1].value).toBe(0);
  });
});

test.describe("collect()", () => {
  test("writes a JSON event to stdout", () => {
    const originalWrite = process.stdout.write;
    const writes: string[] = [];
    process.stdout.write = ((chunk: unknown) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      const counter = new Counter({ name: "collect_counter" });
      counter.inc();
      counter.collect();

      expect(writes).toHaveLength(1);
      const parsed = JSON.parse(writes[0]);
      expect(parsed).toEqual({
        name: "prometheus-remote-writer",
        payload: counter._getSeries(),
      });
    } finally {
      process.stdout.write = originalWrite;
    }
  });
});

test.describe("Symbol.dispose", () => {
  test("collects and resets", () => {
    const originalWrite = process.stdout.write;
    const writes: string[] = [];
    process.stdout.write = ((chunk: unknown) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      const counter = new Counter({ name: "dispose_counter" });
      counter.inc(2);

      counter[Symbol.dispose]();

      // collect() was called with the series as it was at disposal time
      expect(writes).toHaveLength(1);
      const parsed = JSON.parse(writes[0]);
      expect(parsed.name).toBe("prometheus-remote-writer");
      expect(parsed.payload.samples.map((s: { value: number }) => s.value)).toEqual([0, 2]);
      // reset() returns a fresh instance — the disposed one is left intact
      expect(counter._getSeries().samples.map((s) => s.value)).toEqual([0, 2]);
    } finally {
      process.stdout.write = originalWrite;
    }
  });
});


test.describe("sample timestamps", () => {
  test("are strictly increasing even for same-millisecond increments", () => {
    const counter = new Counter({ name: "ts_counter" });
    for (let i = 0; i < 10; i++) {
      counter.inc();
    }
    const timestamps = counter._getSeries().samples.map((s) => s.timestamp);
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
    }
  });

  test("gauge operations keep timestamps strictly increasing", () => {
    const gauge = new Gauge({ name: "ts_gauge" });
    gauge.set(10).inc().dec(2).zero();
    const timestamps = gauge._getSeries().samples.map((s) => s.timestamp);
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
    }
  });
});

test.describe("collect() draining", () => {
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

  test("second collect() without new samples writes nothing", () => {
    const counter = new Counter({ name: "drain_counter" });
    counter.inc();
    const firstWrites = captureStdoutWrites(() => counter.collect());
    const secondWrites = captureStdoutWrites(() => counter.collect());

    expect(firstWrites).toHaveLength(1);
    expect(secondWrites).toHaveLength(0);
  });

  test("collect() flushes only the samples recorded since the previous collect()", () => {
    const counter = new Counter({ name: "drain_counter_2" });
    counter.inc();
    captureStdoutWrites(() => counter.collect());

    counter.inc().inc();
    const writes = captureStdoutWrites(() => counter.collect());

    expect(writes).toHaveLength(1);
    const parsed = JSON.parse(writes[0]);
    // only the two new samples — the already-collected history is not resent
    expect(parsed.payload.samples).toHaveLength(2);
    expect(parsed.payload.samples.map((s: { value: number }) => s.value)).toEqual([2, 3]);
  });

  test("_hasPendingSamples() tracks the drain state", () => {
    const counter = new Counter({ name: "drain_counter_3" });
    expect(counter._hasPendingSamples()).toBe(true); // constructor sample
    captureStdoutWrites(() => counter.collect());
    expect(counter._hasPendingSamples()).toBe(false);
    counter.inc();
    expect(counter._hasPendingSamples()).toBe(true);
  });

  test("_drainSeries() returns a snapshot — later labels() calls do not leak into it", () => {
    const counter = new Counter({ name: "drain_counter_4" });
    counter.inc();
    const drained = counter._drainSeries();
    counter.labels({ stage: "after" });

    expect(drained.labels.stage).toBeUndefined();
    expect(drained.samples).toHaveLength(2);
    expect(counter._hasPendingSamples()).toBe(false);
  });
});
