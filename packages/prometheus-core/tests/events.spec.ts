import { test, expect } from "@playwright/test";
import { Event } from "../src/index";

test.describe("Event", () => {
  test("constructor defaults name to the event name", () => {
    const payload = { labels: { __name__: "x" }, samples: [] };
    const event = new Event(payload);
    expect(event.name).toBe("prometheus-remote-writer");
    expect(event.payload).toBe(payload);
  });
});

test.describe("Event.is", () => {
  test("returns true for a valid event shape", () => {
    expect(
      Event.is({
        name: "prometheus-remote-writer",
        payload: { labels: { __name__: "x" }, samples: [] },
      }),
    ).toBe(true);
  });

  test("returns false for null", () => {
    expect(Event.is(null)).toBe(false);
  });

  test("returns false for a wrong name", () => {
    expect(Event.is({ name: "something-else", payload: {} })).toBe(false);
  });

  test("returns false for a missing payload", () => {
    expect(Event.is({ name: "prometheus-remote-writer" })).toBe(false);
  });

  test("returns false for non-objects", () => {
    expect(Event.is(undefined)).toBe(false);
    expect(Event.is("prometheus-remote-writer")).toBe(false);
    expect(Event.is(42)).toBe(false);
    expect(Event.is(true)).toBe(false);
  });
});
