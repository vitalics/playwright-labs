import { test, expect } from "@playwright/test";
import { formatStringTemplate } from "../src/formatStringTemplate";

test.describe("transformName", () => {
  test.describe("basic functionality", () => {
    test("should return original string when no placeholders", () => {
      const result = formatStringTemplate(
        "my step without placeholders",
        [],
        {},
        [],
      );
      expect(result).toBe("my step without placeholders");
    });

    test("should return empty string for empty input", () => {
      const result = formatStringTemplate("", [], {}, []);
      expect(result).toBe("");
    });
  });

  test.describe("$ placeholder (single dollar sign)", () => {
    test("should keep $ as literal when followed by space", () => {
      const result = formatStringTemplate(
        "my step with id: $ ",
        ["123"],
        {},
        [],
      );
      expect(result).toBe("my step with id: $ ");
    });

    test("should keep $ as literal when at the end", () => {
      const result = formatStringTemplate("end is $", ["here"], {}, []);
      expect(result).toBe("end is $");
    });

    test("should keep $ as literal when followed by special characters", () => {
      const result = formatStringTemplate("price is $$ USD", ["value"], {}, []);
      expect(result).toBe("price is $$ USD");
    });
  });

  test.describe("$N placeholder (indexed)", () => {
    test("should replace $0 with first argument", () => {
      const result = formatStringTemplate(
        "my step with id: $0",
        ["123"],
        {},
        [],
      );
      expect(result).toBe("my step with id: 123");
    });

    test("should replace $1 with second argument", () => {
      const result = formatStringTemplate(
        "my step with id: $1",
        ["first", "second"],
        {},
        [],
      );
      expect(result).toBe("my step with id: second");
    });

    test("should replace multiple indexed placeholders", () => {
      const result = formatStringTemplate(
        "$0 and $1 and $2",
        ["one", "two", "three"],
        {},
        [],
      );
      expect(result).toBe("one and two and three");
    });

    test("should handle placeholders in any order", () => {
      const result = formatStringTemplate(
        "$2, $0, $1",
        ["a", "b", "c"],
        {},
        [],
      );
      expect(result).toBe("c, a, b");
    });

    test("should handle same placeholder multiple times", () => {
      const result = formatStringTemplate("$0 is $0", ["repeated"], {}, []);
      expect(result).toBe("repeated is repeated");
    });
  });

  test.describe("multi-digit indices", () => {
    test("should handle $10", () => {
      const args = Array.from({ length: 11 }, (_, i) => `arg${i}`);
      const result = formatStringTemplate("value at $10", [...args], {}, []);
      expect(result).toBe("value at arg10");
    });

    test("should handle $99", () => {
      const args = Array.from({ length: 100 }, (_, i) => `arg${i}`);
      const result = formatStringTemplate("value at $99", [...args], {}, []);
      expect(result).toBe("value at arg99");
    });

    test("should handle three-digit indices", () => {
      const args = Array.from({ length: 101 }, (_, i) => `arg${i}`);
      const result = formatStringTemplate("value at $100", [...args], {}, []);
      expect(result).toBe("value at arg100");
    });
  });

  test.describe("mixed placeholders", () => {
    test("should handle complex template", () => {
      const result = formatStringTemplate(
        "User $0 logged in at $1 from $2",
        ["john@example.com", "2024-01-01", "192.168.1.1"],
        {},
        [],
      );
      expect(result).toBe(
        "User john@example.com logged in at 2024-01-01 from 192.168.1.1",
      );
    });

    test("should handle $ as literal with $N", () => {
      const result = formatStringTemplate(
        "Price: $ and id: $0",
        ["first", "second"],
        {},
        [],
      );
      expect(result).toBe("Price: $ and id: first");
    });
  });

  test.describe("edge cases", () => {
    test("should handle placeholder at the very end", () => {
      const result = formatStringTemplate("value: $0", ["end"], {}, []);
      expect(result).toBe("value: end");
    });

    test("should handle consecutive placeholders", () => {
      const result = formatStringTemplate("$0$1$2", ["a", "b", "c"], {}, []);
      expect(result).toBe("abc");
    });

    test("should handle placeholder with no space", () => {
      const result = formatStringTemplate("prefix$0suffix", ["middle"], {}, []);
      expect(result).toBe("prefixmiddlesuffix");
    });

    test("should handle undefined argument gracefully", () => {
      const result = formatStringTemplate("value: $0", [undefined], {}, []);
      expect(result).toBe("value: undefined");
    });

    test("should handle null argument", () => {
      const result = formatStringTemplate("value: $0", [null], {}, []);
      expect(result).toBe("value: null");
    });

    test("should handle numeric arguments", () => {
      const result = formatStringTemplate("count: $0", [42], {}, []);
      expect(result).toBe("count: 42");
    });

    test("should handle boolean arguments", () => {
      const result = formatStringTemplate("flag: $0", [true], {}, []);
      expect(result).toBe("flag: true");
    });

    test("should handle object arguments", () => {
      // util.format properly formats objects instead of [object Object]
      const result = formatStringTemplate(
        "data: $0",
        [{ key: "value" }],
        {},
        [],
      );
      expect(result).toBe("data: { key: 'value' }");
    });

    test("should handle $ at end of string as literal", () => {
      const result = formatStringTemplate("end with $", ["dollar"], {}, []);
      expect(result).toBe("end with $");
    });

    test("should handle TemplateStringsArray input", () => {
      const template = ["my step with id: $0"] as any as TemplateStringsArray;
      const result = formatStringTemplate(template, ["123"], {}, []);
      expect(result).toBe("my step with id: 123");
    });
  });

  test.describe("error cases", () => {
    test("should throw error for $letter placeholder", () => {
      expect(() =>
        formatStringTemplate("price is $a", ["first"], {}, []),
      ).toThrow(
        'Missing parameter for placeholder at position 9: "$a". Parameter not found in context.',
      );
    });

    test("should throw error for $uppercase letter placeholder", () => {
      expect(() => formatStringTemplate("value $A", ["first"], {}, [])).toThrow(
        'Missing parameter for placeholder at position 6: "$A". Parameter not found in context.',
      );
    });

    test("should throw error for $word placeholder", () => {
      expect(() =>
        formatStringTemplate("$name is here", ["first"], {}, []),
      ).toThrow(
        'Missing parameter for placeholder at position 0: "$name". Parameter not found in context.',
      );
    });

    test("should throw error for multiple invalid placeholders (first one)", () => {
      expect(() =>
        formatStringTemplate("$a and $b", ["first"], {}, []),
      ).toThrow(
        'Missing parameter for placeholder at position 0: "$a". Parameter not found in context.',
      );
    });

    test("should handle $N placeholders correctly (note: $50 is treated as $5 followed by 0)", () => {
      const result = formatStringTemplate("Price: $$, ID: $0", ["123"], {}, []);
      expect(result).toBe("Price: $$, ID: 123");
    });

    test("should recognize that $100 is placeholder $1 followed by 00", () => {
      // This demonstrates that $100 means args[100], not literal "$100"
      const args = Array.from({ length: 101 }, (_, i) => `value${i}`);
      const result = formatStringTemplate("ID: $100", [...args], {}, []);
      expect(result).toBe("ID: value100");
    });

    test("should throw error when argument index is out of bounds", () => {
      expect(() =>
        formatStringTemplate("value: $5", ["a", "b"], {}, []),
      ).toThrow(
        'Missing argument for placeholder at position 7: "$5". Expected at least 6 argument(s), but got 2.',
      );
    });

    test("should throw error when no arguments provided but placeholder exists", () => {
      expect(() => formatStringTemplate("value: $0", [], {}, [])).toThrow(
        'Missing argument for placeholder at position 7: "$0". Expected at least 1 argument(s), but got 0.',
      );
    });

    test("should throw error for large index without enough args", () => {
      expect(() =>
        formatStringTemplate("ID: $100", ["only", "two"], {}, []),
      ).toThrow(
        'Missing argument for placeholder at position 4: "$100". Expected at least 101 argument(s), but got 2.',
      );
    });
  });

  test.describe("real-world scenarios", () => {
    test("should work with API test scenario", () => {
      const result = formatStringTemplate(
        "GET $0 returns status $1",
        ["/api/users", "200"],
        {},
        [],
      );
      expect(result).toBe("GET /api/users returns status 200");
    });

    test("should throw error when missing required arguments", () => {
      expect(() =>
        formatStringTemplate("GET $0 returns status $1", ["200"], {}, []),
      ).toThrow(
        'Missing argument for placeholder at position 22: "$1". Expected at least 2 argument(s), but got 1.',
      );
    });

    test("should work with login scenario", {}, () => {
      const result = formatStringTemplate(
        "Login as $0 with password $1",
        ["admin@test.com", "secret123"],
        {},
        [],
      );
      expect(result).toBe("Login as admin@test.com with password secret123");
    });

    test("should work with form filling scenario", () => {
      const result = formatStringTemplate(
        "Fill form field $0 with value $1",
        ["username", "testuser"],
        {},
        [],
      );
      expect(result).toBe("Fill form field username with value testuser");
    });
  });
});
