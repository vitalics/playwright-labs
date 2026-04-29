import { test, expect } from "@playwright/test";
import { plainText, mrkdwn, text, option, optionGroup, confirm } from "../src/objects";

test.describe("plainText", () => {
  test("sets type and text", () => {
    const obj = plainText("Hello");
    expect(obj).toEqual({ type: "plain_text", text: "Hello", emoji: true });
  });

  test("emoji defaults to true", () => {
    expect(plainText("x").emoji).toBe(true);
  });

  test("emoji can be set to false", () => {
    expect(plainText("x", false).emoji).toBe(false);
  });
});

test.describe("mrkdwn", () => {
  test("sets type and text", () => {
    const obj = mrkdwn("*bold*");
    expect(obj).toEqual({ type: "mrkdwn", text: "*bold*" });
  });

  test("does not include verbatim when not provided", () => {
    expect("verbatim" in mrkdwn("x")).toBe(false);
  });

  test("includes verbatim when explicitly set", () => {
    const obj = mrkdwn("x", true);
    expect(obj).toHaveProperty("verbatim", true);
  });
});

test.describe("text helper", () => {
  test("defaults to mrkdwn", () => {
    expect(text("hello").type).toBe("mrkdwn");
  });

  test("plain_text when specified", () => {
    expect(text("hello", "plain_text").type).toBe("plain_text");
  });
});

test.describe("option", () => {
  test("minimal option", () => {
    const obj = option("Label", "value1");
    expect(obj.text).toEqual({ type: "plain_text", text: "Label", emoji: true });
    expect(obj.value).toBe("value1");
    expect(obj.description).toBeUndefined();
    expect(obj.url).toBeUndefined();
  });

  test("option with description and url", () => {
    const obj = option("Label", "v", "Desc", "https://example.com");
    expect(obj.description).toEqual({ type: "plain_text", text: "Desc", emoji: true });
    expect(obj.url).toBe("https://example.com");
  });
});

test.describe("optionGroup", () => {
  test("wraps label and options", () => {
    const opts = [option("A", "a")];
    const group = optionGroup("Group", opts);
    expect(group.label).toEqual({ type: "plain_text", text: "Group", emoji: true });
    expect(group.options).toBe(opts);
  });
});

test.describe("confirm", () => {
  test("minimal confirm dialog", () => {
    const dialog = confirm("Sure?", "This action is irreversible.");
    expect(dialog.title.text).toBe("Sure?");
    expect(dialog.text.text).toBe("This action is irreversible.");
    expect(dialog.confirm.text).toBe("Confirm");
    expect(dialog.deny.text).toBe("Cancel");
    expect(dialog.style).toBeUndefined();
  });

  test("custom labels and style", () => {
    const dialog = confirm("Delete?", "Really?", "Yes, delete", "No", "danger");
    expect(dialog.confirm.text).toBe("Yes, delete");
    expect(dialog.deny.text).toBe("No");
    expect(dialog.style).toBe("danger");
  });
});
