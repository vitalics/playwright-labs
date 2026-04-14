import { test, expect } from "@playwright/test";

/**
 * Simple example tests.
 * After the run, the email reporter sends a report using PlaywrightReportEmail.
 *
 * To receive the email locally, start Maildev first:
 *   docker run -p 1080:1080 -p 1025:1025 maildev/maildev
 *   open http://localhost:1080
 *
 * Then run:
 *   pnpm test
 */

test.describe("Math", () => {
  test("addition", () => {
    expect(1 + 1).toBe(2);
  });

  test("subtraction", () => {
    expect(10 - 4).toBe(6);
  });

  test("multiplication", () => {
    expect(3 * 7).toBe(21);
  });

  test("division", () => {
    expect(20 / 4).toBe(5);
  });
});

test.describe("String", () => {
  test("concatenation", () => {
    expect("hello" + " " + "world").toBe("hello world");
  });

  test("toUpperCase", () => {
    expect("playwright".toUpperCase()).toBe("PLAYWRIGHT");
  });

  test("includes", () => {
    expect("email reporter").toContain("reporter");
  });
});

test.describe("Array", () => {
  test("length", () => {
    expect([1, 2, 3]).toHaveLength(3);
  });

  test("includes value", () => {
    expect([1, 2, 3]).toContain(2);
  });
});
