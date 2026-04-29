import { test, expect } from "@playwright/test";
import {
  button,
  checkboxes,
  datepicker,
  imageElement,
  multiStaticSelect,
  overflow,
  plainTextInput,
  radioButtons,
  staticSelect,
  timepicker,
} from "../src/elements";
import { option } from "../src/objects";

const opt = option("Label", "val");

test.describe("button", () => {
  test("minimal button", () => {
    const el = button("Click me");
    expect(el.type).toBe("button");
    expect(el.text).toEqual({ type: "plain_text", text: "Click me", emoji: true });
    expect(el.action_id).toBeUndefined();
    expect(el.style).toBeUndefined();
  });

  test("button with all options", () => {
    const el = button("Submit", {
      action_id: "submit_btn",
      value: "submit",
      style: "primary",
      url: "https://example.com",
      accessibility_label: "Submit the form",
    });
    expect(el.action_id).toBe("submit_btn");
    expect(el.value).toBe("submit");
    expect(el.style).toBe("primary");
    expect(el.url).toBe("https://example.com");
    expect(el.accessibility_label).toBe("Submit the form");
  });

  test("danger style", () => {
    const el = button("Delete", { style: "danger" });
    expect(el.style).toBe("danger");
  });
});

test.describe("staticSelect", () => {
  test("minimal select", () => {
    const el = staticSelect("Choose", [opt]);
    expect(el.type).toBe("static_select");
    expect(el.placeholder.text).toBe("Choose");
    expect(el.options).toHaveLength(1);
    expect(el.action_id).toBeUndefined();
  });

  test("with action_id and initial_option", () => {
    const el = staticSelect("Choose", [opt], { action_id: "my_select", initial_option: opt });
    expect(el.action_id).toBe("my_select");
    expect(el.initial_option).toBe(opt);
  });
});

test.describe("multiStaticSelect", () => {
  test("type is multi_static_select", () => {
    const el = multiStaticSelect("Pick", [opt]);
    expect(el.type).toBe("multi_static_select");
  });

  test("max_selected_items is forwarded", () => {
    const el = multiStaticSelect("Pick", [opt], { max_selected_items: 3 });
    expect(el.max_selected_items).toBe(3);
  });
});

test.describe("overflow", () => {
  test("creates overflow element", () => {
    const el = overflow([opt]);
    expect(el.type).toBe("overflow");
    expect(el.options).toHaveLength(1);
  });

  test("with action_id", () => {
    const el = overflow([opt], "overflow_action");
    expect(el.action_id).toBe("overflow_action");
  });
});

test.describe("datepicker", () => {
  test("minimal datepicker", () => {
    const el = datepicker();
    expect(el.type).toBe("datepicker");
    expect(el.initial_date).toBeUndefined();
  });

  test("with initial_date and placeholder", () => {
    const el = datepicker({ initial_date: "2024-01-15", placeholder: "Pick a date" });
    expect(el.initial_date).toBe("2024-01-15");
    expect(el.placeholder?.text).toBe("Pick a date");
  });
});

test.describe("timepicker", () => {
  test("minimal timepicker", () => {
    const el = timepicker();
    expect(el.type).toBe("timepicker");
  });

  test("with timezone", () => {
    const el = timepicker({ timezone: "Europe/Warsaw", initial_time: "09:00" });
    expect(el.timezone).toBe("Europe/Warsaw");
    expect(el.initial_time).toBe("09:00");
  });
});

test.describe("radioButtons", () => {
  test("creates radio_buttons element", () => {
    const el = radioButtons([opt]);
    expect(el.type).toBe("radio_buttons");
    expect(el.options).toHaveLength(1);
  });

  test("with initial_option", () => {
    const el = radioButtons([opt], { initial_option: opt });
    expect(el.initial_option).toBe(opt);
  });
});

test.describe("checkboxes", () => {
  test("creates checkboxes element", () => {
    const el = checkboxes([opt]);
    expect(el.type).toBe("checkboxes");
    expect(el.options).toHaveLength(1);
  });

  test("with initial_options", () => {
    const el = checkboxes([opt], { initial_options: [opt] });
    expect(el.initial_options).toHaveLength(1);
  });
});

test.describe("plainTextInput", () => {
  test("minimal input", () => {
    const el = plainTextInput();
    expect(el.type).toBe("plain_text_input");
    expect(el.multiline).toBeUndefined();
  });

  test("multiline with length limits", () => {
    const el = plainTextInput({ multiline: true, min_length: 10, max_length: 500 });
    expect(el.multiline).toBe(true);
    expect(el.min_length).toBe(10);
    expect(el.max_length).toBe(500);
  });

  test("with placeholder", () => {
    const el = plainTextInput({ placeholder: "Enter text" });
    expect(el.placeholder?.text).toBe("Enter text");
  });
});

test.describe("imageElement", () => {
  test("creates image element", () => {
    const el = imageElement("https://example.com/img.png", "Alt text");
    expect(el.type).toBe("image");
    expect(el.image_url).toBe("https://example.com/img.png");
    expect(el.alt_text).toBe("Alt text");
  });
});
