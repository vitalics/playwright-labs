/** @jsxImportSource @playwright-labs/slack-buildkit/react */
import { test, expect } from "@playwright/test";
import {
  Actions,
  Blocks,
  Button,
  Checkboxes,
  Context,
  Datepicker,
  Divider,
  Header,
  Image,
  Input,
  Mrkdwn,
  MultiStaticSelect,
  Overflow,
  PlainText,
  PlainTextInput,
  RadioButtons,
  Section,
  StaticSelect,
} from "@playwright-labs/slack-buildkit/react";
import { option } from "@playwright-labs/slack-buildkit";
import { render } from "@playwright-labs/slack-buildkit";

// ---------------------------------------------------------------------------
// Single blocks
// ---------------------------------------------------------------------------

test.describe("JSX — Header", () => {
  test("renders header block", () => {
    const blocks = render(<Header>My Title</Header>);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("header");
    expect((blocks[0] as any).text.text).toBe("My Title");
  });

  test("forwards block_id", () => {
    const blocks = render(<Header block_id="hdr1">Title</Header>);
    expect((blocks[0] as any).block_id).toBe("hdr1");
  });
});

test.describe("JSX — Section", () => {
  test("renders section with mrkdwn text", () => {
    const blocks = render(<Section>*Hello* world</Section>);
    expect(blocks[0].type).toBe("section");
    expect((blocks[0] as any).text.type).toBe("mrkdwn");
    expect((blocks[0] as any).text.text).toBe("*Hello* world");
  });

  test("renders section with fields", () => {
    const blocks = render(<Section fields={["*Field A*", "*Field B*"]} />);
    expect((blocks[0] as any).fields).toHaveLength(2);
  });

  test("renders section with accessory button", () => {
    const blocks = render(
      <Section accessory={<Button action_id="click">Go</Button>}>
        Text with accessory
      </Section>,
    );
    expect((blocks[0] as any).accessory).toBeDefined();
    expect((blocks[0] as any).accessory.type).toBe("button");
  });
});

test.describe("JSX — Divider", () => {
  test("renders divider block", () => {
    const blocks = render(<Divider />);
    expect(blocks[0].type).toBe("divider");
  });
});

test.describe("JSX — Image", () => {
  test("renders image block", () => {
    const blocks = render(
      <Image src="https://example.com/img.png" alt="Screenshot" title="App screenshot" />,
    );
    expect(blocks[0].type).toBe("image");
    expect((blocks[0] as any).image_url).toBe("https://example.com/img.png");
    expect((blocks[0] as any).alt_text).toBe("Screenshot");
    expect((blocks[0] as any).title.text).toBe("App screenshot");
  });
});

test.describe("JSX — Actions", () => {
  test("renders actions block with multiple buttons", () => {
    const blocks = render(
      <Actions>
        <Button action_id="approve" style="primary">Approve</Button>
        <Button action_id="reject" style="danger">Reject</Button>
      </Actions>,
    );
    expect(blocks[0].type).toBe("actions");
    expect((blocks[0] as any).elements).toHaveLength(2);
    expect((blocks[0] as any).elements[0].text.text).toBe("Approve");
    expect((blocks[0] as any).elements[1].style).toBe("danger");
  });

  test("renders actions with static select", () => {
    const opts = [option("Option A", "a"), option("Option B", "b")];
    const blocks = render(
      <Actions>
        <StaticSelect placeholder="Choose one" options={opts} action_id="my_select" />
      </Actions>,
    );
    expect((blocks[0] as any).elements[0].type).toBe("static_select");
    expect((blocks[0] as any).elements[0].options).toHaveLength(2);
  });
});

test.describe("JSX — Context", () => {
  test("renders context block with text", () => {
    const blocks = render(<Context>Sent by CI on {new Date("2024-01-01").toDateString()}</Context>);
    expect(blocks[0].type).toBe("context");
    expect((blocks[0] as any).elements[0].type).toBe("mrkdwn");
  });
});

test.describe("JSX — Input", () => {
  test("renders input block with plain text input", () => {
    const blocks = render(
      <Input label="Your message" hint="Max 500 characters" optional>
        <PlainTextInput
          placeholder="Type here"
          multiline
          max_length={500}
          action_id="message_input"
        />
      </Input>,
    );
    expect(blocks[0].type).toBe("input");
    expect((blocks[0] as any).label.text).toBe("Your message");
    expect((blocks[0] as any).hint.text).toBe("Max 500 characters");
    expect((blocks[0] as any).optional).toBe(true);
    expect((blocks[0] as any).element.type).toBe("plain_text_input");
    expect((blocks[0] as any).element.multiline).toBe(true);
  });

  test("renders input block with radio buttons", () => {
    const opts = [option("Yes", "yes"), option("No", "no")];
    const blocks = render(
      <Input label="Approve?">
        <RadioButtons options={opts} action_id="approval" />
      </Input>,
    );
    expect((blocks[0] as any).element.type).toBe("radio_buttons");
  });

  test("renders input block with checkboxes", () => {
    const opts = [option("Notify team", "notify"), option("Create ticket", "ticket")];
    const blocks = render(
      <Input label="Actions">
        <Checkboxes options={opts} action_id="post_actions" />
      </Input>,
    );
    expect((blocks[0] as any).element.type).toBe("checkboxes");
  });

  test("renders input block with datepicker", () => {
    const blocks = render(
      <Input label="Due date">
        <Datepicker initial_date="2024-06-01" placeholder="Pick date" action_id="due_date" />
      </Input>,
    );
    expect((blocks[0] as any).element.type).toBe("datepicker");
    expect((blocks[0] as any).element.initial_date).toBe("2024-06-01");
  });
});

test.describe("JSX — interactive elements standalone", () => {
  test("Overflow element", () => {
    const opts = [option("Edit", "edit"), option("Delete", "delete")];
    const blocks = render(
      <Actions>
        <Overflow options={opts} action_id="item_menu" />
      </Actions>,
    );
    expect((blocks[0] as any).elements[0].type).toBe("overflow");
  });

  test("MultiStaticSelect", () => {
    const opts = [option("A", "a"), option("B", "b"), option("C", "c")];
    const blocks = render(
      <Actions>
        <MultiStaticSelect
          placeholder="Pick many"
          options={opts}
          max_selected_items={2}
          action_id="multi"
        />
      </Actions>,
    );
    expect((blocks[0] as any).elements[0].type).toBe("multi_static_select");
    expect((blocks[0] as any).elements[0].max_selected_items).toBe(2);
  });
});

test.describe("JSX — text helpers", () => {
  test("Mrkdwn returns mrkdwn text object", () => {
    const obj = <Mrkdwn verbatim>*bold*</Mrkdwn>;
    expect((obj as any).type).toBe("mrkdwn");
    expect((obj as any).verbatim).toBe(true);
  });

  test("PlainText returns plain_text object", () => {
    const obj = <PlainText emoji={false}>Hello</PlainText>;
    expect((obj as any).type).toBe("plain_text");
    expect((obj as any).emoji).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Blocks container and composition
// ---------------------------------------------------------------------------

test.describe("JSX — Blocks container", () => {
  test("composes multiple blocks into flat array", () => {
    const blocks = render(
      <Blocks>
        <Header>Deployment Report</Header>
        <Section>*Environment:* Production</Section>
        <Divider />
        <Actions>
          <Button action_id="open" url="https://example.com" style="primary">
            View
          </Button>
        </Actions>
        <Context>Triggered by CI</Context>
      </Blocks>,
    );

    expect(blocks).toHaveLength(5);
    expect(blocks[0].type).toBe("header");
    expect(blocks[1].type).toBe("section");
    expect(blocks[2].type).toBe("divider");
    expect(blocks[3].type).toBe("actions");
    expect(blocks[4].type).toBe("context");
  });

  test("conditional rendering — falsy blocks are filtered out", () => {
    const showWarning = false;
    const blocks = render(
      <Blocks>
        <Header>Status</Header>
        {showWarning && <Section>⚠️ Warning message</Section>}
        <Divider />
      </Blocks>,
    );
    expect(blocks).toHaveLength(2);
    expect(blocks.every((b) => b.type !== "section")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Functional components (custom user components)
// ---------------------------------------------------------------------------

test.describe("JSX — custom functional components", () => {
  function StatusBadge({ status }: { status: "passed" | "failed" }) {
    const emoji = status === "passed" ? ":white_check_mark:" : ":x:";
    return <Section>{`${emoji} Tests ${status}`}</Section>;
  }

  function ReportFooter({ runAt }: { runAt: string }) {
    return (
      <>
        <Divider />
        <Context>{`Ran at: ${runAt}`}</Context>
      </>
    );
  }

  test("renders custom component", () => {
    const blocks = render(<StatusBadge status="passed" />);
    expect(blocks[0].type).toBe("section");
    expect((blocks[0] as any).text.text).toContain(":white_check_mark:");
  });

  test("renders component with Fragment return", () => {
    const blocks = render(<ReportFooter runAt="2024-01-15T10:00:00Z" />);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("divider");
    expect(blocks[1].type).toBe("context");
  });

  test("composes custom components inside Blocks", () => {
    const blocks = render(
      <Blocks>
        <Header>Test Run</Header>
        <StatusBadge status="failed" />
        <ReportFooter runAt="2024-01-15T10:00:00Z" />
      </Blocks>,
    );
    expect(blocks).toHaveLength(4);
    expect(blocks[0].type).toBe("header");
    expect(blocks[1].type).toBe("section");
    expect(blocks[2].type).toBe("divider");
    expect(blocks[3].type).toBe("context");
  });

  test("component with dynamic content from props", () => {
    function TestSummary({
      passed,
      failed,
    }: {
      passed: number;
      failed: number;
    }) {
      return (
        <Blocks>
          <Section>{`*Passed:* ${passed}   *Failed:* ${failed}`}</Section>
          {failed > 0 && (
            <Actions>
              <Button action_id="view" style="primary">View Failures</Button>
            </Actions>
          )}
        </Blocks>
      );
    }

    const withFailures = render(<TestSummary passed={8} failed={2} />);
    expect(withFailures.some((b) => b.type === "actions")).toBe(true);

    const allPassed = render(<TestSummary passed={10} failed={0} />);
    expect(allPassed.some((b) => b.type === "actions")).toBe(false);
  });
});
