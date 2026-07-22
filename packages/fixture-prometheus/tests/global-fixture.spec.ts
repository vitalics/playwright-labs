import type { TestInfo } from "@playwright/test";
import { Event } from "@playwright-labs/prometheus-core";

import { Counter, Histogram, expect, test } from "../src/index";

// The config enables `fullyParallel`, which would run these tests in separate
// worker processes with separate global registries. These tests depend on
// sharing the module-level registry, so they must run serially in one worker.
test.describe.configure({ mode: "serial" });

/**
 * Decodes a test's attachments back into `prometheus-remote-writer` events.
 * Metric events are transported via `testInfo.attachments` (not stdout), so
 * the transport never pollutes the console output.
 */
function parseEvents(attachments: TestInfo["attachments"]) {
  return attachments
    .map((attachment) => Event.fromAttachment(attachment))
    .filter((event) => event !== null);
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
  let autoflushTestInfo: TestInfo | undefined;

  test("records a sample without calling collect()", async ({
    useGlobalCounter,
  }) => {
    // The flush happens in the fixture teardown, after this body completes,
    // and lands in this test's attachments. Keep a reference to the TestInfo
    // so the next test can assert on it.
    autoflushTestInfo = test.info();
    useGlobalCounter("auto_flush_counter").inc();

    // nothing emitted during the test body itself
    const events = parseEvents(test.info().attachments);
    expect(
      events.some(
        (event) => event.payload.labels.__name__ === "auto_flush_counter",
      ),
    ).toBe(false);
  });

  test("the previous test's teardown flushed the metric to its attachments", () => {
    const events = parseEvents(autoflushTestInfo!.attachments).filter(
      (event) => event.payload.labels.__name__ === "auto_flush_counter",
    );

    expect(events.length).toBeGreaterThan(0);
    expect(events.at(-1)!.payload.samples.at(-1)!.value).toBe(1);
  });
});
