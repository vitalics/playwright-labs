import { test, expect } from "@playwright/test";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import { BaseTemplate } from "../src/templates/base";
import type { SlackTestCases } from "../src/types";

const passed: FullResult = { status: "passed", duration: 10000, startTime: new Date() };
const failed: FullResult = { status: "failed", duration: 10000, startTime: new Date() };

function makeTestCase(
  title: string,
  status: TestResult["status"],
  errorMsg?: string,
): [TestCase, TestResult] {
  return [
    {
      id: title,
      title,
      titlePath: () => ["Suite", title],
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

test.describe("BaseTemplate", () => {
  test("returns an array of blocks", () => {
    const blocks = BaseTemplate(passed, [], {});
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBeGreaterThan(0);
  });

  test("first block is a header", () => {
    const blocks = BaseTemplate(passed, [], {});
    expect(blocks[0].type).toBe("header");
  });

  test("header includes status emoji and project name", () => {
    const blocks = BaseTemplate(passed, [], { projectName: "My App" });
    const headerBlock = blocks[0] as any;
    expect(headerBlock.text.text).toContain("My App");
    expect(headerBlock.text.text).toContain(":white_check_mark:");
  });

  test("uses 'Playwright' as default project name", () => {
    const blocks = BaseTemplate(passed, [], {});
    const headerBlock = blocks[0] as any;
    expect(headerBlock.text.text).toContain("Playwright");
  });

  test("failed status shows failure emoji in header", () => {
    const blocks = BaseTemplate(failed, [], {});
    const headerBlock = blocks[0] as any;
    expect(headerBlock.text.text).toContain(":x:");
  });

  test("section contains pass/fail/skip counts", () => {
    const testCases: SlackTestCases = [
      makeTestCase("t1", "passed"),
      makeTestCase("t2", "passed"),
      makeTestCase("t3", "failed"),
      makeTestCase("t4", "skipped"),
    ];
    const blocks = BaseTemplate(passed, testCases, {});
    const sectionText = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "")
      .join("\n");

    expect(sectionText).toContain("4");
    expect(sectionText).toContain("2");
    expect(sectionText).toContain("1");
  });

  test("failed tests section is absent when all pass", () => {
    const testCases: SlackTestCases = [
      makeTestCase("t1", "passed"),
      makeTestCase("t2", "passed"),
    ];
    const blocks = BaseTemplate(passed, testCases, {});
    const texts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");

    const hasFailedSection = texts.some((t) => t.includes("Failed tests"));
    expect(hasFailedSection).toBe(false);
  });

  test("failed tests section lists failed test titles", () => {
    const testCases: SlackTestCases = [
      makeTestCase("login test", "failed", "Expected true to be false"),
      makeTestCase("other test", "passed"),
    ];
    const blocks = BaseTemplate(failed, testCases, {});
    const texts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "")
      .join("\n");

    expect(texts).toContain("login test");
  });

  test("caps failed tests display at 10", () => {
    const testCases: SlackTestCases = Array.from({ length: 15 }, (_, i) =>
      makeTestCase(`test-${i}`, "failed"),
    );
    const blocks = BaseTemplate(failed, testCases, {});
    const failedSections = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "")
      .filter((t) => t.startsWith("•"));

    expect(failedSections.length).toBeLessThanOrEqual(10);
  });

  test("actions block with View Report button is added when reportUrl is given", () => {
    const blocks = BaseTemplate(passed, [], { reportUrl: "https://ci.example.com/report" });
    const actionsBlock = blocks.find((b) => b.type === "actions") as any;
    expect(actionsBlock).toBeDefined();
    expect(actionsBlock.elements[0].url).toBe("https://ci.example.com/report");
    expect(actionsBlock.elements[0].text.text).toBe("View Report");
  });

  test("no actions block when reportUrl is absent", () => {
    const blocks = BaseTemplate(passed, [], {});
    const hasActions = blocks.some((b) => b.type === "actions");
    expect(hasActions).toBe(false);
  });

  test("last block is always a context with timestamp", () => {
    const blocks = BaseTemplate(passed, [], {});
    const last = blocks[blocks.length - 1] as any;
    expect(last.type).toBe("context");
    expect(last.elements[0].text).toContain("Playwright test runner");
  });
});
