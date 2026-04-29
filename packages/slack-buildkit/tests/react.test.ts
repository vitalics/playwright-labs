import { test, expect } from "@playwright/test";
import { jsx, jsxs, Fragment, normalizeChildren } from "../src/react/jsx-runtime";
import {
  Blocks,
  Header,
  Section,
  Divider,
  Actions,
  Button,
  Context,
  Image,
  StaticSelect,
  PlainTextInput,
  Input,
} from "../src/react/components";
import { option } from "../src/objects";

// ---------------------------------------------------------------------------
// jsx-runtime
// ---------------------------------------------------------------------------

test.describe("jsx runtime — jsx()", () => {
  test("calls function component with props", () => {
    const Component = ({ text }: { text: string }) => ({
      type: "section" as const,
      text: { type: "mrkdwn" as const, text },
    });
    const result = jsx(Component, { text: "hello" });
    expect((result as any).text.text).toBe("hello");
  });

  test("strips key prop before calling component", () => {
    const received: Record<string, unknown>[] = [];
    const Component = (props: Record<string, unknown>) => {
      received.push(props);
      return null;
    };
    jsx(Component, { key: "k1", value: "v" });
    expect(received[0]).not.toHaveProperty("key");
    expect(received[0]).toHaveProperty("value", "v");
  });

  test("returns null for string element types", () => {
    expect(jsx("div", {})).toBeNull();
  });
});

test.describe("Fragment", () => {
  test("returns flat array of blocks", () => {
    const h = Header({ children: "Hi" });
    const d = Divider({});
    const result = Fragment({ children: [h, d] });
    expect(result).toHaveLength(2);
  });

  test("filters out null/undefined/false children", () => {
    const result = normalizeChildren([null, false, undefined, Header({ children: "X" })]);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Block components
// ---------------------------------------------------------------------------

test.describe("Header component", () => {
  test("produces header block", () => {
    const block = Header({ children: "My Title" });
    expect(block.type).toBe("header");
    expect(block.text.text).toBe("My Title");
  });

  test("passes block_id", () => {
    const block = Header({ children: "T", block_id: "hdr1" });
    expect(block.block_id).toBe("hdr1");
  });
});

test.describe("Section component", () => {
  test("string children become mrkdwn text", () => {
    const block = Section({ children: "Hello *world*" });
    expect(block.type).toBe("section");
    expect((block as any).text.type).toBe("mrkdwn");
    expect((block as any).text.text).toBe("Hello *world*");
  });

  test("fields are forwarded", () => {
    const block = Section({ fields: ["*A*", "*B*"] });
    expect((block as any).fields).toHaveLength(2);
  });
});

test.describe("Divider component", () => {
  test("produces divider block", () => {
    const block = Divider({});
    expect(block.type).toBe("divider");
  });
});

test.describe("Actions component", () => {
  test("collects button children", () => {
    const btn = Button({ children: "Click" });
    const block = Actions({ children: [btn] });
    expect(block.type).toBe("actions");
    expect(block.elements).toHaveLength(1);
    expect(block.elements[0].type).toBe("button");
  });
});

test.describe("Button component", () => {
  test("produces button element", () => {
    const el = Button({ children: "Save", style: "primary", action_id: "save" });
    expect(el.type).toBe("button");
    expect((el as any).text.text).toBe("Save");
    expect((el as any).style).toBe("primary");
    expect((el as any).action_id).toBe("save");
  });
});

test.describe("Context component", () => {
  test("string children become mrkdwn", () => {
    const block = Context({ children: "Sent by CI" });
    expect(block.type).toBe("context");
    expect(block.elements[0]).toEqual({ type: "mrkdwn", text: "Sent by CI" });
  });
});

test.describe("Image component", () => {
  test("produces image block", () => {
    const block = Image({ src: "https://x.com/img.png", alt: "Alt" });
    expect(block.type).toBe("image");
    expect(block.image_url).toBe("https://x.com/img.png");
    expect(block.alt_text).toBe("Alt");
  });
});

test.describe("StaticSelect component", () => {
  test("produces static_select element", () => {
    const opts = [option("A", "a")];
    const el = StaticSelect({ placeholder: "Choose", options: opts });
    expect(el.type).toBe("static_select");
    expect(el.placeholder.text).toBe("Choose");
    expect(el.options).toHaveLength(1);
  });
});

test.describe("Input component", () => {
  test("produces input block", () => {
    const el = PlainTextInput({ placeholder: "Type here" });
    const block = Input({ label: "Answer", children: el });
    expect(block.type).toBe("input");
    expect(block.label.text).toBe("Answer");
    expect(block.element).toBe(el);
  });
});

// ---------------------------------------------------------------------------
// Blocks container
// ---------------------------------------------------------------------------

test.describe("Blocks container", () => {
  test("collects multiple children into flat array", () => {
    const h = Header({ children: "Title" });
    const d = Divider({});
    const s = Section({ children: "Body" });
    const result = Blocks({ children: [h, d, s] });
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe("header");
    expect(result[1].type).toBe("divider");
    expect(result[2].type).toBe("section");
  });

  test("filters out falsy children", () => {
    const h = Header({ children: "Title" });
    const result = Blocks({ children: [h, null, false, undefined] as any });
    expect(result).toHaveLength(1);
  });

  test("returns empty array for no children", () => {
    expect(Blocks({})).toHaveLength(0);
  });
});
