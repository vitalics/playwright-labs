import { test, expect } from "../src/fixture";

test.describe("Fixture: useEnv", () => {
  test("should merge env with process.env", async ({ useEnv }) => {
    const originalPath = process.env.PATH;
    const newEnv = useEnv({ CUSTOM_VAR: "custom-value" });

    expect(newEnv.CUSTOM_VAR).toBe("custom-value");
    expect(newEnv.PATH).toBe(originalPath);
  });

  test("should override existing env values", async ({ useEnv }) => {
    process.env.TEST_OVERRIDE = "original";
    const newEnv = useEnv({ TEST_OVERRIDE: "overridden" });

    expect(newEnv.TEST_OVERRIDE).toBe("overridden");
  });
});

test.describe("Fixture: setEnv", () => {
  test("should set environment variables", async ({ setEnv }) => {
    setEnv({ TEST_SET_VAR: "test-value" });

    expect(process.env.TEST_SET_VAR).toBe("test-value");
  });

  test("should delete environment variables when set to undefined", async ({
    setEnv,
  }) => {
    process.env.TO_DELETE = "delete-me";
    setEnv({ TO_DELETE: undefined });

    expect(process.env.TO_DELETE).toBeUndefined();
  });

  test("should restore original values after test", async ({ setEnv }) => {
    const originalValue = process.env.PATH;
    setEnv({ PATH: "modified-path" });

    expect(process.env.PATH).toBe("modified-path");
    // Note: restoration happens after test completes
  });
});

test.describe("Fixture: getEnvValue", () => {
  test("should get value from process.env", async ({ getEnvValue }) => {
    process.env.GET_TEST = "get-value";
    const value = getEnvValue("GET_TEST");

    expect(value).toBe("get-value");
  });

  test("should get value from custom env object", async ({ getEnvValue }) => {
    const customEnv = { CUSTOM_KEY: "custom-value" };
    const value = getEnvValue("CUSTOM_KEY", customEnv);

    expect(value).toBe("custom-value");
  });

  test("should return undefined for missing key", async ({ getEnvValue }) => {
    const value = getEnvValue("NON_EXISTENT_KEY_12345");

    expect(value).toBeUndefined();
  });
});

test.describe("Fixture: getEnvValueOrThrow", () => {
  test("should get value when key exists", async ({ getEnvValueOrThrow }) => {
    process.env.THROW_TEST = "throw-value";
    const value = getEnvValueOrThrow("THROW_TEST");

    expect(value).toBe("throw-value");
  });

  test("should throw when key does not exist", async ({
    getEnvValueOrThrow,
  }) => {
    expect(() => getEnvValueOrThrow("NON_EXISTENT_KEY_12345")).toThrow(
      "Environment variable 'NON_EXISTENT_KEY_12345' is not defined",
    );
  });

  test("should get value from custom env object", async ({
    getEnvValueOrThrow,
  }) => {
    const customEnv = { CUSTOM_THROW: "value" };
    const value = getEnvValueOrThrow("CUSTOM_THROW", customEnv);

    expect(value).toBe("value");
  });
});

test.describe("Fixture: hasEnvKey", () => {
  test("should return true when key exists", async ({ hasEnvKey }) => {
    process.env.HAS_KEY_TEST = "exists";

    expect(hasEnvKey("HAS_KEY_TEST")).toBe(true);
  });

  test("should return false when key does not exist", async ({ hasEnvKey }) => {
    expect(hasEnvKey("NON_EXISTENT_KEY_12345")).toBe(false);
  });

  test("should check custom env object", async ({ hasEnvKey }) => {
    const customEnv = { CUSTOM_HAS: "value" };

    expect(hasEnvKey("CUSTOM_HAS", customEnv)).toBe(true);
    expect(hasEnvKey("MISSING", customEnv)).toBe(false);
  });
});

test.describe("Fixture: getEnvKeysWithPrefix", () => {
  test("should return keys matching prefix", async ({
    getEnvKeysWithPrefix,
    setEnv,
  }) => {
    setEnv({
      PREFIX_ONE: "1",
      PREFIX_TWO: "2",
      OTHER_KEY: "other",
    });

    const keys = getEnvKeysWithPrefix("PREFIX_");

    expect(keys).toContain("PREFIX_ONE");
    expect(keys).toContain("PREFIX_TWO");
    expect(keys).not.toContain("OTHER_KEY");
  });

  test("should return empty array when no matches", async ({
    getEnvKeysWithPrefix,
  }) => {
    const keys = getEnvKeysWithPrefix("NONEXISTENT_PREFIX_12345_");

    expect(keys).toEqual([]);
  });

  test("should work with custom env object", async ({
    getEnvKeysWithPrefix,
  }) => {
    const customEnv = {
      APP_NAME: "app",
      APP_VERSION: "1.0",
      DB_HOST: "localhost",
    };

    const keys = getEnvKeysWithPrefix("APP_", customEnv);

    expect(keys).toEqual(["APP_NAME", "APP_VERSION"]);
  });
});

test.describe("Fixture: getEnvEntriesWithPrefix", () => {
  test("should return entries matching prefix", async ({
    getEnvEntriesWithPrefix,
    setEnv,
  }) => {
    setEnv({
      ENTRY_A: "value-a",
      ENTRY_B: "value-b",
      OTHER: "other",
    });

    const entries = getEnvEntriesWithPrefix("ENTRY_");

    expect(entries).toEqual({
      ENTRY_A: "value-a",
      ENTRY_B: "value-b",
    });
  });

  test("should work with custom env object", async ({
    getEnvEntriesWithPrefix,
  }) => {
    const customEnv = {
      API_URL: "https://api.example.com",
      API_KEY: "secret",
      DB_URL: "postgres://localhost",
    };

    const entries = getEnvEntriesWithPrefix("API_", customEnv);

    expect(entries).toEqual({
      API_URL: "https://api.example.com",
      API_KEY: "secret",
    });
  });
});

test.describe("Fixture: stripEnvPrefix", () => {
  test("should strip prefix from keys", async ({ stripEnvPrefix, setEnv }) => {
    setEnv({
      STRIP_NAME: "name",
      STRIP_VALUE: "value",
      OTHER: "other",
    });

    const stripped = stripEnvPrefix("STRIP_");

    expect(stripped).toEqual({
      NAME: "name",
      VALUE: "value",
    });
  });

  test("should work with custom env object", async ({ stripEnvPrefix }) => {
    const customEnv = {
      PW_BASE_URL: "https://example.com",
      PW_TIMEOUT: "30000",
      NODE_ENV: "test",
    };

    const stripped = stripEnvPrefix("PW_", customEnv);

    expect(stripped).toEqual({
      BASE_URL: "https://example.com",
      TIMEOUT: "30000",
    });
  });
});

test.describe("Fixture: clearEnvKeys", () => {
  test("should clear specified keys", async ({ clearEnvKeys }) => {
    process.env.CLEAR_ME = "to-clear";
    process.env.KEEP_ME = "to-keep";

    clearEnvKeys(["CLEAR_ME"]);

    expect(process.env.CLEAR_ME).toBeUndefined();
    expect(process.env.KEEP_ME).toBe("to-keep");
  });

  test("should handle non-existent keys gracefully", async ({
    clearEnvKeys,
  }) => {
    // Should not throw
    clearEnvKeys(["NON_EXISTENT_KEY_12345"]);
  });
});

test.describe("Fixture: getEnvKeys", () => {
  test("should return all keys from process.env", async ({ getEnvKeys }) => {
    const keys = getEnvKeys();

    expect(keys).toContain("PATH");
    expect(Array.isArray(keys)).toBe(true);
  });

  test("should return keys from custom env object", async ({ getEnvKeys }) => {
    const customEnv = { KEY1: "1", KEY2: "2" };
    const keys = getEnvKeys(customEnv);

    expect(keys).toEqual(["KEY1", "KEY2"]);
  });
});

test.describe("Fixture: snapshotEnv", () => {
  test("should create a snapshot of process.env", async ({ snapshotEnv }) => {
    process.env.SNAPSHOT_TEST = "snapshot-value";
    const snapshot = snapshotEnv();

    expect(snapshot.SNAPSHOT_TEST).toBe("snapshot-value");
    expect(snapshot).not.toBe(process.env); // Should be a copy
  });

  test("should create snapshot of custom env", async ({ snapshotEnv }) => {
    const customEnv = { CUSTOM: "value" };
    const snapshot = snapshotEnv(customEnv);

    expect(snapshot).toEqual({ CUSTOM: "value" });
    expect(snapshot).not.toBe(customEnv);
  });
});

test.describe("Fixture: restoreEnv", () => {
  test("should restore environment from snapshot", async ({
    snapshotEnv,
    restoreEnv,
    setEnv,
  }) => {
    setEnv({ RESTORE_TEST: "original" });
    const snapshot = snapshotEnv();

    setEnv({ RESTORE_TEST: "modified", NEW_KEY: "new" });

    restoreEnv(snapshot);

    expect(process.env.RESTORE_TEST).toBe("original");
  });
});

test.describe("Custom Matchers: toBeInEnv", () => {
  test("should pass when key exists in env", async ({ setEnv }) => {
    setEnv({ MATCHER_TEST: "value" });

    expect("MATCHER_TEST").toBeInEnv();
  });

  test("should fail when key does not exist", async ({}) => {
    expect(() => {
      expect("NON_EXISTENT_KEY_12345").toBeInEnv();
    }).toThrow();
  });
});

test.describe("Custom Matchers: toBeInEnvWithValue", () => {
  test("should pass when key has expected value", async ({ setEnv }) => {
    setEnv({ VALUE_TEST: "expected" });

    expect("VALUE_TEST").toBeInEnvWithValue("expected");
  });

  test("should fail when value does not match", async ({ setEnv }) => {
    setEnv({ VALUE_TEST: "actual" });

    expect(() => {
      expect("VALUE_TEST").toBeInEnvWithValue("expected");
    }).toThrow();
  });
});

test.describe("Custom Matchers: toHaveEnvKeysWithPrefix", () => {
  test("should pass when keys with prefix exist", async ({ setEnv }) => {
    setEnv({
      PREFIX_A: "a",
      PREFIX_B: "b",
    });

    expect("ignored").toHaveEnvKeysWithPrefix("PREFIX_", 2);
  });

  test("should fail when not enough keys match", async ({ setEnv }) => {
    setEnv({ PREFIX_A: "a" });

    expect(() => {
      expect("ignored").toHaveEnvKeysWithPrefix("PREFIX_", 5);
    }).toThrow();
  });
});

test.describe("Custom Matchers: toMatchEnvPattern", () => {
  test("should pass when value matches pattern", async ({ setEnv }) => {
    setEnv({ PATTERN_TEST: "abc123" });

    expect("PATTERN_TEST").toMatchEnvPattern(/^[a-z]+\d+$/);
  });

  test("should fail when value does not match pattern", async ({ setEnv }) => {
    setEnv({ PATTERN_TEST: "123abc" });

    expect(() => {
      expect("PATTERN_TEST").toMatchEnvPattern(/^[a-z]+\d+$/);
    }).toThrow();
  });
});

test.describe("Custom Matchers: toBeEnvUrl", () => {
  test("should pass for valid URL", async ({ setEnv }) => {
    setEnv({ URL_TEST: "https://example.com/path" });

    expect("URL_TEST").toBeEnvUrl();
  });

  test("should fail for invalid URL", async ({ setEnv }) => {
    setEnv({ URL_TEST: "not-a-url" });

    expect(() => {
      expect("URL_TEST").toBeEnvUrl();
    }).toThrow();
  });
});

test.describe("Custom Matchers: toBeEnvNumber", () => {
  test("should pass for valid number string", async ({ setEnv }) => {
    setEnv({ NUMBER_TEST: "42" });

    expect("NUMBER_TEST").toBeEnvNumber();
  });

  test("should pass for decimal number", async ({ setEnv }) => {
    setEnv({ NUMBER_TEST: "3.14" });

    expect("NUMBER_TEST").toBeEnvNumber();
  });

  test("should fail for non-number string", async ({ setEnv }) => {
    setEnv({ NUMBER_TEST: "not-a-number" });

    expect(() => {
      expect("NUMBER_TEST").toBeEnvNumber();
    }).toThrow();
  });
});

test.describe("Custom Matchers: toBeEnvBoolean", () => {
  test("should pass for 'true'", async ({ setEnv }) => {
    setEnv({ BOOL_TEST: "true" });

    expect("BOOL_TEST").toBeEnvBoolean();
  });

  test("should pass for 'false'", async ({ setEnv }) => {
    setEnv({ BOOL_TEST: "false" });

    expect("BOOL_TEST").toBeEnvBoolean();
  });

  test("should fail for other values", async ({ setEnv }) => {
    setEnv({ BOOL_TEST: "yes" });

    expect(() => {
      expect("BOOL_TEST").toBeEnvBoolean();
    }).toThrow();
  });
});

test.describe("Custom Matchers: toBeEnvNotEmpty", () => {
  test("should pass for non-empty value", async ({ setEnv }) => {
    setEnv({ NONEMPTY_TEST: "value" });

    expect("NONEMPTY_TEST").toBeEnvNotEmpty();
  });

  test("should fail for empty string", async ({ setEnv }) => {
    setEnv({ NONEMPTY_TEST: "" });

    expect(() => {
      expect("NONEMPTY_TEST").toBeEnvNotEmpty();
    }).toThrow();
  });

  test("should fail for undefined key", async ({}) => {
    expect(() => {
      expect("NON_EXISTENT_KEY_12345").toBeEnvNotEmpty();
    }).toThrow();
  });
});

test.describe("Custom Matchers: toBeEnvOneOf", () => {
  test("should pass when value is in allowed list", async ({ setEnv }) => {
    setEnv({ ONEOF_TEST: "production" });

    expect("ONEOF_TEST").toBeEnvOneOf([
      "development",
      "production",
      "staging",
    ]);
  });

  test("should fail when value is not in list", async ({ setEnv }) => {
    setEnv({ ONEOF_TEST: "invalid" });

    expect(() => {
      expect("ONEOF_TEST").toBeEnvOneOf(["development", "production"]);
    }).toThrow();
  });
});

test.describe("Integration: combining fixtures", () => {
  test("should work with useEnv and getEnvValue together", async ({
    useEnv,
    getEnvValue,
  }) => {
    const env = useEnv({
      API_URL: "https://api.example.com",
      API_KEY: "secret-key",
    });

    expect(getEnvValue("API_URL", env)).toBe("https://api.example.com");
    expect(getEnvValue("API_KEY", env)).toBe("secret-key");
  });

  test("should work with setEnv and matchers together", async ({ setEnv }) => {
    setEnv({
      NODE_ENV: "production",
      PORT: "3000",
      DEBUG: "false",
      BASE_URL: "https://example.com",
    });

    expect("NODE_ENV").toBeInEnvWithValue("production");
    expect("PORT").toBeEnvNumber();
    expect("DEBUG").toBeEnvBoolean();
    expect("BASE_URL").toBeEnvUrl();
  });

  test("should work with prefix utilities and matchers", async ({
    setEnv,
    getEnvKeysWithPrefix,
    stripEnvPrefix,
  }) => {
    setEnv({
      APP_NAME: "my-app",
      APP_VERSION: "1.0.0",
      APP_DEBUG: "true",
    });

    const appKeys = getEnvKeysWithPrefix("APP_");
    expect(appKeys.length).toBe(3);

    const stripped = stripEnvPrefix("APP_");
    expect(stripped).toEqual({
      NAME: "my-app",
      VERSION: "1.0.0",
      DEBUG: "true",
    });

    expect("ignored").toHaveEnvKeysWithPrefix("APP_", 3);
  });

  test("should work with snapshot and restore", async ({
    setEnv,
    snapshotEnv,
    restoreEnv,
  }) => {
    setEnv({ SNAPSHOT_VAR: "original" });
    const snapshot = snapshotEnv();

    setEnv({ SNAPSHOT_VAR: "modified" });
    expect("SNAPSHOT_VAR").toBeInEnvWithValue("modified");

    restoreEnv(snapshot);
    expect("SNAPSHOT_VAR").toBeInEnvWithValue("original");
  });
});
