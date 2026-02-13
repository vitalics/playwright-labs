import { test, expect } from "@playwright/test";
import { formatStringTemplate } from "../src/formatStringTemplate";

test.describe("transformName - Named Parameters", () => {
  test.describe("Basic Named Parameters", () => {
    test("should replace $name with value from context", () => {
      const result = formatStringTemplate(
        "User $name logged in",
        [],
        { name: { value: "john" } },
        []
      );
      expect(result).toBe("User john logged in");
    });

    test("should replace multiple named parameters", () => {
      const result = formatStringTemplate(
        "User $name has role $role",
        [],
        {
          name: { value: "john" },
          role: { value: "admin" }
        },
        []
      );
      expect(result).toBe("User john has role admin");
    });

    test("should handle named parameters with underscores", () => {
      const result = formatStringTemplate(
        "User $user_name has $user_role",
        [],
        {
          user_name: { value: "john_doe" },
          user_role: { value: "admin" }
        },
        []
      );
      expect(result).toBe("User john_doe has admin");
    });

    test("should handle named parameters with numbers", () => {
      const result = formatStringTemplate(
        "User $user1 and $user2",
        [],
        {
          user1: { value: "alice" },
          user2: { value: "bob" }
        },
        []
      );
      expect(result).toBe("User alice and bob");
    });

    test("should handle camelCase named parameters", () => {
      const result = formatStringTemplate(
        "User $userName has $userRole",
        [],
        {
          userName: { value: "john" },
          userRole: { value: "admin" }
        },
        []
      );
      expect(result).toBe("User john has admin");
    });
  });

  test.describe("Named Parameters with Formatters", () => {
    test("should apply formatter from context", () => {
      const result = formatStringTemplate(
        "User $name logged in",
        [],
        {
          name: {
            value: "john",
            formatter: (v) => v.toUpperCase()
          }
        },
        []
      );
      expect(result).toBe("User JOHN logged in");
    });

    test("should use JSON.stringify formatter from context", () => {
      const result = formatStringTemplate(
        "Data: $data",
        [],
        {
          data: {
            value: { id: 1, name: "test" },
            formatter: JSON.stringify
          }
        },
        []
      );
      expect(result).toBe('Data: {"id":1,"name":"test"}');
    });

    test("should apply different formatters to different parameters", () => {
      const result = formatStringTemplate(
        "User $name with id $id",
        [],
        {
          name: {
            value: "john",
            formatter: (v) => v.toUpperCase()
          },
          id: {
            value: 123,
            formatter: (v) => `[${v}]`
          }
        },
        []
      );
      expect(result).toBe("User JOHN with id [123]");
    });

    test("should handle complex objects with formatters", () => {
      const result = formatStringTemplate(
        "Request: $request",
        [],
        {
          request: {
            value: { method: "POST", url: "/api/users" },
            formatter: (req) => `${req.method} ${req.url}`
          }
        },
        []
      );
      expect(result).toBe("Request: POST /api/users");
    });
  });

  test.describe("Mixed: Named Parameters with Indexed", () => {
    test("should handle both $name and $0 in same template", () => {
      const result = formatStringTemplate(
        "User $name has status $0",
        ["active"],
        { name: { value: "john" } },
        []
      );
      expect(result).toBe("User john has status active");
    });

    test("should handle multiple named and indexed parameters", () => {
      const result = formatStringTemplate(
        "User $name ($0) has role $role with level $1",
        ["john@example.com", "5"],
        {
          name: { value: "john" },
          role: { value: "admin" }
        },
        []
      );
      expect(result).toBe("User john (john@example.com) has role admin with level 5");
    });

    test("should prioritize context formatters over indexed formatters", () => {
      const result = formatStringTemplate(
        "User $name and user $0",
        ["alice"],
        {
          name: {
            value: "john",
            formatter: (v) => v.toUpperCase()
          }
        },
        [(v) => v.toLowerCase()] // This applies to $0
      );
      expect(result).toBe("User JOHN and user alice");
    });
  });

  test.describe("Error Handling", () => {
    test("should throw error when named parameter not in context", () => {
      expect(() => formatStringTemplate(
        "User $name logged in",
        [],
        {},
        []
      )).toThrow(
        'Missing parameter for placeholder at position 5: "$name". Parameter not found in context.'
      );
    });

    test("should throw error for missing parameter with multiple params", () => {
      expect(() => formatStringTemplate(
        "User $name has role $role",
        [],
        { name: { value: "john" } },
        []
      )).toThrow(
        'Missing parameter for placeholder at position 20: "$role". Parameter not found in context.'
      );
    });

    test("should throw error when context is null", () => {
      expect(() => formatStringTemplate(
        "User $name logged in",
        [],
        null as any,
        []
      )).toThrow(
        'Missing parameter for placeholder at position 5: "$name". Parameter not found in context.'
      );
    });

    test("should provide correct position in error message", () => {
      expect(() => formatStringTemplate(
        "Some prefix text and then $missingParam here",
        [],
        {},
        []
      )).toThrow(
        'Missing parameter for placeholder at position 26: "$missingParam". Parameter not found in context.'
      );
    });
  });

  test.describe("Edge Cases", () => {
    test("should handle parameter names starting with uppercase", () => {
      const result = formatStringTemplate(
        "User $Name logged in",
        [],
        { Name: { value: "John" } },
        []
      );
      expect(result).toBe("User John logged in");
    });

    test("should handle single character parameter names", () => {
      const result = formatStringTemplate(
        "Values: $a, $b, $c",
        [],
        {
          a: { value: "1" },
          b: { value: "2" },
          c: { value: "3" }
        },
        []
      );
      expect(result).toBe("Values: 1, 2, 3");
    });

    test("should handle parameter at the very end", () => {
      const result = formatStringTemplate(
        "User name is: $name",
        [],
        { name: { value: "john" } },
        []
      );
      expect(result).toBe("User name is: john");
    });

    test("should handle parameter at the very beginning", () => {
      const result = formatStringTemplate(
        "$name is the user",
        [],
        { name: { value: "john" } },
        []
      );
      expect(result).toBe("john is the user");
    });

    test("should handle consecutive named parameters", () => {
      const result = formatStringTemplate(
        "$first$last",
        [],
        {
          first: { value: "John" },
          last: { value: "Doe" }
        },
        []
      );
      expect(result).toBe("JohnDoe");
    });

    test("should handle parameter with special values", () => {
      const result = formatStringTemplate(
        "Value: $param",
        [],
        { param: { value: null } },
        []
      );
      expect(result).toBe("Value: null");
    });

    test("should handle parameter with undefined value", () => {
      const result = formatStringTemplate(
        "Value: $param",
        [],
        { param: { value: undefined } },
        []
      );
      expect(result).toBe("Value: undefined");
    });

    test("should handle parameter with object value", () => {
      const result = formatStringTemplate(
        "Data: $obj",
        [],
        { obj: { value: { key: "value" } } },
        []
      );
      expect(result).toBe("Data: { key: 'value' }");
    });

    test("should handle parameter with array value", () => {
      const result = formatStringTemplate(
        "Items: $arr",
        [],
        { arr: { value: [1, 2, 3] } },
        []
      );
      expect(result).toBe("Items: [ 1, 2, 3 ]");
    });
  });

  test.describe("Real-World Scenarios", () => {
    test("should format like @param decorator example", () => {
      // Mimics: @param("name", JSON.stringify) on property with value "123455"
      // and @step("step use the name: $name")
      const result = formatStringTemplate(
        "step use the name: $name",
        [],
        {
          name: {
            value: "123455",
            formatter: JSON.stringify
          }
        },
        []
      );
      expect(result).toBe('step use the name: "123455"');
    });

    test("should handle test scenario with user data", () => {
      const result = formatStringTemplate(
        "Login as $username with role $role and verify $0",
        ["profile access"],
        {
          username: { value: "admin@test.com" },
          role: { value: "administrator" }
        },
        []
      );
      expect(result).toBe("Login as admin@test.com with role administrator and verify profile access");
    });

    test("should handle API request scenario", () => {
      const result = formatStringTemplate(
        "Send $method request to $endpoint with status $0",
        [200],
        {
          method: { value: "POST", formatter: (v) => v.toUpperCase() },
          endpoint: { value: "/api/users" }
        },
        []
      );
      expect(result).toBe("Send POST request to /api/users with status 200");
    });

    test("should mask sensitive data", () => {
      const maskPassword = (pwd: string) => "*".repeat(pwd.length);
      const result = formatStringTemplate(
        "Login with $username and password $password",
        [],
        {
          username: { value: "admin@test.com" },
          password: { value: "secret123", formatter: maskPassword }
        },
        []
      );
      expect(result).toBe("Login with admin@test.com and password *********");
    });
  });
});
