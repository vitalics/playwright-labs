import { Counter, Histogram, expect, test } from "../src/index";

// The config enables `fullyParallel`, which would run these tests in separate
// worker processes with separate global registries. These tests depend on
// sharing the module-level registry, so they must run serially in one worker.
test.describe.configure({ mode: "serial" });

/**
 * Tests in one spec file run sequentially in the same worker process, so the
 * module-level global metric registry is shared between tests — exactly what
 * these tests rely on.
 *
 * The stdout spy lives for the whole file: global metrics are flushed at
 * fixture teardown, which runs *after* the test body, so a spy created and
 * restored inside a single test would never see the flush.
 */
const stdoutWrites: string[] = [];
let originalWrite: typeof process.stdout.write;

test.beforeAll(() => {
  originalWrite = process.stdout.write;
  process.stdout.write = ((chunk: unknown) => {
    stdoutWrites.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
});

test.afterAll(() => {
  process.stdout.write = originalWrite;
});

/** Parses captured stdout writes back into `prometheus-remote-writer` events. */
function parseEvents(writes: string[]) {
  return writes
    .flatMap((write) => write.split("\n"))
    .filter((line) => line.trim() !== "")
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return undefined;
      }
    })
    .filter((event) => event?.name === "prometheus-remote-writer");
}

test.describe("useGlobalCounter", () => {
  let first: Counter | undefined;

  test("registers a global counter", async ({ useGlobalCounter }) => {
    first = useGlobalCounter("shared_url_calls");
    expect(first).toBeInstanceOf(Counter);

    first.inc();
  });

  test("returns the same instance and keeps the accumulated value", async ({
    useGlobalCounter,
  }) => {
    const second = useGlobalCounter("shared_url_calls");

    expect(second).toBe(first);
    // value from the previous test survived (drain only marks samples as sent)
    expect(second._getSeries().samples.at(-1)?.value).toBe(1);

    second.inc(2);
    expect(second._getSeries().samples.at(-1)?.value).toBe(3);
  });
});

test.describe("useGlobalHistogram", () => {
  let first: Histogram | undefined;

  test("registers a global histogram", async ({ useGlobalHistogram }) => {
    first = useGlobalHistogram("shared_page_load", { buckets: [0.1, 0.5, 1] });
    expect(first).toBeInstanceOf(Histogram);

    first.observe(0.3);
  });

  test("returns the same instance and keeps the observations", async ({
    useGlobalHistogram,
  }) => {
    const second = useGlobalHistogram("shared_page_load");

    expect(second).toBe(first);
    expect(second.count._getSeries().samples.at(-1)?.value).toBe(1);
    expect(second.sum._getSeries().samples.at(-1)?.value).toBeCloseTo(0.3);

    // cumulative buckets: 0.3 fits into 0.5, 1 and +Inf
    const byLe = Object.fromEntries(
      second.buckets.map((counter) => [
        counter._getSeries().labels.le,
        counter._getSeries().samples.at(-1)?.value,
      ]),
    );
    expect(byLe).toEqual({ "0.1": 0, "0.5": 1, "1": 1, "+Inf": 1 });

    second.observe(0.05);
    expect(second.count._getSeries().samples.at(-1)?.value).toBe(2);
  });
});

test.describe("global metric kind collision", () => {
  test("throws when the same name is registered with a different kind", async ({
    useGlobalCounter,
    useGlobalHistogram,
  }) => {
    useGlobalCounter("collision_metric");

    expect(() => useGlobalHistogram("collision_metric")).toThrow(
      `Global metric "collision_metric" is already registered as a counter`,
    );
    expect(() => useGlobalCounter("collision_metric")).not.toThrow();
  });
});

test.describe("global metrics auto-flush", () => {
  test("records a sample without calling collect()", async ({
    useGlobalCounter,
  }) => {
    useGlobalCounter("auto_flush_counter").inc();

    // nothing emitted during the test body itself
    const events = parseEvents(stdoutWrites);
    expect(
      events.some(
        (event) => event.payload.labels.__name__ === "auto_flush_counter",
      ),
    ).toBe(false);
  });

  test("the previous test's teardown flushed the metric to stdout", () => {
    const events = parseEvents(stdoutWrites).filter(
      (event) => event.payload.labels.__name__ === "auto_flush_counter",
    );

    expect(events.length).toBeGreaterThan(0);
    expect(events.at(-1).payload.samples.at(-1).value).toBe(1);
  });
});
