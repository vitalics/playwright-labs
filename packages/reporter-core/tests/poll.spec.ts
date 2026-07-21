import { test, expect } from "@playwright/test";
import type { TestStep } from "@playwright/test/reporter";

import { isExpectPollStep, getExpectPollInfo } from "../src/index";

function makeStep(overrides: {
  title?: string;
  category?: string;
  error?: boolean;
  children?: TestStep[];
}): TestStep {
  return {
    title: overrides.title ?? "step",
    category: overrides.category ?? "expect",
    error: overrides.error ? { message: "boom" } : undefined,
    steps: overrides.children ?? [],
  } as unknown as TestStep;
}

test.describe("isExpectPollStep", () => {
  test("detects expect.poll by well-known title", () => {
    expect(isExpectPollStep(makeStep({ title: 'Expect "poll toBe"' }))).toBe(
      true,
    );
  });

  test("detects expect().toPass() by title", () => {
    expect(isExpectPollStep(makeStep({ title: 'Expect "toPass"' }))).toBe(true);
  });

  test("detects custom-message polls by expect children", () => {
    const poll = makeStep({
      title: "counter",
      children: [
        makeStep({ title: "counter", error: true }),
        makeStep({ title: "counter" }),
      ],
    });
    expect(isExpectPollStep(poll)).toBe(true);
  });

  test("plain expect step is not a poll", () => {
    expect(isExpectPollStep(makeStep({ title: 'Expect "toBeVisible"' }))).toBe(
      false,
    );
  });

  test("non-expect category is not a poll", () => {
    expect(isExpectPollStep(makeStep({ category: "test.step" }))).toBe(false);
  });

  test("mixed-category children are not a poll", () => {
    const step = makeStep({
      children: [makeStep({ category: "test.step" })],
    });
    expect(isExpectPollStep(step)).toBe(false);
  });
});

test.describe("getExpectPollInfo", () => {
  test("returns null for non-poll steps", () => {
    expect(getExpectPollInfo(makeStep({ title: "x" }))).toBeNull();
  });

  test("counts children as attempts", () => {
    const poll = makeStep({
      title: "counter",
      children: [
        makeStep({ title: "counter", error: true }),
        makeStep({ title: "counter", error: true }),
        makeStep({ title: "counter" }),
      ],
    });
    expect(getExpectPollInfo(poll)).toEqual({ attempts: 3, outcome: "pass" });
  });

  test("toPass without children counts as one attempt", () => {
    expect(getExpectPollInfo(makeStep({ title: 'Expect "toPass"' }))).toEqual({
      attempts: 1,
      outcome: "pass",
    });
  });

  test("step with error reports timeout", () => {
    const poll = makeStep({
      title: 'Expect "poll toBe"',
      error: true,
      children: [makeStep({ error: true })],
    });
    expect(getExpectPollInfo(poll)?.outcome).toBe("timeout");
  });
});
