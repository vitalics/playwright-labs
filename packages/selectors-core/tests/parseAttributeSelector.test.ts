import { test, expect } from "@playwright/test";
import { parseAttributeSelector } from "../src/parser";

// ─── Component name ────────────────────────────────────────────────────────────

test.describe("component name", () => {
  test("parses kebab-case name", () => {
    expect(parseAttributeSelector("my-component", false)).toEqual({
      name: "my-component",
      attributes: [],
    });
  });

  test("parses snake_case name", () => {
    expect(parseAttributeSelector("my_component", false)).toEqual({
      name: "my_component",
      attributes: [],
    });
  });

  test("parses PascalCase name", () => {
    expect(parseAttributeSelector("AppButton", false)).toEqual({
      name: "AppButton",
      attributes: [],
    });
  });

  test("parses camelCase name", () => {
    expect(parseAttributeSelector("myButton", false)).toEqual({
      name: "myButton",
      attributes: [],
    });
  });

  test("parses name with leading digits", () => {
    // digits are valid CSS ident chars after position 0 is allowed per unicode range
    const result = parseAttributeSelector("h1", false);
    expect(result.name).toBe("h1");
  });

  test("parses single-character name", () => {
    expect(parseAttributeSelector("A", false).name).toBe("A");
  });
});

// ─── Truthy attribute ──────────────────────────────────────────────────────────

test.describe("truthy attribute", () => {
  test("parses truthy attribute without component name", () => {
    expect(parseAttributeSelector("[enabled]", false)).toEqual({
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
    const result = parseAttributeSelector("app-button[disabled]", false);
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

  test("parses truthy on nested path", () => {
    const result = parseAttributeSelector("[user.active]", false);
    expect(result.attributes[0]).toEqual({
      name: "user.active",
      jsonPath: ["user", "active"],
      op: "<truthy>",
      value: null,
      caseSensitive: false,
    });
  });
});

// ─── = operator ───────────────────────────────────────────────────────────────

test.describe("= operator", () => {
  test("parses = with double-quoted string", () => {
    expect(
      parseAttributeSelector('[label="Submit"]', false).attributes[0],
    ).toEqual({
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
    expect(
      parseAttributeSelector("[active=true]", false).attributes[0].value,
    ).toBe(true);
  });

  test("parses = with boolean false", () => {
    expect(
      parseAttributeSelector("[active=false]", false).attributes[0].value,
    ).toBe(false);
  });

  test("parses = with positive integer", () => {
    expect(
      parseAttributeSelector("[count=42]", false).attributes[0].value,
    ).toBe(42);
  });

  test("parses = with zero", () => {
    expect(
      parseAttributeSelector("[count=0]", false).attributes[0].value,
    ).toBe(0);
  });

  test("parses = with float", () => {
    expect(
      parseAttributeSelector("[ratio=3.14]", false).attributes[0].value,
    ).toBe(3.14);
  });

  test("parses = with negative number via +/- sign", () => {
    // "-" is a valid CSS name char so -5 accumulates as the token
    const result = parseAttributeSelector("[score=-5]", false);
    expect(result.attributes[0].value).toBe(-5);
  });

  test("parses = with regex", () => {
    expect(
      parseAttributeSelector("[name=/hello/]", false).attributes[0].value,
    ).toEqual(/hello/);
  });

  test("parses = with regex and flags", () => {
    expect(
      parseAttributeSelector("[name=/hello/gi]", false).attributes[0].value,
    ).toEqual(/hello/gi);
  });

  test("preserves whitespace inside quoted string value", () => {
    const result = parseAttributeSelector('[label="  hello  "]', false);
    expect(result.attributes[0].value).toBe("  hello  ");
  });

  test("parses empty string value", () => {
    const result = parseAttributeSelector('[label=""]', false);
    expect(result.attributes[0].value).toBe("");
  });

  test("parses string with escaped quote", () => {
    const result = parseAttributeSelector('[label="it\\"s"]', false);
    expect(result.attributes[0].value).toBe('it"s');
  });
});

// ─── Case sensitivity flags ────────────────────────────────────────────────────

test.describe("case sensitivity flags", () => {
  test("lowercase i sets caseSensitive to false", () => {
    expect(
      parseAttributeSelector('[label="submit" i]', false).attributes[0]
        .caseSensitive,
    ).toBe(false);
  });

  test("uppercase I sets caseSensitive to false", () => {
    expect(
      parseAttributeSelector('[label="submit" I]', false).attributes[0]
        .caseSensitive,
    ).toBe(false);
  });

  test("lowercase s sets caseSensitive to true", () => {
    expect(
      parseAttributeSelector('[label="Submit" s]', false).attributes[0]
        .caseSensitive,
    ).toBe(true);
  });

  test("uppercase S sets caseSensitive to true", () => {
    expect(
      parseAttributeSelector('[label="Submit" S]', false).attributes[0]
        .caseSensitive,
    ).toBe(true);
  });

  test("default caseSensitive is true for quoted string", () => {
    expect(
      parseAttributeSelector('[label="Submit"]', false).attributes[0]
        .caseSensitive,
    ).toBe(true);
  });
});

// ─── Property path ─────────────────────────────────────────────────────────────

test.describe("property path (jsonPath)", () => {
  test("single-segment path", () => {
    const result = parseAttributeSelector('[name="Alice"]', false);
    expect(result.attributes[0].jsonPath).toEqual(["name"]);
    expect(result.attributes[0].name).toBe("name");
  });

  test("two-segment path", () => {
    const result = parseAttributeSelector('[user.name="Alice"]', false);
    expect(result.attributes[0].jsonPath).toEqual(["user", "name"]);
    expect(result.attributes[0].name).toBe("user.name");
  });

  test("three-segment path", () => {
    const result = parseAttributeSelector('[a.b.c="x"]', false);
    expect(result.attributes[0].jsonPath).toEqual(["a", "b", "c"]);
    expect(result.attributes[0].name).toBe("a.b.c");
  });

  test("four-segment path", () => {
    const result = parseAttributeSelector('[a.b.c.d="x"]', false);
    expect(result.attributes[0].jsonPath).toEqual(["a", "b", "c", "d"]);
  });

  test("path with quoted segment tokens", () => {
    // quoted tokens inside the path: ['foo'.'bar']
    const result = parseAttributeSelector("['foo'.'bar'=\"x\"]", false);
    expect(result.attributes[0].jsonPath).toEqual(["foo", "bar"]);
  });
});

// ─── Other operators ───────────────────────────────────────────────────────────

test.describe("operators", () => {
  test.describe("*= (contains)", () => {
    test("parses *=", () => {
      const attr = parseAttributeSelector('[title*="foo"]', false).attributes[0];
      expect(attr.op).toBe("*=");
      expect(attr.value).toBe("foo");
    });
  });

  test.describe("^= (starts-with)", () => {
    test("parses ^=", () => {
      expect(
        parseAttributeSelector('[title^="foo"]', false).attributes[0].op,
      ).toBe("^=");
    });
  });

  test.describe("$= (ends-with)", () => {
    test("parses $=", () => {
      expect(
        parseAttributeSelector('[title$="foo"]', false).attributes[0].op,
      ).toBe("$=");
    });
  });

  test.describe("|= (hyphen-prefixed)", () => {
    test("parses |=", () => {
      expect(
        parseAttributeSelector('[lang|="en"]', false).attributes[0].op,
      ).toBe("|=");
    });
  });

  test.describe("~= (word-in-list)", () => {
    test("parses ~=", () => {
      expect(
        parseAttributeSelector('[class~="active"]', false).attributes[0].op,
      ).toBe("~=");
    });
  });
});

// ─── Multiple attributes ───────────────────────────────────────────────────────

test.describe("multiple attributes", () => {
  test("two attributes without component name", () => {
    const result = parseAttributeSelector('[a][b="x"]', false);
    expect(result.name).toBe("");
    expect(result.attributes).toHaveLength(2);
    expect(result.attributes[0].op).toBe("<truthy>");
    expect(result.attributes[1].value).toBe("x");
  });

  test("three attributes: truthy + string + boolean", () => {
    const result = parseAttributeSelector('[a][b="x"][c=true]', false);
    expect(result.attributes).toHaveLength(3);
    expect(result.attributes[0].op).toBe("<truthy>");
    expect(result.attributes[1].value).toBe("x");
    expect(result.attributes[2].value).toBe(true);
  });

  test("component name with two attributes", () => {
    const result = parseAttributeSelector('app-card[title="Hello"][active]', false);
    expect(result.name).toBe("app-card");
    expect(result.attributes).toHaveLength(2);
    expect(result.attributes[0].op).toBe("=");
    expect(result.attributes[1].op).toBe("<truthy>");
  });

  test("five attributes returns correct length", () => {
    const result = parseAttributeSelector(
      '[a][b][c][d][e]',
      false,
    );
    expect(result.attributes).toHaveLength(5);
  });
});

// ─── Whitespace tolerance ──────────────────────────────────────────────────────

test.describe("whitespace tolerance", () => {
  test("spaces inside attribute brackets", () => {
    const result = parseAttributeSelector('[ label = "Hello" ]', false);
    expect(result.attributes[0].name).toBe("label");
    expect(result.attributes[0].value).toBe("Hello");
  });

  test("spaces between component name and first attribute", () => {
    const result = parseAttributeSelector("app-button [active]", false);
    expect(result.name).toBe("app-button");
    expect(result.attributes[0].op).toBe("<truthy>");
  });

  test("spaces between consecutive attributes", () => {
    const result = parseAttributeSelector('[a] [b="x"]', false);
    expect(result.attributes).toHaveLength(2);
  });

  test("leading space before component name is consumed", () => {
    // readIdentifier calls skipSpaces before reading
    const result = parseAttributeSelector("  app-btn  [x]", false);
    expect(result.name).toBe("app-btn");
    expect(result.attributes).toHaveLength(1);
  });
});

// ─── allowUnquotedStrings flag ─────────────────────────────────────────────────

test.describe("allowUnquotedStrings", () => {
  test("allows unquoted string when flag is true", () => {
    expect(
      parseAttributeSelector("[prop=hello]", true).attributes[0].value,
    ).toBe("hello");
  });

  test("throws on unquoted non-boolean/non-number when flag is false", () => {
    expect(() => parseAttributeSelector("[prop=hello]", false)).toThrow();
  });

  test("true/false are always parsed as booleans regardless of flag", () => {
    expect(
      parseAttributeSelector("[prop=true]", false).attributes[0].value,
    ).toBe(true);
    expect(
      parseAttributeSelector("[prop=false]", false).attributes[0].value,
    ).toBe(false);
  });

  test("numbers are always parsed as numbers regardless of flag", () => {
    expect(
      parseAttributeSelector("[prop=99]", false).attributes[0].value,
    ).toBe(99);
  });
});

// ─── Regex values ──────────────────────────────────────────────────────────────

test.describe("regex values", () => {
  test("simple regex", () => {
    expect(
      parseAttributeSelector("[name=/hello/]", false).attributes[0].value,
    ).toEqual(/hello/);
  });

  test("regex with multiple flags", () => {
    expect(
      parseAttributeSelector("[name=/hello/gim]", false).attributes[0].value,
    ).toEqual(/hello/gim);
  });

  test("regex with character class", () => {
    expect(
      parseAttributeSelector("[name=/[a-z]+/]", false).attributes[0].value,
    ).toEqual(/[a-z]+/);
  });

  test("regex with escaped forward slash", () => {
    const result = parseAttributeSelector("[path=/foo\\/bar/]", false);
    expect(result.attributes[0].value).toBeInstanceOf(RegExp);
  });
});

// ─── Error cases ───────────────────────────────────────────────────────────────

test.describe("error cases", () => {
  test("throws on empty selector", () => {
    expect(() => parseAttributeSelector("", false)).toThrow(
      "selector cannot be empty",
    );
  });

  test("throws on unterminated quoted string", () => {
    expect(() =>
      parseAttributeSelector('[prop="unterminated', false),
    ).toThrow("Unexpected end of selector");
  });

  test("throws on missing value after operator", () => {
    expect(() => parseAttributeSelector("[prop=", false)).toThrow(
      "Unexpected end of selector",
    );
  });

  test("throws on unclosed bracket", () => {
    expect(() =>
      parseAttributeSelector('[prop="hello"', false),
    ).toThrow();
  });

  test("throws when regex used with *= operator", () => {
    expect(() =>
      parseAttributeSelector("[prop*=/hello/]", false),
    ).toThrow("cannot use *=");
  });

  test("throws when regex used with ^= operator", () => {
    expect(() =>
      parseAttributeSelector("[prop^=/hello/]", false),
    ).toThrow("cannot use ^=");
  });

  test("throws when non-= operator used with number value", () => {
    expect(() => parseAttributeSelector("[count*=42]", false)).toThrow(
      "cannot use *=",
    );
  });

  test("throws when non-= operator used with boolean value", () => {
    expect(() => parseAttributeSelector("[active*=true]", false)).toThrow(
      "cannot use *=",
    );
  });

  test("throws on invalid regex pattern", () => {
    expect(() =>
      parseAttributeSelector("[prop=/[invalid/]", false),
    ).toThrow();
  });

  test("throws on trailing garbage after valid selector", () => {
    expect(() =>
      parseAttributeSelector('app-button[label="x"]!!!', false),
    ).toThrow();
  });
});
