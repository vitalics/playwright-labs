import { Event } from "@playwright-labs/prometheus-core";

import { Counter, Gauge, expect, test } from "../src/index";

test("useCounterMetric returns a Counter with the given name and labels", async ({
  useCounterMetric,
}) => {
  const counter = useCounterMetric("api_requests", { endpoint: "/users" });

  expect(counter).toBeInstanceOf(Counter);
  expect(counter._getSeries().labels.__name__).toBe("api_requests");
  expect(counter._getSeries().labels.endpoint).toBe("/users");
});

test("counter inc() / inc(5) accumulate the counter value", async ({
  useCounterMetric,
}) => {
  const counter = useCounterMetric("api_requests");

  expect(counter._getSeries().samples.at(-1)?.value).toBe(0);

  counter.inc();
  expect(counter._getSeries().samples.at(-1)?.value).toBe(1);

  counter.inc(5);
  expect(counter._getSeries().samples.at(-1)?.value).toBe(6);
});

test("useGaugeMetric returns a Gauge; set/inc/dec/zero work", async ({
  useGaugeMetric,
}) => {
  const gauge = useGaugeMetric("active_users", { region: "us-east" });

  expect(gauge).toBeInstanceOf(Gauge);
  expect(gauge._getSeries().labels.__name__).toBe("active_users");
  expect(gauge._getSeries().labels.region).toBe("us-east");

  gauge.set(10);
  expect(gauge._getSeries().samples.at(-1)?.value).toBe(10);

  gauge.inc();
  expect(gauge._getSeries().samples.at(-1)?.value).toBe(11);

  gauge.dec();
  expect(gauge._getSeries().samples.at(-1)?.value).toBe(10);

  gauge.dec(4);
  expect(gauge._getSeries().samples.at(-1)?.value).toBe(6);

  gauge.zero();
  expect(gauge._getSeries().samples.at(-1)?.value).toBe(0);
});

test("collect() writes a single event to the test's attachments", async ({
  useCounterMetric,
}) => {
  const counter = useCounterMetric("api_requests", { endpoint: "/users" });
  counter.inc();

  const before = test.info().attachments.length;
  counter.collect();

  const events = test
    .info()
    .attachments.slice(before)
    .map((attachment) => Event.fromAttachment(attachment))
    .filter((event) => event !== null);
  expect(events).toHaveLength(1);

  const event = events[0]!;
  expect(event.name).toBe("prometheus-remote-writer");
  expect(event.payload).toBeDefined();
  expect(event.payload.labels.__name__).toBe("api_requests");
  expect(event.payload.labels.endpoint).toBe("/users");
  expect(event.payload.samples.at(-1)!.value).toBe(1);
});
