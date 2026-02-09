import { test as baseTest, expect as baseExpect } from "@playwright/test";

export type Fixture = {
  /**
   * Creates a new environment object by merging the provided env with process.env.
   * The original process.env is restored after the test completes.
   * @param env - The environment variables to merge with process.env
   * @returns The merged environment object
   */
  useEnv: <E extends Record<string, string>>(env: E) => E & typeof process.env;

  /**
   * Sets environment variables for the current test and restores them after the test.
   * Unlike `useEnv`, this actually modifies process.env.
   * @param env - The environment variables to set
   */
  setEnv: <E extends Record<string, string | undefined>>(env: E) => void;

  /**
   * Gets a value from the environment.
   * @param key - The key to look up
   * @param env - Optional custom environment object (defaults to process.env)
   * @returns The value or undefined
   */
  getEnvValue: <
    E extends Record<string, string | undefined>,
    K extends keyof E = keyof E,
  >(
    key: K,
    env?: E,
  ) => E[K] | undefined;

  /**
   * Gets a value from the environment, throwing if it doesn't exist.
   * @param key - The key to look up
   * @param env - Optional custom environment object (defaults to process.env)
   * @returns The value
   * @throws Error if the key is not found
   */
  getEnvValueOrThrow: <
    E extends Record<string, string>,
    K extends keyof E = keyof E,
  >(
    key: K,
    env?: E,
  ) => E[K];

  /**
   * Checks if a key exists in the environment.
   * @param key - The key to check
   * @param env - Optional custom environment object (defaults to process.env)
   * @returns True if the key exists
   */
  hasEnvKey: <E extends Record<string, any>>(key: string, env?: E) => boolean;

  /**
   * Gets all environment keys that match a prefix.
   * @param prefix - The prefix to match
   * @param env - Optional custom environment object (defaults to process.env)
   * @returns Array of matching keys
   */
  getEnvKeysWithPrefix: <E extends Record<string, any>>(
    prefix: string,
    env?: E,
  ) => string[];

  /**
   * Gets all environment entries (key-value pairs) that match a prefix.
   * @param prefix - The prefix to match
   * @param env - Optional custom environment object (defaults to process.env)
   * @returns Object with matching entries
   */
  getEnvEntriesWithPrefix: <E extends Record<string, any>>(
    prefix: string,
    env?: E,
  ) => Record<string, E[keyof E]>;

  /**
   * Removes the prefix from environment keys.
   * @param prefix - The prefix to remove
   * @param env - Optional custom environment object (defaults to process.env)
   * @returns Object with keys that had the prefix removed
   */
  stripEnvPrefix: <E extends Record<string, string>>(
    prefix: string,
    env?: E,
  ) => Record<string, E[keyof E]>;

  /**
   * Clears specific environment variables for the test.
   * The original values are restored after the test.
   * @param keys - The keys to clear
   */
  clearEnvKeys: (keys: string[]) => void;

  /**
   * Gets all environment keys.
   * @param env - Optional custom environment object (defaults to process.env)
   * @returns Array of all keys
   */
  getEnvKeys: <E extends Record<string, string>>(env?: E) => string[];

  /**
   * Creates a snapshot of the current environment.
   * @param env - Optional custom environment object (defaults to process.env)
   * @returns A copy of the environment object
   */
  snapshotEnv: <E extends Record<string, string>>(
    env?: E,
  ) => Record<string, string | undefined>;

  /**
   * Restores environment from a snapshot.
   * @param snapshot - The snapshot to restore
   */
  restoreEnv: (snapshot: Record<string, string | undefined>) => void;
};

/**
 * Extended Playwright test with environment variable fixtures.
 * Provides utilities for managing `process.env` during tests with automatic cleanup.
 */
export const test = baseTest.extend<Fixture>({
  /**
   * Creates a new environment object by merging the provided env with process.env.
   * The original process.env is restored after the test completes.
   */
  useEnv: async ({}, use) => {
    const originalEnv = { ...process.env };
    await use((env) => {
      const newEnv = Object.assign({}, process.env, env);
      return newEnv as typeof env & typeof process.env;
    });
    process.env = originalEnv;
  },

  /**
   * Sets environment variables for the current test and restores them after the test.
   * Unlike `useEnv`, this actually modifies process.env.
   */
  setEnv: async ({}, use) => {
    const originalEnv = { ...process.env };
    const keysSet: string[] = [];

    await use((env) => {
      for (const [key, value] of Object.entries(env)) {
        keysSet.push(key);
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });

    // Restore original environment
    for (const key of keysSet) {
      if (key in originalEnv) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    }
  },

  /**
   * Gets a value from the environment.
   * Falls back to `process.env` if no custom environment object is provided.
   */
  getEnvValue: async ({}, use) => {
    await use((key, env: any) => {
      const targetEnv = env ?? process.env;
      return targetEnv[key as keyof typeof targetEnv];
    });
  },

  /**
   * Gets a value from the environment, throwing if it doesn't exist.
   * @throws Error if the key is not found
   */
  getEnvValueOrThrow: async ({}, use) => {
    await use((key, env: any) => {
      const targetEnv = env ?? process.env;
      const value = targetEnv[key as keyof typeof targetEnv];
      if (value === undefined) {
        throw new Error(`Environment variable '${String(key)}' is not defined`);
      }
      return value;
    });
  },

  /**
   * Checks if a key exists in the environment.
   */
  hasEnvKey: async ({}, use) => {
    await use((key, env) => {
      const targetEnv = env ?? process.env;
      return key in targetEnv;
    });
  },

  /**
   * Gets all environment keys that match a prefix.
   */
  getEnvKeysWithPrefix: async ({}, use) => {
    await use((prefix, env) => {
      const targetEnv = env ?? process.env;
      return Object.keys(targetEnv).filter((key) => key.startsWith(prefix));
    });
  },

  /**
   * Gets all environment entries (key-value pairs) that match a prefix.
   */
  getEnvEntriesWithPrefix: async ({}, use) => {
    await use((prefix, env) => {
      const targetEnv = env ?? process.env;
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(targetEnv)) {
        if (key.startsWith(prefix)) {
          result[key] = value;
        }
      }
      return result;
    });
  },

  /**
   * Removes the prefix from environment keys and returns the resulting entries.
   */
  stripEnvPrefix: async ({}, use) => {
    await use((prefix, env) => {
      const targetEnv = env ?? process.env;
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(targetEnv)) {
        if (key.startsWith(prefix)) {
          const newKey = key.slice(prefix.length);
          result[newKey] = value;
        }
      }
      return result;
    });
  },

  /**
   * Clears specific environment variables for the test.
   * The original values are restored after the test.
   */
  clearEnvKeys: async ({}, use) => {
    const originalValues: Record<string, string | undefined> = {};
    const clearedKeys: string[] = [];

    await use((keys) => {
      for (const key of keys) {
        clearedKeys.push(key);
        originalValues[key] = process.env[key];
        delete process.env[key];
      }
    });

    // Restore original values
    for (const key of clearedKeys) {
      if (originalValues[key] !== undefined) {
        process.env[key] = originalValues[key];
      }
    }
  },

  /**
   * Gets all environment keys.
   */
  getEnvKeys: async ({}, use) => {
    await use((env) => {
      const targetEnv = env ?? process.env;
      return Object.keys(targetEnv);
    });
  },

  /**
   * Creates a snapshot of the current environment.
   */
  snapshotEnv: async ({}, use) => {
    await use((env) => {
      const targetEnv = env ?? process.env;
      return { ...targetEnv };
    });
  },

  /**
   * Restores environment from a snapshot.
   * Clears all current env vars and replaces them with the snapshot values.
   */
  restoreEnv: async ({}, use) => {
    await use((snapshot) => {
      // Clear all current env vars
      for (const key of Object.keys(process.env)) {
        delete process.env[key];
      }
      // Restore from snapshot
      for (const [key, value] of Object.entries(snapshot)) {
        if (value !== undefined) {
          process.env[key] = value;
        }
      }
    });
  },
});

/**
 * Custom matchers for environment variable assertions.
 */
export interface EnvMatchers<R = unknown> {
  /**
   * Asserts that the key exists in process.env.
   */
  toBeInEnv(): R;

  /**
   * Asserts that the key exists in process.env with the specified value.
   * @param value - The expected value
   */
  toBeInEnvWithValue(value: string): R;

  /**
   * Asserts that there are keys in process.env that start with the specified prefix.
   * @param prefix - The prefix to match
   * @param count - Optional minimum count of matching keys
   */
  toHaveEnvKeysWithPrefix(prefix: string, count?: number): R;

  /**
   * Asserts that the key in process.env matches the specified pattern.
   * @param pattern - The regex pattern to match against the value
   */
  toMatchEnvPattern(pattern: RegExp): R;

  /**
   * Asserts that the key in process.env is a valid URL.
   */
  toBeEnvUrl(): R;

  /**
   * Asserts that the key in process.env is a valid number.
   */
  toBeEnvNumber(): R;

  /**
   * Asserts that the key in process.env is a valid boolean string ("true" or "false").
   */
  toBeEnvBoolean(): R;

  /**
   * Asserts that the key in process.env is not empty.
   */
  toBeEnvNotEmpty(): R;

  /**
   * Asserts that the key in process.env is one of the specified values.
   * @param values - The allowed values
   */
  toBeEnvOneOf(values: string[]): R;
}

/**
 * Extended Playwright expect with custom matchers for environment variable assertions.
 */
export const expect = baseExpect.extend({
  /**
   * Asserts that the key exists in `process.env`.
   */
  toBeInEnv(key: string) {
    const pass = key in process.env;
    return {
      message: () =>
        pass
          ? `Expected '${key}' not to be in process.env`
          : `Expected '${key}' to be in process.env`,
      pass,
      actual: process.env[key],
      expected: key,
      name: "toBeInEnv",
    };
  },

  /**
   * Asserts that the key exists in `process.env` with the specified value.
   * @param key - The environment variable key
   * @param value - The expected value
   */
  toBeInEnvWithValue(key: string, value: string) {
    const actualValue = process.env[key];
    const pass = key in process.env && actualValue === value;
    return {
      message: () =>
        pass
          ? `Expected '${key}' not to be in process.env with value '${value}'`
          : `Expected '${key}' to be in process.env with value '${value}', but got '${actualValue}'`,
      pass,
      actual: actualValue,
      expected: value,
      name: "toBeInEnvWithValue",
    };
  },

  /**
   * Asserts that there are keys in `process.env` that start with the specified prefix.
   * @param key - The received value (passed by Playwright)
   * @param prefix - The prefix to match
   * @param count - Minimum count of matching keys (defaults to 1)
   */
  toHaveEnvKeysWithPrefix(key: string, prefix: string, count: number = 1) {
    const matchingKeys = Object.keys(process.env).filter((k) =>
      k.startsWith(prefix),
    );
    const pass = matchingKeys.length >= count;
    return {
      message: () =>
        pass
          ? `Expected fewer than ${count} keys starting with '${prefix}', found ${matchingKeys.length}: ${matchingKeys.join(", ")}`
          : `Expected at least ${count} keys starting with '${prefix}', found ${matchingKeys.length}${matchingKeys.length > 0 ? `: ${matchingKeys.join(", ")}` : ""}`,
      pass,
      actual: matchingKeys,
      expected: `at least ${count} keys with prefix '${prefix}'`,
      name: "toHaveEnvKeysWithPrefix",
    };
  },

  /**
   * Asserts that the key in `process.env` matches the specified pattern.
   * @param key - The environment variable key
   * @param pattern - The regex pattern to match against the value
   */
  toMatchEnvPattern(key: string, pattern: RegExp) {
    const value = process.env[key];
    const pass = value !== undefined && pattern.test(value);
    return {
      message: () =>
        pass
          ? `Expected '${key}' value '${value}' not to match pattern ${pattern}`
          : `Expected '${key}' value '${value}' to match pattern ${pattern}`,
      pass,
      actual: value,
      expected: pattern.toString(),
      name: "toMatchEnvPattern",
    };
  },

  /**
   * Asserts that the key in `process.env` is a valid URL.
   * @param key - The environment variable key
   */
  toBeEnvUrl(key: string) {
    const value = process.env[key];
    let pass = false;
    if (value !== undefined) {
      try {
        new URL(value);
        pass = true;
      } catch {
        pass = false;
      }
    }
    return {
      message: () =>
        pass
          ? `Expected '${key}' value '${value}' not to be a valid URL`
          : `Expected '${key}' value '${value}' to be a valid URL`,
      pass,
      actual: value,
      expected: "a valid URL",
      name: "toBeEnvUrl",
    };
  },

  /**
   * Asserts that the key in `process.env` is a valid number.
   * @param key - The environment variable key
   */
  toBeEnvNumber(key: string) {
    const value = process.env[key];
    const pass = value !== undefined && !isNaN(Number(value));
    return {
      message: () =>
        pass
          ? `Expected '${key}' value '${value}' not to be a valid number`
          : `Expected '${key}' value '${value}' to be a valid number`,
      pass,
      actual: value,
      expected: "a valid number",
      name: "toBeEnvNumber",
    };
  },

  /**
   * Asserts that the key in `process.env` is a valid boolean string ("true" or "false").
   * @param key - The environment variable key
   */
  toBeEnvBoolean(key: string) {
    const value = process.env[key];
    const pass =
      value === "true" || value === "false" || value === "0" || value === "1";
    return {
      message: () =>
        pass
          ? `Expected '${key}' value '${value}' not to be a boolean string`
          : `Expected '${key}' value '${value}' to be 'true' or 'false'`,
      pass,
      actual: value,
      expected: "'true' or 'false'",
      name: "toBeEnvBoolean",
    };
  },

  /**
   * Asserts that the key in `process.env` is not empty.
   * @param key - The environment variable key
   */
  toBeEnvNotEmpty(key: string) {
    const value = process.env[key];
    const pass = value !== undefined && value !== "";
    return {
      message: () =>
        pass
          ? `Expected '${key}' to be empty or undefined`
          : `Expected '${key}' to have a non-empty value`,
      pass,
      actual: value,
      expected: "a non-empty value",
      name: "toBeEnvNotEmpty",
    };
  },

  /**
   * Asserts that the key in `process.env` is one of the specified values.
   * @param key - The environment variable key
   * @param values - The allowed values
   */
  toBeEnvOneOf(key: string, values: string[]) {
    const value = process.env[key];
    const pass = value !== undefined && values.includes(value);
    return {
      message: () =>
        pass
          ? `Expected '${key}' value '${value}' not to be one of [${values.join(", ")}]`
          : `Expected '${key}' value '${value}' to be one of [${values.join(", ")}]`,
      pass,
      actual: value,
      expected: `one of [${values.join(", ")}]`,
      name: "toBeEnvOneOf",
    };
  },
});

declare module "@playwright/test" {
  interface Matchers<R> extends EnvMatchers<R> {}
}
