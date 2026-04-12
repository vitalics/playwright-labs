import { test, expect } from "@playwright/test";
import { matchesAttributePart } from "../src/parser";
import type { AttributeSelectorPart } from "../src/types";

/** Build a minimal AttributeSelectorPart for testing. */
function part(
  op: string,
  value: any,
  caseSensitive = true,
): AttributeSelectorPart {
  return {
    name: "prop",
    jsonPath: ["prop"],
    op,
    value,
    caseSensitive,
  } as AttributeSelectorPart;
}

// ─── <truthy> ──────────────────────────────────────────────────────────────────

test.describe("<truthy>", () => {
  test("non-empty string → true", () => {
    expect(matchesAttributePart("hello", part("<truthy>", null))).toBe(true);
  });

  test("empty string → false", () => {
    expect(matchesAttributePart("", part("<truthy>", null))).toBe(false);
  });

  test("0 → false", () => {
    expect(matchesAttributePart(0, part("<truthy>", null))).toBe(false);
  });

  test("positive number → true", () => {
    expect(matchesAttributePart(1, part("<truthy>", null))).toBe(true);
  });

  test("negative number → true", () => {
    expect(matchesAttributePart(-1, part("<truthy>", null))).toBe(true);
  });

  test("null → false", () => {
    expect(matchesAttributePart(null, part("<truthy>", null))).toBe(false);
  });

  test("undefined → false", () => {
    expect(matchesAttributePart(undefined, part("<truthy>", null))).toBe(false);
  });

  test("empty object → true", () => {
    expect(matchesAttributePart({}, part("<truthy>", null))).toBe(true);
  });

  test("empty array → true", () => {
    expect(matchesAttributePart([], part("<truthy>", null))).toBe(true);
  });

  test("boolean true → true", () => {
    expect(matchesAttributePart(true, part("<truthy>", null))).toBe(true);
  });

  test("boolean false → false", () => {
    expect(matchesAttributePart(false, part("<truthy>", null))).toBe(false);
  });

  test("NaN → false", () => {
    expect(matchesAttributePart(NaN, part("<truthy>", null))).toBe(false);
  });
});

// ─── = (equality) ─────────────────────────────────────────────────────────────

test.describe("= (equality)", () => {
  test("exact string match → true", () => {
    expect(matchesAttributePart("hello", part("=", "hello"))).toBe(true);
  });

  test("string mismatch → false", () => {
    expect(matchesAttributePart("hello", part("=", "world"))).toBe(false);
  });

  test("number equality → true", () => {
    expect(matchesAttributePart(42, part("=", 42))).toBe(true);
  });

  test("number mismatch → false", () => {
    expect(matchesAttributePart(42, part("=", 43))).toBe(false);
  });

  test("zero equality → true", () => {
    expect(matchesAttributePart(0, part("=", 0))).toBe(true);
  });

  test("number vs string with same digits → false (strict)", () => {
    expect(matchesAttributePart(42, part("=", "42"))).toBe(false);
  });

  test("boolean true equality → true", () => {
    expect(matchesAttributePart(true, part("=", true))).toBe(true);
  });

  test("boolean false equality → true", () => {
    expect(matchesAttributePart(false, part("=", false))).toBe(true);
  });

  test("boolean type mismatch → false", () => {
    expect(matchesAttributePart(true, part("=", false))).toBe(false);
  });

  test("null === null → true", () => {
    expect(matchesAttributePart(null, part("=", null))).toBe(true);
  });

  test("undefined === undefined → true", () => {
    expect(matchesAttributePart(undefined, part("=", undefined))).toBe(true);
  });

  test("null !== undefined → false", () => {
    expect(matchesAttributePart(null, part("=", undefined))).toBe(false);
  });

  test.describe("regex values", () => {
    test("regex: matching string → true", () => {
      expect(matchesAttributePart("hello world", part("=", /hello/))).toBe(
        true,
      );
    });

    test("regex: non-matching string → false", () => {
      expect(
        matchesAttributePart("hello world", part("=", /^world/)),
      ).toBe(false);
    });

    test("regex: non-string value → false", () => {
      expect(matchesAttributePart(42, part("=", /42/))).toBe(false);
    });

    test("regex with flags: case-insensitive match → true", () => {
      expect(matchesAttributePart("Hello", part("=", /hello/i))).toBe(true);
    });
  });

  test.describe("case sensitivity", () => {
    test("case-insensitive: same letters different case → true", () => {
      expect(matchesAttributePart("Hello", part("=", "hello", false))).toBe(
        true,
      );
    });

    test("case-insensitive: different letters → false", () => {
      expect(matchesAttributePart("Hello", part("=", "world", false))).toBe(
        false,
      );
    });

    test("case-sensitive: different case → false", () => {
      expect(matchesAttributePart("Hello", part("=", "hello", true))).toBe(
        false,
      );
    });

    test("case-sensitive: exact case → true", () => {
      expect(matchesAttributePart("Hello", part("=", "Hello", true))).toBe(
        true,
      );
    });
  });
});

// ─── *= (contains) ─────────────────────────────────────────────────────────────

test.describe("*= (contains)", () => {
  test("value contains substring → true", () => {
    expect(matchesAttributePart("hello world", part("*=", "lo wo"))).toBe(true);
  });

  test("value does not contain substring → false", () => {
    expect(matchesAttributePart("hello world", part("*=", "xyz"))).toBe(false);
  });

  test("full match (substring = value) → true", () => {
    expect(matchesAttributePart("hello", part("*=", "hello"))).toBe(true);
  });

  test("empty substring → true (every string contains empty)", () => {
    expect(matchesAttributePart("hello", part("*=", ""))).toBe(true);
  });

  test("case-insensitive contains → true", () => {
    expect(
      matchesAttributePart("Hello World", part("*=", "lo wo", false)),
    ).toBe(true);
  });

  test("non-string value → false", () => {
    expect(matchesAttributePart(42, part("*=", "4"))).toBe(false);
  });

  test("non-string attr value → false", () => {
    expect(matchesAttributePart("42", part("*=", 4 as any))).toBe(false);
  });

  test("null value → false", () => {
    expect(matchesAttributePart(null, part("*=", "x"))).toBe(false);
  });
});

// ─── ^= (starts-with) ─────────────────────────────────────────────────────────

test.describe("^= (starts-with)", () => {
  test("starts with prefix → true", () => {
    expect(matchesAttributePart("hello world", part("^=", "hello"))).toBe(true);
  });

  test("does not start with → false", () => {
    expect(matchesAttributePart("hello world", part("^=", "world"))).toBe(
      false,
    );
  });

  test("exact match (value = prefix) → true", () => {
    expect(matchesAttributePart("hello", part("^=", "hello"))).toBe(true);
  });

  test("empty prefix → true", () => {
    expect(matchesAttributePart("hello", part("^=", ""))).toBe(true);
  });

  test("case-insensitive starts with → true", () => {
    expect(
      matchesAttributePart("Hello World", part("^=", "hello", false)),
    ).toBe(true);
  });

  test("non-string value → false", () => {
    expect(matchesAttributePart(42, part("^=", "4"))).toBe(false);
  });

  test("null value → false", () => {
    expect(matchesAttributePart(null, part("^=", "x"))).toBe(false);
  });
});

// ─── $= (ends-with) ───────────────────────────────────────────────────────────

test.describe("$= (ends-with)", () => {
  test("ends with suffix → true", () => {
    expect(matchesAttributePart("hello world", part("$=", "world"))).toBe(true);
  });

  test("does not end with → false", () => {
    expect(matchesAttributePart("hello world", part("$=", "hello"))).toBe(
      false,
    );
  });

  test("exact match (value = suffix) → true", () => {
    expect(matchesAttributePart("hello", part("$=", "hello"))).toBe(true);
  });

  test("empty suffix → true", () => {
    expect(matchesAttributePart("hello", part("$=", ""))).toBe(true);
  });

  test("case-insensitive ends with → true", () => {
    expect(
      matchesAttributePart("hello WORLD", part("$=", "world", false)),
    ).toBe(true);
  });

  test("non-string value → false", () => {
    expect(matchesAttributePart(42, part("$=", "2"))).toBe(false);
  });
});

// ─── |= (exact or hyphen-prefixed) ────────────────────────────────────────────

test.describe("|= (exact or hyphen-prefixed)", () => {
  test("exact match → true", () => {
    expect(matchesAttributePart("en", part("|=", "en"))).toBe(true);
  });

  test("hyphen-prefixed subtype → true", () => {
    expect(matchesAttributePart("en-US", part("|=", "en"))).toBe(true);
  });

  test("hyphen-prefixed multi-level → true", () => {
    expect(matchesAttributePart("zh-Hant-TW", part("|=", "zh"))).toBe(true);
  });

  test("partial match without hyphen → false", () => {
    expect(matchesAttributePart("english", part("|=", "en"))).toBe(false);
  });

  test("different value → false", () => {
    expect(matchesAttributePart("fr", part("|=", "en"))).toBe(false);
  });

  test("non-string value → false", () => {
    expect(matchesAttributePart(42, part("|=", "42"))).toBe(false);
  });

  test("case-insensitive exact match → true", () => {
    expect(matchesAttributePart("EN", part("|=", "en", false))).toBe(true);
  });
});

// ─── ~= (word in space-separated list) ────────────────────────────────────────

test.describe("~= (word-in-list)", () => {
  test("word found in middle → true", () => {
    expect(matchesAttributePart("foo bar baz", part("~=", "bar"))).toBe(true);
  });

  test("first word → true", () => {
    expect(matchesAttributePart("foo bar baz", part("~=", "foo"))).toBe(true);
  });

  test("last word → true", () => {
    expect(matchesAttributePart("foo bar baz", part("~=", "baz"))).toBe(true);
  });

  test("single word exact match → true", () => {
    expect(matchesAttributePart("active", part("~=", "active"))).toBe(true);
  });

  test("word not in list → false", () => {
    expect(matchesAttributePart("foo bar baz", part("~=", "qux"))).toBe(false);
  });

  test("partial word prefix → false (no partial matches)", () => {
    expect(matchesAttributePart("active inactive", part("~=", "act"))).toBe(
      false,
    );
  });

  test("non-string value → false", () => {
    expect(matchesAttributePart(42, part("~=", "42"))).toBe(false);
  });

  test("non-string attr value → false", () => {
    expect(matchesAttributePart("foo bar", part("~=", 42 as any))).toBe(false);
  });

  test("case-insensitive word match → true", () => {
    expect(
      matchesAttributePart("Foo BAR baz", part("~=", "bar", false)),
    ).toBe(true);
  });
});
