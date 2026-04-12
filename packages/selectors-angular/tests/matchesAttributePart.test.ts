import { test, expect } from "@playwright/test";
import { matchesAttributePart } from "@playwright-labs/selectors-core";
import type { AttributeSelectorPart } from "@playwright-labs/selectors-core";

function matchesComponentAttribute(obj: any, attr: AttributeSelectorPart) {
  let value = obj;
  for (const token of attr.jsonPath) {
    if (value !== undefined && value !== null) value = value[token];
    else break;
  }
  return matchesAttributePart(value, attr);
}

/** Build a minimal AttributeSelectorPart for testing */
function part(op: string, value: any, caseSensitive = true) {
  return {
    name: "prop",
    jsonPath: ["prop"],
    op,
    value,
    caseSensitive,
  } as Parameters<typeof matchesAttributePart>[1];
}

test.describe("matchesAttributePart", () => {
  test.describe("<truthy>", () => {
    test("non-empty string → true", () => {
      expect(matchesAttributePart("hello", part("<truthy>", null))).toBe(
        true,
      );
    });

    test("empty string → false", () => {
      expect(matchesAttributePart("", part("<truthy>", null))).toBe(
        false,
      );
    });

    test("0 → false", () => {
      expect(matchesAttributePart(0, part("<truthy>", null))).toBe(
        false,
      );
    });

    test("positive number → true", () => {
      expect(matchesAttributePart(1, part("<truthy>", null))).toBe(true);
    });

    test("null → false", () => {
      expect(matchesAttributePart(null, part("<truthy>", null))).toBe(
        false,
      );
    });

    test("undefined → false", () => {
      expect(
        matchesAttributePart(undefined, part("<truthy>", null)),
      ).toBe(false);
    });

    test("non-empty object → true", () => {
      expect(matchesAttributePart({}, part("<truthy>", null))).toBe(
        true,
      );
    });

    test("boolean true → true", () => {
      expect(matchesAttributePart(true, part("<truthy>", null))).toBe(
        true,
      );
    });

    test("boolean false → false", () => {
      expect(matchesAttributePart(false, part("<truthy>", null))).toBe(
        false,
      );
    });
  });

  test.describe("= (equality)", () => {
    test("exact string match → true", () => {
      expect(
        matchesAttributePart("hello", part("=", "hello")),
      ).toBe(true);
    });

    test("string mismatch → false", () => {
      expect(
        matchesAttributePart("hello", part("=", "world")),
      ).toBe(false);
    });

    test("number match → true", () => {
      expect(matchesAttributePart(42, part("=", 42))).toBe(true);
    });

    test("boolean true match → true", () => {
      expect(matchesAttributePart(true, part("=", true))).toBe(true);
    });

    test("boolean false match → true", () => {
      expect(matchesAttributePart(false, part("=", false))).toBe(true);
    });

    test("boolean type mismatch → false", () => {
      expect(matchesAttributePart(true, part("=", false))).toBe(false);
    });

    test("regex: matching string → true", () => {
      expect(
        matchesAttributePart("hello world", part("=", /hello/)),
      ).toBe(true);
    });

    test("regex: non-matching string → false", () => {
      expect(
        matchesAttributePart("hello world", part("=", /^world/)),
      ).toBe(false);
    });

    test("regex: non-string value → false", () => {
      expect(matchesAttributePart(42, part("=", /42/))).toBe(false);
    });

    test("case insensitive: matches when cases differ → true", () => {
      expect(
        matchesAttributePart("Hello", part("=", "hello", false)),
      ).toBe(true);
    });

    test("case insensitive: mismatch → false", () => {
      expect(
        matchesAttributePart("Hello", part("=", "world", false)),
      ).toBe(false);
    });

    test("case sensitive: different case → false", () => {
      expect(
        matchesAttributePart("Hello", part("=", "hello", true)),
      ).toBe(false);
    });
  });

  test.describe("*= (contains)", () => {
    test("value contains substring → true", () => {
      expect(
        matchesAttributePart("hello world", part("*=", "lo wo")),
      ).toBe(true);
    });

    test("value does not contain substring → false", () => {
      expect(
        matchesAttributePart("hello world", part("*=", "xyz")),
      ).toBe(false);
    });

    test("case insensitive contains → true", () => {
      expect(
        matchesAttributePart(
          "Hello World",
          part("*=", "lo wo", false),
        ),
      ).toBe(true);
    });

    test("non-string value → false", () => {
      expect(matchesAttributePart(42, part("*=", "4"))).toBe(false);
    });

    test("non-string attr value → false", () => {
      expect(matchesAttributePart("42", part("*=", 4 as any))).toBe(
        false,
      );
    });
  });

  test.describe("^= (starts with)", () => {
    test("starts with prefix → true", () => {
      expect(
        matchesAttributePart("hello world", part("^=", "hello")),
      ).toBe(true);
    });

    test("does not start with → false", () => {
      expect(
        matchesAttributePart("hello world", part("^=", "world")),
      ).toBe(false);
    });

    test("case insensitive starts with → true", () => {
      expect(
        matchesAttributePart("Hello World", part("^=", "hello", false)),
      ).toBe(true);
    });

    test("non-string value → false", () => {
      expect(matchesAttributePart(42, part("^=", "4"))).toBe(false);
    });
  });

  test.describe("$= (ends with)", () => {
    test("ends with suffix → true", () => {
      expect(
        matchesAttributePart("hello world", part("$=", "world")),
      ).toBe(true);
    });

    test("does not end with → false", () => {
      expect(
        matchesAttributePart("hello world", part("$=", "hello")),
      ).toBe(false);
    });

    test("case insensitive ends with → true", () => {
      expect(
        matchesAttributePart("hello WORLD", part("$=", "world", false)),
      ).toBe(true);
    });

    test("non-string value → false", () => {
      expect(matchesAttributePart(42, part("$=", "2"))).toBe(false);
    });
  });

  test.describe("|= (exact or hyphen-prefixed)", () => {
    test("exact match → true", () => {
      expect(matchesAttributePart("en", part("|=", "en"))).toBe(true);
    });

    test("hyphen-prefixed subtype match → true", () => {
      expect(matchesAttributePart("en-US", part("|=", "en"))).toBe(
        true,
      );
    });

    test("partial string without hyphen → false", () => {
      expect(matchesAttributePart("english", part("|=", "en"))).toBe(
        false,
      );
    });

    test("different value → false", () => {
      expect(matchesAttributePart("fr", part("|=", "en"))).toBe(false);
    });

    test("non-string value → false", () => {
      expect(matchesAttributePart(42, part("|=", "42"))).toBe(false);
    });
  });

  test.describe("~= (word in space-separated list)", () => {
    test("word found in list → true", () => {
      expect(
        matchesAttributePart("foo bar baz", part("~=", "bar")),
      ).toBe(true);
    });

    test("word not in list → false", () => {
      expect(
        matchesAttributePart("foo bar baz", part("~=", "qux")),
      ).toBe(false);
    });

    test("single word exact match → true", () => {
      expect(matchesAttributePart("active", part("~=", "active"))).toBe(
        true,
      );
    });

    test("partial word prefix → false", () => {
      expect(
        matchesAttributePart("active inactive", part("~=", "act")),
      ).toBe(false);
    });

    test("first word in list → true", () => {
      expect(
        matchesAttributePart("foo bar baz", part("~=", "foo")),
      ).toBe(true);
    });

    test("last word in list → true", () => {
      expect(
        matchesAttributePart("foo bar baz", part("~=", "baz")),
      ).toBe(true);
    });

    test("non-string value → false", () => {
      expect(matchesAttributePart(42, part("~=", "42"))).toBe(false);
    });
  });
});

test.describe("matchesComponentAttribute", () => {
  test("matches flat property", () => {
    expect(
      matchesComponentAttribute(
        { label: "Submit" },
        {
          name: "label",
          jsonPath: ["label"],
          op: "=",
          value: "Submit",
          caseSensitive: true,
        },
      ),
    ).toBe(true);
  });

  test("no match on flat property value mismatch", () => {
    expect(
      matchesComponentAttribute(
        { label: "Cancel" },
        {
          name: "label",
          jsonPath: ["label"],
          op: "=",
          value: "Submit",
          caseSensitive: true,
        },
      ),
    ).toBe(false);
  });

  test("matches two-level nested property", () => {
    expect(
      matchesComponentAttribute(
        { user: { name: "Alice" } },
        {
          name: "user.name",
          jsonPath: ["user", "name"],
          op: "=",
          value: "Alice",
          caseSensitive: true,
        },
      ),
    ).toBe(true);
  });

  test("matches deeply nested property", () => {
    expect(
      matchesComponentAttribute(
        { a: { b: { c: 99 } } },
        {
          name: "a.b.c",
          jsonPath: ["a", "b", "c"],
          op: "=",
          value: 99,
          caseSensitive: true,
        },
      ),
    ).toBe(true);
  });

  test("returns false when intermediate property is null", () => {
    expect(
      matchesComponentAttribute(
        { user: null },
        {
          name: "user.name",
          jsonPath: ["user", "name"],
          op: "=",
          value: "Alice",
          caseSensitive: true,
        },
      ),
    ).toBe(false);
  });

  test("returns false when intermediate property is undefined", () => {
    expect(
      matchesComponentAttribute(
        { user: undefined },
        {
          name: "user.name",
          jsonPath: ["user", "name"],
          op: "=",
          value: "Alice",
          caseSensitive: true,
        },
      ),
    ).toBe(false);
  });

  test("matches truthy on nested boolean property", () => {
    expect(
      matchesComponentAttribute(
        { config: { enabled: true } },
        {
          name: "config.enabled",
          jsonPath: ["config", "enabled"],
          op: "<truthy>",
          value: null,
          caseSensitive: false,
        },
      ),
    ).toBe(true);
  });

  test("no truthy match when nested property is false", () => {
    expect(
      matchesComponentAttribute(
        { config: { enabled: false } },
        {
          name: "config.enabled",
          jsonPath: ["config", "enabled"],
          op: "<truthy>",
          value: null,
          caseSensitive: false,
        },
      ),
    ).toBe(false);
  });
});
