/** @jsxImportSource @playwright-labs/slack-buildkit/react */
import { test, expect } from "@playwright/test";
import type { FullResult } from "@playwright/test/reporter";
import { render } from "@playwright-labs/slack-buildkit";
import {
  Actions,
  Blocks,
  Button,
  Context,
  Divider,
  Header,
  Section,
  Table,
  Td,
  Th,
  Tr,
} from "@playwright-labs/slack-buildkit/react";
import { WithTableTemplate } from "../src/templates/with-table";

const passedRun: FullResult = { status: "passed", duration: 12000, startTime: new Date("2025-04-28T11:00:00Z") };
const failedRun: FullResult = { status: "failed", duration: 25000, startTime: new Date("2025-04-28T11:00:00Z") };

const sampleEnv = {
  CI: "true",
  NODE_ENV: "staging",
  BRANCH: "feature/my-branch",
  DB_PASSWORD: "should-be-masked",
  API_KEY: "also-masked",
};

// ---------------------------------------------------------------------------
// JSX equivalent using the HTML-like Table API
// ---------------------------------------------------------------------------

function EnvTableReport({
  result,
  env,
  projectName = "Playwright",
  reportUrl,
}: {
  result: FullResult;
  env: Record<string, string | undefined>;
  projectName?: string;
  reportUrl?: string;
}) {
  const emoji = result.status === "passed" ? ":white_check_mark:" : ":x:";
  const label = result.status === "passed" ? "All tests passed" : "Tests failed";
  const entries = Object.entries(env).filter((e): e is [string, string] => e[1] !== undefined);

  return (
    <Blocks>
      <Header>{`${emoji} ${projectName} — ${label}`}</Header>
      <Divider />
      <Section>{"*Environment*"}</Section>
      {entries.length === 0 ? (
        <Section>{"_No variables provided._"}</Section>
      ) : (
        <Table>
          <Tr>
            <Th>Variable</Th>
            <Th>Value</Th>
          </Tr>
          {entries.map(([k, v]) => (
            <Tr>
              <Td>{`\`${k}\``}</Td>
              <Td>{v || "_empty_"}</Td>
            </Tr>
          ))}
        </Table>
      )}
      {reportUrl && (
        <>
          <Divider />
          <Actions>
            <Button url={reportUrl} action_id="open_report" style="primary">
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
// Table component unit tests
// ---------------------------------------------------------------------------

test.describe("Table component — output", () => {
  test("renders a markdown block", () => {
    const blocks = render(
      <Table>
        <Tr><Th>Col A</Th><Th>Col B</Th></Tr>
        <Tr><Td>val1</Td><Td>val2</Td></Tr>
      </Table>,
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("markdown");
  });

  test("output contains header row text", () => {
    const blocks = render(
      <Table>
        <Tr><Th>Name</Th><Th>Status</Th></Tr>
        <Tr><Td>login</Td><Td>passed</Td></Tr>
      </Table>,
    );
    expect((blocks[0] as any).text).toContain("| Name | Status |");
  });

  test("output contains GFM separator after header row", () => {
    const blocks = render(
      <Table>
        <Tr><Th>Name</Th><Th>Status</Th></Tr>
        <Tr><Td>login</Td><Td>passed</Td></Tr>
      </Table>,
    );
    expect((blocks[0] as any).text).toContain("| --- | --- |");
  });

  test("output contains data rows", () => {
    const blocks = render(
      <Table>
        <Tr><Th>Name</Th><Th>Status</Th></Tr>
        <Tr><Td>login</Td><Td>passed</Td></Tr>
        <Tr><Td>logout</Td><Td>failed</Td></Tr>
      </Table>,
    );
    const text = (blocks[0] as any).text as string;
    expect(text).toContain("| login | passed |");
    expect(text).toContain("| logout | failed |");
  });

  test("table without Th rows has no separator", () => {
    const blocks = render(
      <Table>
        <Tr><Td>a</Td><Td>b</Td></Tr>
        <Tr><Td>c</Td><Td>d</Td></Tr>
      </Table>,
    );
    expect((blocks[0] as any).text).not.toContain("|---|");
  });

  test("dynamically built rows work correctly", () => {
    const items = [["KEY_1", "val_1"], ["KEY_2", "val_2"]] as [string, string][];
    const blocks = render(
      <Table>
        <Tr><Th>Variable</Th><Th>Value</Th></Tr>
        {items.map(([k, v]) => (
          <Tr><Td>{`\`${k}\``}</Td><Td>{v}</Td></Tr>
        ))}
      </Table>,
    );
    const text = (blocks[0] as any).text as string;
    expect(text).toContain("| `KEY_1` | val_1 |");
    expect(text).toContain("| `KEY_2` | val_2 |");
  });
});

// ---------------------------------------------------------------------------
// JSX template — structural tests
// ---------------------------------------------------------------------------

test.describe("WithTableTemplate via JSX — structure", () => {
  test("first block is header", () => {
    const blocks = render(<EnvTableReport result={passedRun} env={{}} />);
    expect(blocks[0].type).toBe("header");
  });

  test("last block is context", () => {
    const blocks = render(<EnvTableReport result={passedRun} env={{}} />);
    expect(blocks[blocks.length - 1].type).toBe("context");
  });

  test("header shows success emoji for passed run", () => {
    const blocks = render(<EnvTableReport result={passedRun} env={{}} />);
    expect((blocks[0] as any).text.text).toContain(":white_check_mark:");
  });

  test("header shows failure emoji for failed run", () => {
    const blocks = render(<EnvTableReport result={failedRun} env={{}} />);
    expect((blocks[0] as any).text.text).toContain(":x:");
  });

  test("shows no-variables message when env is empty", () => {
    const blocks = render(<EnvTableReport result={passedRun} env={{}} />);
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    expect(sectionTexts.some((t) => t.includes("No variables provided"))).toBe(true);
  });

  test("renders a markdown block for non-empty env", () => {
    const blocks = render(<EnvTableReport result={passedRun} env={{ FOO: "bar" }} />);
    const mdBlock = blocks.find((b) => b.type === "markdown") as any;
    expect(mdBlock).toBeDefined();
    expect(mdBlock.text).toContain("`FOO`");
    expect(mdBlock.text).toContain("bar");
  });

  test("markdown block contains GFM table header and separator", () => {
    const blocks = render(<EnvTableReport result={passedRun} env={{ FOO: "bar" }} />);
    const mdBlock = blocks.find((b) => b.type === "markdown") as any;
    expect(mdBlock.text).toContain("| Variable | Value |");
    expect(mdBlock.text).toContain("| --- | --- |");
  });
});

test.describe("WithTableTemplate via JSX — report button", () => {
  test("no actions block when reportUrl absent", () => {
    const blocks = render(<EnvTableReport result={passedRun} env={{}} />);
    expect(blocks.find((b) => b.type === "actions")).toBeUndefined();
  });

  test("actions block present when reportUrl provided", () => {
    const blocks = render(
      <EnvTableReport result={passedRun} env={{}} reportUrl="https://ci.example.com" />,
    );
    expect(blocks.find((b) => b.type === "actions")).toBeDefined();
  });

  test("button url matches reportUrl", () => {
    const blocks = render(
      <EnvTableReport result={passedRun} env={{}} reportUrl="https://ci.example.com/42" />,
    );
    const actions = blocks.find((b) => b.type === "actions") as any;
    const btn = actions?.elements?.find((el: any) => el.type === "button");
    expect(btn?.url).toBe("https://ci.example.com/42");
  });
});

test.describe("WithTableTemplate via JSX — custom projectName", () => {
  test("header contains custom projectName", () => {
    const blocks = render(<EnvTableReport result={passedRun} env={{}} projectName="E2E Suite" />);
    expect((blocks[0] as any).text.text).toContain("E2E Suite");
  });

  test("context contains custom projectName", () => {
    const blocks = render(<EnvTableReport result={passedRun} env={{}} projectName="E2E Suite" />);
    const context = (blocks[blocks.length - 1] as any).elements[0].text;
    expect(context).toContain("E2E Suite");
  });
});

// ---------------------------------------------------------------------------
// WithTableTemplate function — direct call tests
// ---------------------------------------------------------------------------

test.describe("WithTableTemplate function — direct call", () => {
  test("renders header + markdown block + context", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: { CI: "true" }, projectName: "Direct" });
    expect(blocks[0].type).toBe("header");
    expect((blocks[0] as any).text.text).toContain("Direct");
    expect(blocks.some((b) => b.type === "markdown")).toBe(true);
    expect(blocks[blocks.length - 1].type).toBe("context");
  });

  test("masks sensitive env vars by default", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: sampleEnv });
    const text = blocks
      .filter((b) => b.type === "markdown")
      .map((b) => (b as any).text)
      .join("\n");
    expect(text).not.toContain("should-be-masked");
    expect(text).not.toContain("also-masked");
    expect(text).toContain("••••••••");
  });

  test("non-sensitive values are visible", () => {
    const blocks = WithTableTemplate(passedRun, [], { env: sampleEnv });
    const text = blocks
      .filter((b) => b.type === "markdown")
      .map((b) => (b as any).text)
      .join("\n");
    expect(text).toContain("staging");
    expect(text).toContain("feature/my-branch");
  });

  test("showRunSummary: false hides summary", () => {
    const testCases: any[] = [
      [
        { id: "t1", title: "t1", titlePath: () => ["S", "t1"] },
        { status: "passed", duration: 400 },
      ],
    ];
    const blocks = WithTableTemplate(passedRun, testCases, { env: {}, showRunSummary: false });
    const sectionTexts = blocks
      .filter((b) => b.type === "section")
      .map((b) => (b as any).text?.text ?? "");
    expect(sectionTexts.some((t) => t.includes("Total"))).toBe(false);
  });
});
