/** @jsxImportSource @playwright-labs/slack-buildkit/react */
import { test, expect } from "@playwright/test";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import {
  Actions,
  Blocks,
  Button,
  Context,
  Divider,
  Header,
  Section,
} from "@playwright-labs/slack-buildkit/react";
import { render } from "@playwright-labs/slack-buildkit";
import { BaseTemplate } from "../src/templates/base";
import type { SlackTestCases } from "../src/types";

const passed: FullResult = { status: "passed", duration: 8000, startTime: new Date() };
const failed: FullResult = { status: "failed", duration: 8000, startTime: new Date() };

function makeTestCase(
  title: string,
  status: TestResult["status"],
): [TestCase, TestResult] {
  return [
    { id: title, title, titlePath: () => ["Suite", title] } as unknown as TestCase,
    {
      status,
      duration: 400,
      errors: status === "failed" ? [{ message: "Expected true, got false" }] : [],
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

// ---------------------------------------------------------------------------
// BaseTemplate output verified via JSX shape inspection
// ---------------------------------------------------------------------------

test.describe("BaseTemplate output structure", () => {
  test("shape matches expected block types sequence (all passed)", () => {
    const testCases: SlackTestCases = [makeTestCase("login", "passed")];
    const blocks = BaseTemplate(passed, testCases, { projectName: "MyApp" });

    // header → section (stats) → divider → context
    expect(blocks[0].type).toBe("header");
    const sectionTypes = blocks.filter((b) => b.type === "section");
    expect(sectionTypes.length).toBeGreaterThanOrEqual(1);
    expect(blocks[blocks.length - 1].type).toBe("context");
  });

  test("shape with failures includes failed test sections", () => {
    const testCases: SlackTestCases = [
      makeTestCase("test A", "failed"),
      makeTestCase("test B", "passed"),
    ];
    const blocks = BaseTemplate(failed, testCases, {});
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");

    const hasFailedTitle = sectionTexts.some((t) => t.includes("test A"));
    expect(hasFailedTitle).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Custom JSX templates inside reporter context
// ---------------------------------------------------------------------------

test.describe("JSX custom templates", () => {
  function SimpleReport({
    result,
    testCases,
  }: {
    result: FullResult;
    testCases: SlackTestCases;
  }) {
    const passedCount = testCases.filter(([, r]) => r.status === "passed").length;
    const failedCount = testCases.filter(([, r]) => r.status === "failed").length;
    const emoji = result.status === "passed" ? ":white_check_mark:" : ":x:";

    return (
      <Blocks>
        <Header>{`${emoji} Test Results`}</Header>
        <Section>
          {`*Passed:* ${passedCount}   *Failed:* ${failedCount}`}
        </Section>
        <Divider />
        <Context>{`Duration: ${(result.duration / 1000).toFixed(1)}s`}</Context>
      </Blocks>
    );
  }

  test("renders correct block count", () => {
    const testCases: SlackTestCases = [
      makeTestCase("t1", "passed"),
      makeTestCase("t2", "failed"),
    ];
    const blocks = render(<SimpleReport result={failed} testCases={testCases} />);
    expect(blocks).toHaveLength(4);
  });

  test("header contains correct emoji for failed run", () => {
    const blocks = render(<SimpleReport result={failed} testCases={[]} />);
    expect((blocks[0] as any).text.text).toContain(":x:");
  });

  test("header contains correct emoji for passed run", () => {
    const blocks = render(<SimpleReport result={passed} testCases={[]} />);
    expect((blocks[0] as any).text.text).toContain(":white_check_mark:");
  });

  test("section contains counts", () => {
    const testCases: SlackTestCases = [
      makeTestCase("a", "passed"),
      makeTestCase("b", "passed"),
      makeTestCase("c", "failed"),
    ];
    const blocks = render(<SimpleReport result={failed} testCases={testCases} />);
    const sectionText = (blocks[1] as any).text.text;
    expect(sectionText).toContain("2");
    expect(sectionText).toContain("1");
  });

  test("context shows duration", () => {
    const blocks = render(<SimpleReport result={{ ...passed, duration: 12000 }} testCases={[]} />);
    const contextText = (blocks[3] as any).elements[0].text;
    expect(contextText).toContain("12.0s");
  });
});

// ---------------------------------------------------------------------------
// Conditional rendering patterns
// ---------------------------------------------------------------------------

test.describe("JSX conditional rendering in templates", () => {
  function ReportWithOptionalButton({
    reportUrl,
  }: {
    reportUrl?: string;
  }) {
    return (
      <Blocks>
        <Header>Results</Header>
        {reportUrl ? (
          <Actions>
            <Button url={reportUrl} style="primary" action_id="open_report">
              Open Report
            </Button>
          </Actions>
        ) : null}
        <Context>Playwright CI</Context>
      </Blocks>
    );
  }

  test("no actions block when reportUrl is undefined", () => {
    const blocks = render(<ReportWithOptionalButton />);
    expect(blocks.some((b) => b.type === "actions")).toBe(false);
    expect(blocks).toHaveLength(2);
  });

  test("actions block present when reportUrl is provided", () => {
    const blocks = render(
      <ReportWithOptionalButton reportUrl="https://ci.example.com" />,
    );
    expect(blocks.some((b) => b.type === "actions")).toBe(true);
    expect(blocks).toHaveLength(3);
  });

  test("button url is set correctly", () => {
    const blocks = render(
      <ReportWithOptionalButton reportUrl="https://ci.example.com/report" />,
    );
    const actionsBlock = blocks.find((b) => b.type === "actions") as any;
    expect(actionsBlock.elements[0].url).toBe("https://ci.example.com/report");
  });
});

// ---------------------------------------------------------------------------
// List rendering
// ---------------------------------------------------------------------------

test.describe("JSX list rendering", () => {
  function FailedTestList({ tests }: { tests: string[] }) {
    return (
      <Blocks>
        <Header>Failed Tests</Header>
        {tests.map((name) => (
          <Section>{`• \`${name}\``}</Section>
        ))}
        <Context>{`${tests.length} test(s) failed`}</Context>
      </Blocks>
    );
  }

  test("renders one section per failed test", () => {
    const tests = ["login test", "checkout test", "profile update"];
    const blocks = render(<FailedTestList tests={tests} />);

    const sections = blocks.filter((b) => b.type === "section");
    expect(sections).toHaveLength(3);
    expect((sections[0] as any).text.text).toContain("login test");
    expect((sections[2] as any).text.text).toContain("profile update");
  });

  test("renders empty list correctly", () => {
    const blocks = render(<FailedTestList tests={[]} />);
    const sections = blocks.filter((b) => b.type === "section");
    expect(sections).toHaveLength(0);
  });
});
