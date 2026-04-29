import { test, expect } from "@playwright/test";
import { divider, header, section } from "../src/blocks";
import { render, message } from "../src/render";

const h = header("Test");
const d = divider();
const s = section("Hello");

test.describe("render", () => {
  test("returns empty array for null", () => {
    expect(render(null)).toEqual([]);
  });

  test("returns empty array for undefined", () => {
    expect(render(undefined)).toEqual([]);
  });

  test("returns empty array for false", () => {
    expect(render(false)).toEqual([]);
  });

  test("wraps single block in array", () => {
    const result = render(h);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(h);
  });

  test("returns flat array from array input", () => {
    const result = render([h, d, s]);
    expect(result).toHaveLength(3);
  });

  test("flattens nested arrays", () => {
    const result = render([[h, d], [s]] as any);
    expect(result).toHaveLength(3);
  });
});

test.describe("message", () => {
  test("wraps blocks into message payload", () => {
    const payload = message([h, d]);
    expect(payload.blocks).toHaveLength(2);
    expect(payload.text).toBeUndefined();
  });

  test("merges extra options", () => {
    const payload = message([h], { text: "Fallback", mrkdwn: true });
    expect(payload.text).toBe("Fallback");
    expect(payload.mrkdwn).toBe(true);
    expect(payload.blocks).toHaveLength(1);
  });

  test("handles null blocks", () => {
    const payload = message(null);
    expect(payload.blocks).toEqual([]);
  });
});
