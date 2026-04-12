import { test, expect } from "@playwright/test";
import { parseAttributeSelector } from "@playwright-labs/selectors-core";

test.describe("parseAttributeSelector", () => {
  test.describe("component name", () => {
    test("parses component name only", () => {
      const result = parseAttributeSelector("my-component", false);
      expect(result).toEqual({ name: "my-component", attributes: [] });
    });

    test("parses component name with underscore", () => {
      const result = parseAttributeSelector("my_component", false);
      expect(result).toEqual({ name: "my_component", attributes: [] });
    });

    test("parses mixed-case component name", () => {
      const result = parseAttributeSelector("AppButton", false);
      expect(result).toEqual({ name: "AppButton", attributes: [] });
    });
  });

  test.describe("truthy attribute", () => {
    test("parses truthy attribute without component name", () => {
      const result = parseAttributeSelector("[enabled]", false);
      expect(result).toEqual({
        name: "",
        attributes: [
          {
            name: "enabled",
            jsonPath: ["enabled"],
            op: "<truthy>",
            value: null,
            caseSensitive: false,
          },
        ],
      });
    });

    test("parses component name with truthy attribute", () => {
      const result = parseAttributeSelector(
        "app-button[disabled]",
        false,
      );
      expect(result.name).toBe("app-button");
      expect(result.attributes).toHaveLength(1);
      expect(result.attributes[0]).toEqual({
        name: "disabled",
        jsonPath: ["disabled"],
        op: "<truthy>",
        value: null,
        caseSensitive: false,
      });
    });
  });

  test.describe("= operator", () => {
    test("parses = with double-quoted string", () => {
      const result = parseAttributeSelector('[label="Submit"]', false);
      expect(result.attributes[0]).toEqual({
        name: "label",
        jsonPath: ["label"],
        op: "=",
        value: "Submit",
        caseSensitive: true,
      });
    });

    test("parses = with single-quoted string", () => {
      const result = parseAttributeSelector("[label='Click me']", false);
      expect(result.attributes[0].value).toBe("Click me");
      expect(result.attributes[0].op).toBe("=");
    });

    test("parses = with boolean true", () => {
      const result = parseAttributeSelector("[active=true]", false);
      expect(result.attributes[0].value).toBe(true);
      expect(result.attributes[0].op).toBe("=");
    });

    test("parses = with boolean false", () => {
      const result = parseAttributeSelector("[active=false]", false);
      expect(result.attributes[0].value).toBe(false);
    });

    test("parses = with integer", () => {
      const result = parseAttributeSelector("[count=42]", false);
      expect(result.attributes[0].value).toBe(42);
    });

    test("parses = with float", () => {
      const result = parseAttributeSelector("[ratio=3.14]", false);
      expect(result.attributes[0].value).toBe(3.14);
    });

    test("parses = with regex", () => {
      const result = parseAttributeSelector("[name=/hello/]", false);
      expect(result.attributes[0].value).toEqual(/hello/);
      expect(result.attributes[0].op).toBe("=");
    });

    test("parses = with regex and flags", () => {
      const result = parseAttributeSelector("[name=/hello/gi]", false);
      expect(result.attributes[0].value).toEqual(/hello/gi);
    });
  });

  test.describe("case sensitivity flags", () => {
    test("parses case-insensitive flag (i)", () => {
      const result = parseAttributeSelector(
        '[label="submit" i]',
        false,
      );
      expect(result.attributes[0].caseSensitive).toBe(false);
    });

    test("parses case-insensitive flag (I uppercase)", () => {
      const result = parseAttributeSelector(
        '[label="submit" I]',
        false,
      );
      expect(result.attributes[0].caseSensitive).toBe(false);
    });

    test("parses case-sensitive flag (s)", () => {
      const result = parseAttributeSelector(
        '[label="Submit" s]',
        false,
      );
      expect(result.attributes[0].caseSensitive).toBe(true);
    });

    test("parses case-sensitive flag (S uppercase)", () => {
      const result = parseAttributeSelector(
        '[label="Submit" S]',
        false,
      );
      expect(result.attributes[0].caseSensitive).toBe(true);
    });
  });

  test.describe("property path", () => {
    test("parses two-level nested property", () => {
      const result = parseAttributeSelector(
        '[user.name="Alice"]',
        false,
      );
      expect(result.attributes[0]).toEqual({
        name: "user.name",
        jsonPath: ["user", "name"],
        op: "=",
        value: "Alice",
        caseSensitive: true,
      });
    });

    test("parses deeply nested property path", () => {
      const result = parseAttributeSelector('[a.b.c.d="x"]', false);
      expect(result.attributes[0].jsonPath).toEqual(["a", "b", "c", "d"]);
      expect(result.attributes[0].name).toBe("a.b.c.d");
    });
  });

  test.describe("other operators", () => {
    test("parses *= (contains)", () => {
      const result = parseAttributeSelector('[title*="foo"]', false);
      expect(result.attributes[0].op).toBe("*=");
      expect(result.attributes[0].value).toBe("foo");
    });

    test("parses ^= (starts with)", () => {
      const result = parseAttributeSelector('[title^="foo"]', false);
      expect(result.attributes[0].op).toBe("^=");
    });

    test("parses $= (ends with)", () => {
      const result = parseAttributeSelector('[title$="foo"]', false);
      expect(result.attributes[0].op).toBe("$=");
    });

    test("parses |= (exact or hyphen-prefixed)", () => {
      const result = parseAttributeSelector('[lang|="en"]', false);
      expect(result.attributes[0].op).toBe("|=");
    });

    test("parses ~= (word in list)", () => {
      const result = parseAttributeSelector('[class~="active"]', false);
      expect(result.attributes[0].op).toBe("~=");
    });
  });

  test.describe("multiple attributes", () => {
    test("parses multiple attributes without component name", () => {
      const result = parseAttributeSelector(
        '[a][b="x"][c=true]',
        false,
      );
      expect(result.attributes).toHaveLength(3);
      expect(result.attributes[0].op).toBe("<truthy>");
      expect(result.attributes[1].value).toBe("x");
      expect(result.attributes[2].value).toBe(true);
    });

    test("parses component name with multiple attributes", () => {
      const result = parseAttributeSelector(
        'app-card[title="Hello"][active]',
        false,
      );
      expect(result.name).toBe("app-card");
      expect(result.attributes).toHaveLength(2);
      expect(result.attributes[0].op).toBe("=");
      expect(result.attributes[1].op).toBe("<truthy>");
    });
  });

  test.describe("whitespace tolerance", () => {
    test("tolerates spaces inside attribute brackets", () => {
      const result = parseAttributeSelector(
        '[ label = "Hello" ]',
        false,
      );
      expect(result.attributes[0].name).toBe("label");
      expect(result.attributes[0].value).toBe("Hello");
    });

    test("tolerates spaces between component name and attribute", () => {
      const result = parseAttributeSelector(
        'app-button [active]',
        false,
      );
      expect(result.name).toBe("app-button");
      expect(result.attributes[0].op).toBe("<truthy>");
    });
  });

  test.describe("allowUnquotedStrings", () => {
    test("allows unquoted string value when flag is true", () => {
      const result = parseAttributeSelector("[prop=hello]", true);
      expect(result.attributes[0].value).toBe("hello");
    });

    test("throws on unquoted non-boolean/non-number when flag is false", () => {
      expect(() =>
        parseAttributeSelector("[prop=hello]", false),
      ).toThrow();
    });
  });

  test.describe("error cases", () => {
    test("throws on empty selector", () => {
      expect(() => parseAttributeSelector("", false)).toThrow(
        "selector cannot be empty",
      );
    });

    test("throws on unexpected end while parsing attribute value", () => {
      expect(() =>
        parseAttributeSelector('[prop="unterminated', false),
      ).toThrow("Unexpected end of selector");
    });

    test("throws on unexpected end after operator", () => {
      expect(() =>
        parseAttributeSelector("[prop=", false),
      ).toThrow("Unexpected end of selector");
    });

    test("throws when regex used with non-= operator", () => {
      expect(() =>
        parseAttributeSelector("[prop*=/hello/]", false),
      ).toThrow("cannot use *=");
    });

    test("throws when non-= operator used with non-string value", () => {
      expect(() =>
        parseAttributeSelector("[count*=42]", false),
      ).toThrow("cannot use *=");
    });

    test("throws on invalid regex pattern", () => {
      expect(() =>
        parseAttributeSelector("[prop=/[invalid/]", false),
      ).toThrow();
    });
  });
});
