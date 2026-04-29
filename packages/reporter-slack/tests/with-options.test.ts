import { test, expect } from "@playwright/test";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import { WithOptionsTemplate } from "../src/templates/with-options";
import type { SlackTestCases } from "../src/types";

const passedRun: FullResult = { status: "passed", duration: 15000, startTime: new Date("2025-04-28T10:00:00Z") };
const failedRun: FullResult = { status: "failed", duration: 22000, startTime: new Date("2025-04-28T10:00:00Z") };

function makeTestCase(
  title: string,
  suite: string,
  status: TestResult["status"],
  errorMsg?: string,
): [TestCase, TestResult] {
  return [
    {
      id: `${suite}-${title}`,
      title,
      titlePath: () => [suite, title],
    } as unknown as TestCase,
    {
      status,
      duration: 500,
      errors: errorMsg ? [{ message: errorMsg }] : [],
      retry: 0,
      startTime: new Date(),
      attachments: [],
      steps: [],
      workerIndex: 0,
      parallelIndex: 0,
      stderr: [],
      stdout: [],
    } as unknown as TestResult,
  ];
}

const mixedCases: SlackTestCases = [
  makeTestCase("login", "Auth", "passed"),
  makeTestCase("logout", "Auth", "passed"),
  makeTestCase("signup fails on invalid email", "Auth", "failed", "Expected element to be visible"),
  makeTestCase("add to cart", "Shop", "failed", "TimeoutError: locator not found"),
  makeTestCase("checkout flow", "Shop", "skipped"),
  makeTestCase("payment timeout", "Shop", "timedOut", "Test exceeded 30000ms timeout"),
];

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

test.describe("WithOptionsTemplate — structure", () => {
  test("first block is a header", () => {
    const blocks = WithOptionsTemplate(failedRun, mixedCases);
    expect(blocks[0].type).toBe("header");
  });

  test("last block is always context", () => {
    const blocks = WithOptionsTemplate(passedRun, mixedCases);
    expect(blocks[blocks.length - 1].type).toBe("context");
  });

  test("second block is section with total and duration", () => {
    const blocks = WithOptionsTemplate(failedRun, mixedCases);
    const text = (blocks[1] as any).text?.text ?? "";
    expect(text).toContain("6");
    expect(text).toContain("s");
  });

  test("returns array of blocks", () => {
    const blocks = WithOptionsTemplate(passedRun, []);
    expect(Array.isArray(blocks)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Header content
// ---------------------------------------------------------------------------

test.describe("WithOptionsTemplate — header", () => {
  test("failed run shows failure emoji and label", () => {
    const blocks = WithOptionsTemplate(failedRun, []);
    expect((blocks[0] as any).text.text).toContain(":x:");
    expect((blocks[0] as any).text.text).toContain("Tests failed");
  });

  test("passed run shows success emoji and label", () => {
    const blocks = WithOptionsTemplate(passedRun, []);
    expect((blocks[0] as any).text.text).toContain(":white_check_mark:");
    expect((blocks[0] as any).text.text).toContain("All tests passed");
  });

  test("uses custom projectName in header", () => {
    const blocks = WithOptionsTemplate(failedRun, [], { projectName: "My Suite" });
    expect((blocks[0] as any).text.text).toContain("My Suite");
  });

  test("defaults to 'Playwright' when projectName is omitted", () => {
    const blocks = WithOptionsTemplate(failedRun, []);
    expect((blocks[0] as any).text.text).toContain("Playwright");
  });
});

// ---------------------------------------------------------------------------
// Status groups
// ---------------------------------------------------------------------------

test.describe("WithOptionsTemplate — status groups", () => {
  test("renders a section for each present status", () => {
    const blocks = WithOptionsTemplate(failedRun, mixedCases);
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");

    expect(sectionTexts.some((t) => t.includes("Failed"))).toBe(true);
    expect(sectionTexts.some((t) => t.includes("Passed"))).toBe(true);
    expect(sectionTexts.some((t) => t.includes("Skipped"))).toBe(true);
    expect(sectionTexts.some((t) => t.includes("Timed out"))).toBe(true);
  });

  test("failed group header shows count", () => {
    const blocks = WithOptionsTemplate(failedRun, mixedCases);
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    const failedHeader = sectionTexts.find((t) => t.includes("Failed") && t.includes("2"));
    expect(failedHeader).toBeDefined();
  });

  test("failed test names are listed", () => {
    const blocks = WithOptionsTemplate(failedRun, mixedCases);
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "")
      .join("\n");
    expect(sectionTexts).toContain("signup fails on invalid email");
    expect(sectionTexts).toContain("add to cart");
  });

  test("error message appears under failed test name", () => {
    const blocks = WithOptionsTemplate(failedRun, mixedCases);
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "")
      .join("\n");
    expect(sectionTexts).toContain("Expected element to be visible");
  });

  test("passed test names are listed when showTestNames is true", () => {
    const blocks = WithOptionsTemplate(passedRun, mixedCases);
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "")
      .join("\n");
    expect(sectionTexts).toContain("login");
    expect(sectionTexts).toContain("logout");
  });

  test("groups absent when no tests have that status", () => {
    const onlyPassed: SlackTestCases = [makeTestCase("test", "Suite", "passed")];
    const blocks = WithOptionsTemplate(passedRun, onlyPassed);
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    expect(sectionTexts.some((t) => t.includes("Failed"))).toBe(false);
    expect(sectionTexts.some((t) => t.includes("Skipped"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// show option — hide specific statuses
// ---------------------------------------------------------------------------

test.describe("WithOptionsTemplate — show option", () => {
  test("show.passed: false hides passed group", () => {
    const blocks = WithOptionsTemplate(failedRun, mixedCases, { show: { passed: false } });
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    expect(sectionTexts.some((t) => t.includes("Passed"))).toBe(false);
  });

  test("show.failed: false hides failed group", () => {
    const blocks = WithOptionsTemplate(failedRun, mixedCases, { show: { failed: false } });
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    expect(sectionTexts.some((t) => t.includes("Failed") && t.includes("2"))).toBe(false);
  });

  test("show.skipped: false hides skipped group", () => {
    const blocks = WithOptionsTemplate(failedRun, mixedCases, { show: { skipped: false } });
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    expect(sectionTexts.some((t) => t.includes("Skipped"))).toBe(false);
  });

  test("all statuses visible when show option is omitted", () => {
    const blocks = WithOptionsTemplate(failedRun, mixedCases);
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    expect(sectionTexts.some((t) => t.includes("Failed"))).toBe(true);
    expect(sectionTexts.some((t) => t.includes("Passed"))).toBe(true);
    expect(sectionTexts.some((t) => t.includes("Skipped"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// maxPerStatus option
// ---------------------------------------------------------------------------

test.describe("WithOptionsTemplate — maxPerStatus", () => {
  test("caps test names at maxPerStatus", () => {
    const many: SlackTestCases = Array.from({ length: 15 }, (_, i) =>
      makeTestCase(`test-${i}`, "Suite", "failed", "err"),
    );
    const blocks = WithOptionsTemplate(failedRun, many, { maxPerStatus: 5 });
    const bulletSections = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "")
      .filter((t) => t.startsWith("•"));
    expect(bulletSections.length).toBeLessThanOrEqual(5);
  });

  test("shows overflow notice when tests exceed maxPerStatus", () => {
    const many: SlackTestCases = Array.from({ length: 12 }, (_, i) =>
      makeTestCase(`test-${i}`, "Suite", "failed", "err"),
    );
    const blocks = WithOptionsTemplate(failedRun, many, { maxPerStatus: 5 });
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "")
      .join("\n");
    expect(sectionTexts).toContain("and 7 more");
  });

  test("no overflow notice when tests fit within maxPerStatus", () => {
    const few: SlackTestCases = [makeTestCase("only", "Suite", "failed", "err")];
    const blocks = WithOptionsTemplate(failedRun, few, { maxPerStatus: 5 });
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "")
      .join("\n");
    expect(sectionTexts).not.toContain("more");
  });
});

// ---------------------------------------------------------------------------
// showTestNames option
// ---------------------------------------------------------------------------

test.describe("WithOptionsTemplate — showTestNames", () => {
  test("showTestNames: false shows only group headers, no bullet items", () => {
    const blocks = WithOptionsTemplate(failedRun, mixedCases, { showTestNames: false });
    const bulletSections = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "")
      .filter((t) => t.startsWith("•"));
    expect(bulletSections).toHaveLength(0);
  });

  test("showTestNames: true (default) lists individual tests", () => {
    const blocks = WithOptionsTemplate(failedRun, mixedCases);
    const bulletSections = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "")
      .filter((t) => t.startsWith("•"));
    expect(bulletSections.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// reportUrl / View Full Report button
// ---------------------------------------------------------------------------

test.describe("WithOptionsTemplate — reportUrl", () => {
  test("actions block always present (contains status filter select)", () => {
    const blocks = WithOptionsTemplate(failedRun, []);
    const actionsBlock = blocks.find((b) => b.type === "actions") as any;
    expect(actionsBlock).toBeDefined();
    expect(actionsBlock.elements[0].type).toBe("static_select");
  });

  test("button added as second element in actions when reportUrl is provided", () => {
    const blocks = WithOptionsTemplate(failedRun, [], {
      reportUrl: "https://ci.example.com/report",
    });
    const actionsBlock = blocks.find((b) => b.type === "actions") as any;
    expect(actionsBlock).toBeDefined();
    const btn = actionsBlock.elements.find((el: any) => el.type === "button");
    expect(btn).toBeDefined();
    expect(btn.url).toBe("https://ci.example.com/report");
    expect(btn.text.text).toBe("View Full Report");
  });

  test("no button in actions when reportUrl is absent", () => {
    const blocks = WithOptionsTemplate(failedRun, []);
    const actionsBlock = blocks.find((b) => b.type === "actions") as any;
    const btn = actionsBlock.elements.find((el: any) => el.type === "button");
    expect(btn).toBeUndefined();
  });
});
