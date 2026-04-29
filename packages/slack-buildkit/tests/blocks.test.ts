import { test, expect } from "@playwright/test";
import {
  actions,
  context,
  divider,
  fields,
  header,
  image,
  input,
  richText,
  section,
  video,
} from "../src/blocks";
import { button, imageElement, plainTextInput } from "../src/elements";
import { mrkdwn } from "../src/objects";

test.describe("section", () => {
  test("creates section from string — defaults to mrkdwn", () => {
    const block = section("Hello *world*");
    expect(block.type).toBe("section");
    expect(block.text).toEqual({ type: "mrkdwn", text: "Hello *world*" });
  });

  test("accepts pre-built TextObject", () => {
    const block = section(mrkdwn("test", true));
    expect(block.text?.type).toBe("mrkdwn");
  });

  test("with fields and accessory", () => {
    const btn = button("Click");
    const block = section("Text", {
      fields: ["*Field 1*", "*Field 2*"],
      accessory: btn,
      block_id: "s1",
    });
    expect(block.fields).toHaveLength(2);
    expect(block.fields?.[0].type).toBe("mrkdwn");
    expect(block.accessory).toBe(btn);
    expect(block.block_id).toBe("s1");
  });
});

test.describe("fields", () => {
  test("creates section with only fields", () => {
    const block = fields(["A", "B"]);
    expect(block.type).toBe("section");
    expect(block.text).toBeUndefined();
    expect(block.fields).toHaveLength(2);
  });
});

test.describe("divider", () => {
  test("type is divider", () => {
    expect(divider().type).toBe("divider");
  });

  test("with block_id", () => {
    expect(divider("div1").block_id).toBe("div1");
  });

  test("without block_id", () => {
    expect(divider().block_id).toBeUndefined();
  });
});

test.describe("header", () => {
  test("creates header with plain_text", () => {
    const block = header("My Header");
    expect(block.type).toBe("header");
    expect(block.text).toEqual({ type: "plain_text", text: "My Header", emoji: true });
  });

  test("with block_id", () => {
    expect(header("H", "hdr1").block_id).toBe("hdr1");
  });
});

test.describe("image block", () => {
  test("minimal image block", () => {
    const block = image("https://example.com/img.png", "Alt");
    expect(block.type).toBe("image");
    expect(block.image_url).toBe("https://example.com/img.png");
    expect(block.alt_text).toBe("Alt");
    expect(block.title).toBeUndefined();
  });

  test("with title and block_id", () => {
    const block = image("https://x.com/y.png", "Alt", { title: "My Image", block_id: "img1" });
    expect(block.title?.text).toBe("My Image");
    expect(block.block_id).toBe("img1");
  });
});

test.describe("actions", () => {
  test("wraps elements array", () => {
    const btn = button("Go");
    const block = actions([btn]);
    expect(block.type).toBe("actions");
    expect(block.elements).toHaveLength(1);
    expect(block.elements[0]).toBe(btn);
  });

  test("with block_id", () => {
    expect(actions([button("x")], "act1").block_id).toBe("act1");
  });
});

test.describe("context", () => {
  test("string children become mrkdwn", () => {
    const block = context(["Some context"]);
    expect(block.type).toBe("context");
    expect(block.elements[0]).toEqual({ type: "mrkdwn", text: "Some context" });
  });

  test("accepts image elements and text objects", () => {
    const img = imageElement("https://x.com/i.png", "icon");
    const txt = mrkdwn("info text");
    const block = context([img, txt]);
    expect(block.elements).toHaveLength(2);
  });
});

test.describe("input block", () => {
  test("creates input with label and element", () => {
    const el = plainTextInput({ placeholder: "Enter value" });
    const block = input("Your answer", el);
    expect(block.type).toBe("input");
    expect(block.label.text).toBe("Your answer");
    expect(block.element).toBe(el);
  });

  test("with hint and optional", () => {
    const el = plainTextInput();
    const block = input("Label", el, { hint: "Helpful hint", optional: true });
    expect(block.hint?.text).toBe("Helpful hint");
    expect(block.optional).toBe(true);
  });
});

test.describe("richText", () => {
  test("creates rich_text block", () => {
    const block = richText([{ type: "rich_text_section", elements: [] }]);
    expect(block.type).toBe("rich_text");
    expect(block.elements).toHaveLength(1);
  });
});

test.describe("video", () => {
  test("creates video block with required fields", () => {
    const block = video("Title", "https://v.example.com", "https://thumb.example.com", "Alt");
    expect(block.type).toBe("video");
    expect(block.title.text).toBe("Title");
    expect(block.video_url).toBe("https://v.example.com");
    expect(block.thumbnail_url).toBe("https://thumb.example.com");
    expect(block.alt_text).toBe("Alt");
  });

  test("optional fields forwarded", () => {
    const block = video("T", "https://v.com", "https://t.com", "A", {
      author_name: "John",
      provider_name: "YouTube",
    });
    expect(block.author_name).toBe("John");
    expect(block.provider_name).toBe("YouTube");
  });
});
