import { test, expect } from "@playwright/test";
import type { FullResult } from "@playwright/test/reporter";
import { WithTableTemplate } from "../src/templates/with-table";
import type { SlackTestCases } from "../src/types";

const passedRun: FullResult = { status: "passed", duration: 15000, startTime: new Date("2025-04-28T10:00:00Z") };
const failedRun: FullResult = { status: "failed", duration: 22000, startTime: new Date("2025-04-28T10:00:00Z") };

const testCases: SlackTestCases = [
  [
    { id: "t1", title: "test 1", titlePath: () => ["Suite", "test 1"] } as any,
    { status: "passed", duration: 500, errors: [], retry: 0, startTime: new Date(), attachments: [], steps: [], workerIndex: 0, parallelIndex: 0, stderr: [], stdout: [] } as any,
  ],
  [
    { id: "t2", title: "test 2", titlePath: () => ["Suite", "test 2"] } as any,
    { status: "failed", duration: 300, errors: [{ message: "boom" }], retry: 0, startTime: new Date(), attachments: [], steps: [], workerIndex: 0, parallelIndex: 0, stderr: [], stdout: [] } as any,
  ],
];

function markdownBlocks(blocks: any[]) {
  return blocks.filter((b) => b.type === "markdown");
}

function markdownText(blocks: any[]): string {
  return markdownBlocks(blocks).map((b) => b.text).join("\n");
}

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

test.describe("WithTableTemplate — structure", () => {
  test("first block is a header", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: {} });
    expect(blocks[0].type).toBe("header");
  });

  test("last block is always context", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: {} });
    expect(blocks[blocks.length - 1].type).toBe("context");
  });

  test("returns an array of blocks", () => {
    const blocks = WithTableTemplate(failedRun, [], { env: {} });
    expect(Array.isArray(blocks)).toBe(true);
  });

  test("contains a divider block", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: {} });
    expect(blocks.some((b) => b.type === "divider")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

test.describe("WithTableTemplate — header", () => {
  test("shows failure emoji and label for failed run", () => {
    const blocks = WithTableTemplate(failedRun, [], { env: {} });
    expect((blocks[0] as any).text.text).toContain(":x:");
    expect((blocks[0] as any).text.text).toContain("Tests failed");
  });

  test("shows success emoji and label for passed run", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: {} });
    expect((blocks[0] as any).text.text).toContain(":white_check_mark:");
    expect((blocks[0] as any).text.text).toContain("All tests passed");
  });

  test("uses custom projectName in header", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: {}, projectName: "My Suite" });
    expect((blocks[0] as any).text.text).toContain("My Suite");
  });

  test("defaults to 'Playwright' in header", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: {} });
    expect((blocks[0] as any).text.text).toContain("Playwright");
  });
});

// ---------------------------------------------------------------------------
// Run summary
// ---------------------------------------------------------------------------

test.describe("WithTableTemplate — run summary", () => {
  test("shows summary section when showRunSummary is true (default)", () => {
    const blocks = WithTableTemplate(passedRun, testCases, { env: {} });
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    expect(sectionTexts.some((t) => t.includes("Total"))).toBe(true);
  });

  test("hides summary section when showRunSummary is false", () => {
    const blocks = WithTableTemplate(passedRun, testCases, { env: {}, showRunSummary: false });
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    expect(sectionTexts.some((t) => t.includes("Total"))).toBe(false);
  });

  test("no summary section shown when testCases is empty", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: {} });
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    expect(sectionTexts.some((t) => t.includes("Total"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Table title
// ---------------------------------------------------------------------------

test.describe("WithTableTemplate — table title", () => {
  test("shows default 'Environment' title", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: {} });
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    expect(sectionTexts.some((t) => t.includes("Environment"))).toBe(true);
  });

  test("shows custom tableTitle when provided", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: {}, tableTitle: "Build Info" });
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    expect(sectionTexts.some((t) => t.includes("Build Info"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Table content / env vars
// ---------------------------------------------------------------------------

test.describe("WithTableTemplate — env table", () => {
  test("renders a markdown block for env entries", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: { FOO: "bar" } });
    expect(markdownBlocks(blocks).length).toBeGreaterThan(0);
  });

  test("markdown block type is 'markdown'", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: { FOO: "bar" } });
    expect(markdownBlocks(blocks)[0].type).toBe("markdown");
  });

  test("shows key wrapped in backticks", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: { FOO: "bar" } });
    expect(markdownText(blocks)).toContain("`FOO`");
  });

  test("shows value in table row", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: { FOO: "bar" } });
    expect(markdownText(blocks)).toContain("bar");
  });

  test("renders '_empty_' for empty string values", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: { EMPTY: "" } });
    expect(markdownText(blocks)).toContain("_empty_");
  });

  test("omits undefined values from table", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: { UNDEF: undefined, FOO: "bar" } });
    const text = markdownText(blocks);
    expect(text).not.toContain("`UNDEF`");
    expect(text).toContain("`FOO`");
  });

  test("shows 'No variables provided' message when env is empty", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: {} });
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    expect(sectionTexts.some((t) => t.includes("No variables provided"))).toBe(true);
  });

  test("markdown table has GFM header row", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: { FOO: "bar" } });
    expect(markdownText(blocks)).toContain("| Variable | Value |");
    expect(markdownText(blocks)).toContain("| --- | --- |");
  });
});

// ---------------------------------------------------------------------------
// Chunking (rowsPerChunk)
// ---------------------------------------------------------------------------

test.describe("WithTableTemplate — chunking", () => {
  test("all rows fit in one markdown block for small env", () => {
    const env = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`KEY_${i}`, `val_${i}`]));
    const blocks = WithTableTemplate(passedRun, [], { env });
    expect(markdownBlocks(blocks).length).toBe(1);
  });

  test("splits into multiple markdown blocks when rows exceed rowsPerChunk", () => {
    const env = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`KEY_${i}`, `val_${i}`]));
    const blocks = WithTableTemplate(passedRun, [], { env, rowsPerChunk: 3 });
    expect(markdownBlocks(blocks).length).toBeGreaterThan(1);
  });

  test("each markdown block contains its own GFM table header", () => {
    const env = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`KEY_${i}`, `val_${i}`]));
    const blocks = WithTableTemplate(passedRun, [], { env, rowsPerChunk: 3 });
    for (const block of markdownBlocks(blocks)) {
      expect((block as any).text).toContain("| Variable | Value |");
    }
  });
});

// ---------------------------------------------------------------------------
// Masking
// ---------------------------------------------------------------------------

test.describe("WithTableTemplate — masking", () => {
  test("auto-masks values for sensitive key names (mask: true default)", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: { DB_PASSWORD: "secret123", API_KEY: "tok_abc" } });
    const text = markdownText(blocks);
    expect(text).not.toContain("secret123");
    expect(text).not.toContain("tok_abc");
    expect(text).toContain("••••••••");
  });

  test("does not mask non-sensitive keys by default", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: { CI: "true", NODE_ENV: "production" } });
    const text = markdownText(blocks);
    expect(text).toContain("true");
    expect(text).toContain("production");
  });

  test("mask: false shows all values in plain text", () => {
    const blocks = WithTableTemplate(passedRun, [], {
      env: { API_KEY: "tok_abc", DB_PASS: "s3cr3t" },
      mask: false,
    });
    const text = markdownText(blocks);
    expect(text).toContain("tok_abc");
    expect(text).toContain("s3cr3t");
  });

  test("mask: string[] masks only the listed keys", () => {
    const blocks = WithTableTemplate(passedRun, [], {
      env: { FOO: "visible", BAR: "hidden" },
      mask: ["BAR"],
    });
    const text = markdownText(blocks);
    expect(text).toContain("visible");
    expect(text).not.toContain("hidden");
    expect(text).toContain("••••••••");
  });
});

// ---------------------------------------------------------------------------
// reportUrl button
// ---------------------------------------------------------------------------

test.describe("WithTableTemplate — reportUrl", () => {
  test("no actions block when reportUrl is absent", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: {} });
    expect(blocks.find((b) => b.type === "actions")).toBeUndefined();
  });

  test("actions block present when reportUrl is provided", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: {}, reportUrl: "https://ci.example.com" });
    expect(blocks.find((b) => b.type === "actions")).toBeDefined();
  });

  test("button url matches reportUrl", () => {
    const blocks = WithTableTemplate(passedRun, [], {
      env: {},
      reportUrl: "https://ci.example.com/report",
    });
    const actionsBlock = blocks.find((b) => b.type === "actions") as any;
    const btn = actionsBlock?.elements?.find((el: any) => el.type === "button");
    expect(btn?.url).toBe("https://ci.example.com/report");
  });
});

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

test.describe("WithTableTemplate — context", () => {
  test("context contains projectName", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: {}, projectName: "My Suite" });
    const context = (blocks[blocks.length - 1] as any).elements[0].text;
    expect(context).toContain("My Suite");
  });
});
