import { test, expect } from "@playwright/test";
import { formatStringTemplate } from "../src/formatStringTemplate";

test.describe("transformName - Custom Formatters", () => {
  test.describe("Basic Custom Formatters", () => {
    test("should use custom formatter for argument", () => {
      const result = formatStringTemplate("Value: $0", [42], {}, [
        (v) => `custom-${v}`,
      ]);
      expect(result).toBe("Value: custom-42");
    });

    test("should use JSON.stringify as custom formatter", () => {
      const result = formatStringTemplate(
        "Data: $0",
        [{ name: "John", age: 30 }],
        {},
        [JSON.stringify],
      );
      expect(result).toBe('Data: {"name":"John","age":30}');
    });

    test("should use toUpperCase as custom formatter", () => {
      const result = formatStringTemplate("Name: $0", ["john"], {}, [
        (v) => v.toUpperCase(),
      ]);
      expect(result).toBe("Name: JOHN");
    });

    test("should handle multiple custom formatters", () => {
      const result = formatStringTemplate(
        "User $0 has role $1",
        ["john", "admin"],
        {},
        [(v) => v.toUpperCase(), (v) => v.toLowerCase()],
      );
      expect(result).toBe("User JOHN has role admin");
    });
  });

  test.describe("Mixed: Custom Formatters with JavaScript-style", () => {
    test("should apply formatter to $0", () => {
      const result = formatStringTemplate("Step $0 and $1", [{ id: 1 }, 42], {}, [
        JSON.stringify,
        (v) => `[${v}]`,
      ]);
      expect(result).toBe('Step {"id":1} and [42]');
    });

    test("should handle out-of-order indices with formatters", () => {
      const result = formatStringTemplate(
        "Second: $1, First: $0",
        ["first", "second"],
        {},
        [(v) => v.toUpperCase(), (v) => v.toLowerCase()],
      );
      expect(result).toBe("Second: second, First: FIRST");
    });

    test("should apply same formatter multiple times for repeated placeholder", () => {
      const result = formatStringTemplate("Repeat $0 and $0 again", ["test"], {}, [
        (v) => v.toUpperCase(),
      ]);
      expect(result).toBe("Repeat TEST and TEST again");
    });
  });

  test.describe("Partial Custom Formatters", () => {
    test("should use formatter for first arg, default for second", () => {
      const result = formatStringTemplate("User $0 with ID $1", ["john", 123], {}, [
        (v) => v.toUpperCase(),
      ]);
      expect(result).toBe("User JOHN with ID 123");
    });

    test("should handle sparse formatter array", () => {
      const result = formatStringTemplate("Values: $0, $1, $2", ["a", "b", "c"], {}, [
        (v) => v.toUpperCase(),
        undefined,
        (v) => v.toLowerCase(),
      ]);
      expect(result).toBe("Values: A, b, c");
    });
  });

  test.describe("Complex Custom Formatters", () => {
    test("should format objects with custom formatter", () => {
      const formatter = (obj: any) => `[${obj.type}:${obj.id}]`;
      const result = formatStringTemplate(
        "Entity: $0",
        [{ type: "user", id: 123 }],
        {},
        [formatter],
      );
      expect(result).toBe("Entity: [user:123]");
    });

    test("should format arrays with custom formatter", () => {
      const formatter = (arr: any[]) => `[${arr.join(", ")}]`;
      const result = formatStringTemplate("Items: $0", [[1, 2, 3]], {}, [formatter]);
      expect(result).toBe("Items: [1, 2, 3]");
    });

    test("should handle Date with custom formatter", () => {
      const date = new Date("2024-01-01T00:00:00Z");
      const formatter = (d: Date) => d.toISOString().split("T")[0];
      const result = formatStringTemplate("Date: $0", [date], {}, [formatter]);
      expect(result).toBe("Date: 2024-01-01");
    });

    test("should handle Error with custom formatter", () => {
      const error = new Error("Test error");
      const formatter = (e: Error) => `ERROR: ${e.message}`;
      const result = formatStringTemplate("Failed: $0", [error], {}, [formatter]);
      expect(result).toBe("Failed: ERROR: Test error");
    });

    test("should handle circular references with custom formatter", () => {
      const obj: any = { name: "test" };
      obj.self = obj;
      const formatter = (o: any) => `[Circular: ${o.name}]`;
      const result = formatStringTemplate("Object: $0", [obj], {}, [formatter]);
      expect(result).toBe("Object: [Circular: test]");
    });
  });

  test.describe("Real-World Scenarios with Custom Formatters", () => {
    test("should format API request object", () => {
      const request = {
        method: "POST",
        url: "/api/users",
        body: { name: "John" },
      };
      const formatter = (req: any) => `${req.method} ${req.url}`;
      const result = formatStringTemplate("Making request: $0", [request], {}, [
        formatter,
      ]);
      expect(result).toBe("Making request: POST /api/users");
    });

    test("should format test step like class A example", () => {
      // Mimics: @step("my Step $1 and $0", JSON.stringify, (v) => v.toUpperCase())
      const result = formatStringTemplate(
        "my Step $1 and $0",
        [42, { id: 1, name: "test" }],
        {},
        [(v) => v.toString(), JSON.stringify],
      );
      expect(result).toBe('my Step {"id":1,"name":"test"} and 42');
    });

    test("should format user credentials securely", () => {
      const maskPassword = (pwd: string) => "*".repeat(pwd.length);
      const result = formatStringTemplate(
        "Login with user $0 and password $1",
        ["john@example.com", "secret123"],
        {},
        [undefined, maskPassword],
      );
      expect(result).toBe(
        "Login with user john@example.com and password *********",
      );
    });

    test("should format file size with custom formatter", () => {
      const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
      };
      const result = formatStringTemplate(
        "Uploaded file with size $0",
        [1536000],
        {},
        [formatBytes],
      );
      expect(result).toBe("Uploaded file with size 1.46MB");
    });

    test("should format duration with custom formatter", () => {
      const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
        return `${(ms / 60000).toFixed(2)}min`;
      };
      const result = formatStringTemplate("Test completed in $0", [125000], {}, [
        formatDuration,
      ]);
      expect(result).toBe("Test completed in 2.08min");
    });
  });

  test.describe("Edge Cases with Custom Formatters", () => {
    test("should handle empty formatter array", () => {
      const result = formatStringTemplate("Value: $0", [42], {}, []);
      expect(result).toBe("Value: 42");
    });

    test("should handle formatter returning empty string", () => {
      const result = formatStringTemplate("Value: $0", ["test"], {}, [() => ""]);
      expect(result).toBe("Value: ");
    });

    test("should handle formatter with null/undefined args", () => {
      const formatter = (v: any) =>
        v === null ? "NULL" : v === undefined ? "UNDEFINED" : String(v);
      const result = formatStringTemplate("Values: $0 and $1", [null, undefined], {}, [
        formatter,
        formatter,
      ]);
      expect(result).toBe("Values: NULL and UNDEFINED");
    });

    test("should handle formatter throwing error", () => {
      const badFormatter = () => {
        throw new Error("Formatter error");
      };
      expect(() =>
        formatStringTemplate("Value: $0", [42], {}, [badFormatter]),
      ).toThrow("Formatter error");
    });

    test("should handle formatter returning non-string (auto-converted)", () => {
      const formatter = () => 123 as any; // Returns number instead of string
      const result = formatStringTemplate("Value: $0", ["test"], {}, [formatter]);
      expect(result).toBe("Value: 123");
    });
  });
});
