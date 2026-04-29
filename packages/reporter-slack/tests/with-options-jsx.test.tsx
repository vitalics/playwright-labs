/** @jsxImportSource @playwright-labs/slack-buildkit/react */
import { test, expect } from "@playwright/test";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import { render } from "@playwright-labs/slack-buildkit";
import {
  Actions,
  Blocks,
  Button,
  Context,
  Divider,
  Header,
  Section,
} from "@playwright-labs/slack-buildkit/react";
import { WithOptionsTemplate } from "../src/templates/with-options";
import type { SlackTestCases, WithOptionsTemplateOptions } from "../src/index";

const failedRun: FullResult = { status: "failed", duration: 30000, startTime: new Date("2025-04-28T12:00:00Z") };
const passedRun: FullResult = { status: "passed", duration: 18000, startTime: new Date("2025-04-28T12:00:00Z") };

function makeCase(
  title: string,
  suite: string,
  status: TestResult["status"],
  errorMsg?: string,
): [TestCase, TestResult] {
  return [
    { id: title, title, titlePath: () => [suite, title] } as unknown as TestCase,
    {
      status,
      duration: 600,
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
  makeCase("login works", "Auth", "passed"),
  makeCase("logout works", "Auth", "passed"),
  makeCase("forgot password", "Auth", "failed", "Expected button to be enabled"),
  makeCase("add to cart", "Shop", "failed", "Locator timeout after 5000ms"),
  makeCase("apply coupon", "Shop", "skipped"),
];

// ---------------------------------------------------------------------------
// Equivalent JSX template — mirrors WithOptionsTemplate manually
// ---------------------------------------------------------------------------

function CustomStatusReport({
  result,
  testCases,
  options = {},
}: {
  result: FullResult;
  testCases: SlackTestCases;
  options?: WithOptionsTemplateOptions;
}) {
  const { projectName = "Playwright", reportUrl, showTestNames = true, maxPerStatus = 10 } = options;

  const failed = testCases.filter(([, r]) => r.status === "failed");
  const passed = testCases.filter(([, r]) => r.status === "passed");
  const skipped = testCases.filter(([, r]) => r.status === "skipped");
  const emoji = result.status === "passed" ? ":white_check_mark:" : ":x:";

  return (
    <Blocks>
      <Header>{`${emoji} ${projectName} — ${result.status === "passed" ? "All tests passed" : "Tests failed"}`}</Header>

      <Section>{`*Total:* ${testCases.length}   *Duration:* ${(result.duration / 1000).toFixed(1)}s`}</Section>

      {failed.length > 0 && (
        <>
          <Divider />
          <Section>{`:x: *Failed* — ${failed.length} test${failed.length !== 1 ? "s" : ""}`}</Section>
          {showTestNames &&
            failed.slice(0, maxPerStatus).map(([test, r]) => {
              const err = r.errors?.[0]?.message?.split("\n")[0] ?? "";
              return (
                <Section>
                  {`• \`${test.titlePath().slice(1).join(" › ")}\`${err ? `\n  _${err}_` : ""}`}
                </Section>
              );
            })}
        </>
      )}

      {skipped.length > 0 && (
        <>
          <Divider />
          <Section>{`:fast_forward: *Skipped* — ${skipped.length} test${skipped.length !== 1 ? "s" : ""}`}</Section>
        </>
      )}

      {passed.length > 0 && (
        <>
          <Divider />
          <Section>{`:white_check_mark: *Passed* — ${passed.length} test${passed.length !== 1 ? "s" : ""}`}</Section>
          {showTestNames &&
            passed.slice(0, maxPerStatus).map(([test]) => (
              <Section>{`• \`${test.titlePath().slice(1).join(" › ")}\``}</Section>
            ))}
        </>
      )}

      {reportUrl && (
        <>
          <Divider />
          <Actions>
            <Button url={reportUrl} style="primary" action_id="view_report">
              View Full Report
            </Button>
          </Actions>
        </>
      )}

      <Divider />
      <Context>{`${projectName} • ${new Date().toUTCString()}`}</Context>
    </Blocks>
  );
}

// ---------------------------------------------------------------------------
// JSX template structure tests
// ---------------------------------------------------------------------------

test.describe("WithOptionsTemplate via JSX — structure", () => {
  test("produces correct block sequence for failed run with mixed cases", () => {
    const blocks = render(
      <CustomStatusReport result={failedRun} testCases={mixedCases} />,
    );
    expect(blocks[0].type).toBe("header");
    expect(blocks[1].type).toBe("section");
    expect(blocks[blocks.length - 1].type).toBe("context");
  });

  test("header has failure emoji for failed run", () => {
    const blocks = render(<CustomStatusReport result={failedRun} testCases={[]} />);
    expect((blocks[0] as any).text.text).toContain(":x:");
  });

  test("header has success emoji for passed run", () => {
    const blocks = render(<CustomStatusReport result={passedRun} testCases={[]} />);
    expect((blocks[0] as any).text.text).toContain(":white_check_mark:");
  });

  test("summary section contains total count and duration", () => {
    const blocks = render(<CustomStatusReport result={failedRun} testCases={mixedCases} />);
    const summary = (blocks[1] as any).text.text;
    expect(summary).toContain(String(mixedCases.length));
    expect(summary).toContain("s");
  });
});

test.describe("WithOptionsTemplate via JSX — status groups", () => {
  test("failed group section is present", () => {
    const blocks = render(<CustomStatusReport result={failedRun} testCases={mixedCases} />);
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    expect(sectionTexts.some((t) => t.includes("Failed"))).toBe(true);
  });

  test("passed group section is present", () => {
    const blocks = render(<CustomStatusReport result={failedRun} testCases={mixedCases} />);
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    expect(sectionTexts.some((t) => t.includes("Passed"))).toBe(true);
  });

  test("skipped group section is present", () => {
    const blocks = render(<CustomStatusReport result={failedRun} testCases={mixedCases} />);
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    expect(sectionTexts.some((t) => t.includes("Skipped"))).toBe(true);
  });

  test("failed test names appear as bullet sections", () => {
    const blocks = render(<CustomStatusReport result={failedRun} testCases={mixedCases} />);
    const bullets = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "")
      .filter((t) => t.startsWith("•"));
    expect(bullets.some((t) => t.includes("forgot password"))).toBe(true);
    expect(bullets.some((t) => t.includes("add to cart"))).toBe(true);
  });

  test("error messages appear under failed test bullets", () => {
    const blocks = render(<CustomStatusReport result={failedRun} testCases={mixedCases} />);
    const allText = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "")
      .join("\n");
    expect(allText).toContain("Expected button to be enabled");
    expect(allText).toContain("Locator timeout");
  });

  test("no failed group when all tests pass", () => {
    const allPassed: SlackTestCases = [
      makeCase("t1", "S", "passed"),
      makeCase("t2", "S", "passed"),
    ];
    const blocks = render(<CustomStatusReport result={passedRun} testCases={allPassed} />);
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    expect(sectionTexts.some((t) => t.includes("Failed"))).toBe(false);
  });
});

test.describe("WithOptionsTemplate via JSX — options", () => {
  test("showTestNames: false hides bullet sections", () => {
    const blocks = render(
      <CustomStatusReport
        result={failedRun}
        testCases={mixedCases}
        options={{ showTestNames: false }}
      />,
    );
    const bullets = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "")
      .filter((t) => t.startsWith("•"));
    expect(bullets).toHaveLength(0);
  });

  test("maxPerStatus caps listed test names", () => {
    const many: SlackTestCases = Array.from({ length: 8 }, (_, i) =>
      makeCase(`test-${i}`, "Suite", "failed", "err"),
    );
    const blocks = render(
      <CustomStatusReport result={failedRun} testCases={many} options={{ maxPerStatus: 3 }} />,
    );
    const bullets = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "")
      .filter((t) => t.startsWith("•"));
    expect(bullets.length).toBeLessThanOrEqual(3);
  });

  test("reportUrl adds button to actions block", () => {
    const blocks = render(
      <CustomStatusReport
        result={failedRun}
        testCases={[]}
        options={{ reportUrl: "https://ci.example.com" }}
      />,
    );
    const actionsBlock = blocks.find((b) => b.type === "actions") as any;
    expect(actionsBlock).toBeDefined();
    const btn = actionsBlock?.elements.find((el: any) => el.type === "button");
    expect(btn?.url).toBe("https://ci.example.com");
  });

  test("no button in actions without reportUrl", () => {
    const blocks = render(<CustomStatusReport result={failedRun} testCases={[]} />);
    const actionsBlock = blocks.find((b) => b.type === "actions") as any;
    const btn = actionsBlock?.elements?.find((el: any) => el.type === "button");
    expect(btn).toBeUndefined();
  });

  test("custom projectName appears in header and context", () => {
    const blocks = render(
      <CustomStatusReport
        result={passedRun}
        testCases={[]}
        options={{ projectName: "E2E Suite" }}
      />,
    );
    const header = (blocks[0] as any).text.text;
    const context = (blocks[blocks.length - 1] as any).elements[0].text;
    expect(header).toContain("E2E Suite");
    expect(context).toContain("E2E Suite");
  });
});

// ---------------------------------------------------------------------------
// WithOptionsTemplate function called directly (same as JSX custom above)
// ---------------------------------------------------------------------------

test.describe("WithOptionsTemplate function — via direct call", () => {
  test("renders same structure as JSX equivalent", () => {
    const blocks = WithOptionsTemplate(failedRun, mixedCases, { projectName: "Direct" });
    expect(blocks[0].type).toBe("header");
    expect((blocks[0] as any).text.text).toContain("Direct");
    expect(blocks[blocks.length - 1].type).toBe("context");
  });

  test("show option filters groups correctly", () => {
    const blocks = WithOptionsTemplate(failedRun, mixedCases, {
      show: { passed: false, skipped: false },
    });
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    expect(sectionTexts.some((t) => t.includes("Passed"))).toBe(false);
    expect(sectionTexts.some((t) => t.includes("Skipped"))).toBe(false);
    expect(sectionTexts.some((t) => t.includes("Failed"))).toBe(true);
  });
});
