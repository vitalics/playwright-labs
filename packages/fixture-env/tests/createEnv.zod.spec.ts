import { test, expect } from "@playwright/test";
import { z } from "zod";
import { createEnv } from "../src/zod";

test.describe("createEnv (zod)", () => {
  test.describe("basic functionality", () => {
    test("should return empty object when no options provided", () => {
      const env = createEnv();
      expect(env).toEqual({});
    });

    test("should return empty object when empty schema provided", () => {
      const env = createEnv({
        schema: {},
        env: {},
      });
      expect(env).toEqual({});
    });

    test("should validate and return env values matching schema", () => {
      const env = createEnv({
        schema: {
          API_KEY: z.string(),
          DEBUG: z.string(),
        },
        env: {
          API_KEY: "my-api-key",
          DEBUG: "true",
        },
      });

      expect(env).toEqual({
        API_KEY: "my-api-key",
        DEBUG: "true",
      });
    });
  });

  test.describe("prefix option", () => {
    test("should add prefix to env key lookups", () => {
      const env = createEnv({
        prefix: "APP_",
        schema: {
          API_KEY: z.string(),
          SECRET: z.string(),
        },
        env: {
          APP_API_KEY: "my-api-key",
          APP_SECRET: "my-secret",
        },
      });

      expect(env).toEqual({
        APP_API_KEY: "my-api-key",
        APP_SECRET: "my-secret",
      });
    });

    test("should not find values without prefix when prefix is specified", () => {
      const errors: Error[] = [];
      const env = createEnv({
        prefix: "APP_",
        schema: {
          API_KEY: z.string(),
        },
        env: {
          API_KEY: "my-api-key", // missing APP_ prefix
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toBeInstanceOf(Error);
    });
  });

  test.describe("validation", () => {
    test("should call onValidationError when validation fails", () => {
      const errors: Error[] = [];
      createEnv({
        schema: {
          PORT: z.number(),
        },
        env: {
          PORT: "not-a-number",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toBeInstanceOf(Error);
    });

    test("should validate string with min length", () => {
      const errors: Error[] = [];
      createEnv({
        schema: {
          API_KEY: z.string().min(10),
        },
        env: {
          API_KEY: "short",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors.length).toBeGreaterThan(0);
    });

    test("should pass validation for correct values", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          API_KEY: z.string().min(5),
        },
        env: {
          API_KEY: "my-long-api-key",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env).toEqual({
        API_KEY: "my-long-api-key",
      });
    });

    test("should collect multiple validation errors", () => {
      const errors: Error[] = [];
      createEnv({
        schema: {
          API_KEY: z.string().min(100),
          SECRET: z.string().min(100),
          PORT: z.number(),
        },
        env: {
          API_KEY: "short",
          SECRET: "also-short",
          PORT: "invalid",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors.length).toBe(3);
    });

    test("should handle missing env variables", () => {
      const errors: Error[] = [];
      createEnv({
        schema: {
          REQUIRED_VAR: z.string(),
        },
        env: {},
        onValidationError: (err) => errors.push(err),
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toBeInstanceOf(Error);
    });
  });

  test.describe("readonlyKeys option", () => {
    test("should make keys readonly when readonlyKeys is true", () => {
      const env = createEnv({
        schema: {
          API_KEY: z.string(),
        },
        env: {
          API_KEY: "my-api-key",
        },
        readonlyKeys: true,
      });

      expect(env.API_KEY).toBe("my-api-key");

      // Verify the property is not writable
      const descriptor = Object.getOwnPropertyDescriptor(env, "API_KEY");
      expect(descriptor?.writable).toBe(false);
      expect(descriptor?.configurable).toBe(false);
    });

    test("should keep keys writable when readonlyKeys is false", () => {
      const env = createEnv({
        schema: {
          API_KEY: z.string(),
        },
        env: {
          API_KEY: "my-api-key",
        },
        readonlyKeys: false,
      });

      const descriptor = Object.getOwnPropertyDescriptor(env, "API_KEY");
      expect(descriptor?.writable).toBe(true);
    });

    test("should keep keys writable by default", () => {
      const env = createEnv({
        schema: {
          API_KEY: z.string(),
        },
        env: {
          API_KEY: "my-api-key",
        },
      });

      const descriptor = Object.getOwnPropertyDescriptor(env, "API_KEY");
      expect(descriptor?.writable).toBe(true);
    });
  });

  test.describe("extends option", () => {
    test("should merge extended env objects", () => {
      const baseEnv = createEnv({
        schema: {
          BASE_URL: z.string(),
        },
        env: {
          BASE_URL: "https://example.com",
        },
      });

      const env = createEnv({
        schema: {
          API_KEY: z.string(),
        },
        env: {
          API_KEY: "my-api-key",
        },
        extends: [baseEnv],
      });

      expect(env).toHaveProperty("API_KEY", "my-api-key");
      expect(env).toHaveProperty("BASE_URL", "https://example.com");
    });

    test("should merge multiple extended env objects", () => {
      const authEnv = createEnv({
        schema: {
          AUTH_TOKEN: z.string(),
        },
        env: {
          AUTH_TOKEN: "token-123",
        },
      });

      const dbEnv = createEnv({
        schema: {
          DB_HOST: z.string(),
        },
        env: {
          DB_HOST: "localhost",
        },
      });

      const env = createEnv({
        schema: {
          APP_NAME: z.string(),
        },
        env: {
          APP_NAME: "my-app",
        },
        extends: [authEnv, dbEnv],
      });

      expect(env).toHaveProperty("APP_NAME", "my-app");
      expect(env).toHaveProperty("AUTH_TOKEN", "token-123");
      expect(env).toHaveProperty("DB_HOST", "localhost");
    });

    test("should not apply prefix to extended env keys", () => {
      const baseEnv = createEnv({
        schema: {
          URL: z.string(),
        },
        env: {
          URL: "https://example.com",
        },
      });

      const env = createEnv({
        prefix: "APP_",
        schema: {
          KEY: z.string(),
        },
        env: {
          APP_KEY: "my-key",
        },
        extends: [baseEnv],
      });

      expect(env).toHaveProperty("APP_KEY", "my-key");
      expect(env).toHaveProperty("URL", "https://example.com");
    });
  });

  test.describe("zod schema types", () => {
    test("should validate number schema", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          PORT: z.number(),
        },
        env: {
          PORT: 3000 as unknown as string,
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.PORT).toBe(3000);
    });

    test("should validate boolean schema", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          DEBUG: z.boolean(),
        },
        env: {
          DEBUG: true as unknown as string,
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.DEBUG).toBe(true);
    });

    test("should validate enum schema", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          NODE_ENV: z.enum(["development", "production", "test"]),
        },
        env: {
          NODE_ENV: "production",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.NODE_ENV).toBe("production");
    });

    test("should fail validation for invalid enum value", () => {
      const errors: Error[] = [];
      createEnv({
        schema: {
          NODE_ENV: z.enum(["development", "production", "test"]),
        },
        env: {
          NODE_ENV: "invalid",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors.length).toBeGreaterThan(0);
    });

    test("should validate with zod coerce for string to number", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          PORT: z.coerce.number(),
        },
        env: {
          PORT: "3000",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.PORT).toBe(3000);
    });

    test("should validate with zod coerce for string to boolean", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          DEBUG: z.coerce.boolean(),
        },
        env: {
          DEBUG: "true",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.DEBUG).toBe(true);
    });

    test("should validate url schema", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          API_URL: z.string().url(),
        },
        env: {
          API_URL: "https://api.example.com",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.API_URL).toBe("https://api.example.com");
    });

    test("should fail validation for invalid url", () => {
      const errors: Error[] = [];
      createEnv({
        schema: {
          API_URL: z.string().url(),
        },
        env: {
          API_URL: "not-a-url",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors.length).toBeGreaterThan(0);
    });

    test("should validate email schema", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          ADMIN_EMAIL: z.string().email(),
        },
        env: {
          ADMIN_EMAIL: "admin@example.com",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.ADMIN_EMAIL).toBe("admin@example.com");
    });

    test("should validate with default values", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          PORT: z.coerce.number().default(3000),
          HOST: z.string().default("localhost"),
        },
        env: {},
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.PORT).toBe(3000);
      expect(env.HOST).toBe("localhost");
    });

    test("should validate optional values", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          OPTIONAL_VAR: z.string().optional(),
          REQUIRED_VAR: z.string(),
        },
        env: {
          REQUIRED_VAR: "value",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.REQUIRED_VAR).toBe("value");
      expect(env.OPTIONAL_VAR).toBeUndefined();
    });

    test("should validate with transform", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          TAGS: z.string().transform((val) => val.split(",")),
        },
        env: {
          TAGS: "tag1,tag2,tag3",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.TAGS).toEqual(["tag1", "tag2", "tag3"]);
    });

    test("should validate with regex pattern", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          API_KEY: z.string().regex(/^[A-Z0-9]{32}$/),
        },
        env: {
          API_KEY: "ABCDEFGHIJKLMNOP0123456789ABCDEF",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.API_KEY).toBe("ABCDEFGHIJKLMNOP0123456789ABCDEF");
    });

    test("should fail validation for invalid regex pattern", () => {
      const errors: Error[] = [];
      createEnv({
        schema: {
          API_KEY: z.string().regex(/^[A-Z0-9]{32}$/),
        },
        env: {
          API_KEY: "invalid-key",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  test.describe("edge cases", () => {
    test("should handle empty string values", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          EMPTY_VAR: z.string(),
        },
        env: {
          EMPTY_VAR: "",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.EMPTY_VAR).toBe("");
    });

    test("should handle undefined env object", () => {
      const errors: Error[] = [];
      createEnv({
        schema: {
          VAR: z.string(),
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors.length).toBeGreaterThan(0);
    });

    test("should not call onValidationError when not provided", () => {
      // Should not throw
      const env = createEnv({
        schema: {
          VAR: z.string(),
        },
        env: {},
      });

      expect(env).toBeDefined();
    });

    test("should handle special characters in env values", () => {
      const env = createEnv({
        schema: {
          SPECIAL: z.string(),
        },
        env: {
          SPECIAL: "value with spaces & special=chars!@#$%",
        },
      });

      expect(env.SPECIAL).toBe("value with spaces & special=chars!@#$%");
    });
  });

  test.describe("process.env-like usage", () => {
    test("should work with process.env directly", () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        TEST_API_URL: "https://api.example.com",
        TEST_API_KEY: "secret-key-123",
        TEST_TIMEOUT: "5000",
      };

      try {
        const env = createEnv({
          prefix: "TEST_",
          schema: {
            API_URL: z.string(),
            API_KEY: z.string(),
            TIMEOUT: z.string(),
          },
          env: process.env as Record<string, string>,
        });

        expect(env.TEST_API_URL).toBe("https://api.example.com");
        expect(env.TEST_API_KEY).toBe("secret-key-123");
        expect(env.TEST_TIMEOUT).toBe("5000");
      } finally {
        process.env = originalEnv;
      }
    });

    test("should handle typical web app environment variables", () => {
      const mockProcessEnv: Record<string, string> = {
        NODE_ENV: "production",
        PORT: "3000",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/mydb",
        REDIS_URL: "redis://localhost:6379",
        JWT_SECRET: "super-secret-jwt-key",
        CORS_ORIGIN: "https://myapp.com",
        LOG_LEVEL: "info",
      };

      const env = createEnv({
        schema: {
          NODE_ENV: z.enum(["development", "production", "test"]),
          PORT: z.string(),
          DATABASE_URL: z.string().url(),
          REDIS_URL: z.string().url(),
          JWT_SECRET: z.string().min(10),
          CORS_ORIGIN: z.string().url(),
          LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
        },
        env: mockProcessEnv,
      });

      expect(env.NODE_ENV).toBe("production");
      expect(env.PORT).toBe("3000");
      expect(env.DATABASE_URL).toBe("postgresql://user:pass@localhost:5432/mydb");
      expect(env.JWT_SECRET).toBe("super-secret-jwt-key");
    });

    test("should handle CI/CD environment variables", () => {
      const mockCIEnv: Record<string, string> = {
        CI: "true",
        CI_COMMIT_SHA: "abc123def456",
        CI_COMMIT_REF_NAME: "main",
        CI_PIPELINE_ID: "12345",
        CI_JOB_ID: "67890",
        CI_PROJECT_NAME: "my-project",
        CI_REGISTRY_IMAGE: "registry.example.com/my-project",
      };

      const env = createEnv({
        prefix: "CI_",
        schema: {
          COMMIT_SHA: z.string(),
          COMMIT_REF_NAME: z.string(),
          PIPELINE_ID: z.string(),
          JOB_ID: z.string(),
          PROJECT_NAME: z.string(),
          REGISTRY_IMAGE: z.string(),
        },
        env: mockCIEnv,
      });

      expect(env.CI_COMMIT_SHA).toBe("abc123def456");
      expect(env.CI_COMMIT_REF_NAME).toBe("main");
      expect(env.CI_PIPELINE_ID).toBe("12345");
      expect(env.CI_PROJECT_NAME).toBe("my-project");
    });

    test("should handle AWS-like environment variables", () => {
      const mockAWSEnv: Record<string, string> = {
        AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
        AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        AWS_REGION: "us-east-1",
        AWS_S3_BUCKET: "my-app-bucket",
        AWS_LAMBDA_FUNCTION_NAME: "my-function",
      };

      const env = createEnv({
        prefix: "AWS_",
        schema: {
          ACCESS_KEY_ID: z.string(),
          SECRET_ACCESS_KEY: z.string(),
          REGION: z.string(),
          S3_BUCKET: z.string(),
          LAMBDA_FUNCTION_NAME: z.string(),
        },
        env: mockAWSEnv,
      });

      expect(env.AWS_ACCESS_KEY_ID).toBe("AKIAIOSFODNN7EXAMPLE");
      expect(env.AWS_REGION).toBe("us-east-1");
      expect(env.AWS_S3_BUCKET).toBe("my-app-bucket");
    });

    test("should handle environment with undefined values", () => {
      const errors: Error[] = [];
      const mockEnv: Record<string, string | undefined> = {
        DEFINED_VAR: "value",
        UNDEFINED_VAR: undefined,
      };

      const env = createEnv({
        schema: {
          DEFINED_VAR: z.string(),
          UNDEFINED_VAR: z.string(),
        },
        env: mockEnv as Record<string, string>,
        onValidationError: (err) => errors.push(err),
      });

      expect(env.DEFINED_VAR).toBe("value");
      expect(errors.length).toBeGreaterThan(0);
    });

    test("should handle Playwright-specific environment variables", () => {
      const mockPlaywrightEnv: Record<string, string> = {
        PW_BASE_URL: "https://staging.example.com",
        PW_API_BASE_URL: "https://api.staging.example.com",
        PW_ADMIN_USERNAME: "admin@example.com",
        PW_ADMIN_PASSWORD: "secure-password-123",
        PW_HEADLESS: "true",
        PW_SLOW_MO: "100",
        PW_TIMEOUT: "30000",
      };

      const env = createEnv({
        prefix: "PW_",
        schema: {
          BASE_URL: z.string().url(),
          API_BASE_URL: z.string().url(),
          ADMIN_USERNAME: z.string().email(),
          ADMIN_PASSWORD: z.string(),
          HEADLESS: z.string(),
          SLOW_MO: z.string(),
          TIMEOUT: z.string(),
        },
        env: mockPlaywrightEnv,
      });

      expect(env.PW_BASE_URL).toBe("https://staging.example.com");
      expect(env.PW_API_BASE_URL).toBe("https://api.staging.example.com");
      expect(env.PW_ADMIN_USERNAME).toBe("admin@example.com");
      expect(env.PW_HEADLESS).toBe("true");
      expect(env.PW_TIMEOUT).toBe("30000");
    });

    test("should handle mixed valid and invalid environment variables", () => {
      const errors: Error[] = [];
      const mockEnv: Record<string, string> = {
        VALID_STRING: "hello",
        VALID_URL: "https://example.com",
        INVALID_NUMBER: "not-a-number",
        VALID_ENUM: "debug",
      };

      const env = createEnv({
        schema: {
          VALID_STRING: z.string(),
          VALID_URL: z.string().url(),
          INVALID_NUMBER: z.coerce.number(),
          VALID_ENUM: z.enum(["debug", "info", "error"]),
        },
        env: mockEnv,
        onValidationError: (err) => errors.push(err),
      });

      expect(env.VALID_STRING).toBe("hello");
      expect(env.VALID_URL).toBe("https://example.com");
      expect(env.VALID_ENUM).toBe("debug");
      // z.coerce.number() on "not-a-number" returns NaN which passes coerce but may fail other checks
    });

    test("should handle environment variables with connection strings", () => {
      const mockEnv: Record<string, string> = {
        POSTGRES_URL: "postgres://user:p%40ssw0rd@host:5432/db?sslmode=require",
        MONGODB_URL: "mongodb+srv://user:password@cluster.mongodb.net/mydb",
        REDIS_URL: "rediss://default:token@redis-host:6380",
        AMQP_URL: "amqps://user:pass@rabbitmq.example.com:5671/vhost",
      };

      const env = createEnv({
        schema: {
          POSTGRES_URL: z.string(),
          MONGODB_URL: z.string(),
          REDIS_URL: z.string(),
          AMQP_URL: z.string(),
        },
        env: mockEnv,
      });

      expect(env.POSTGRES_URL).toBe("postgres://user:p%40ssw0rd@host:5432/db?sslmode=require");
      expect(env.MONGODB_URL).toBe("mongodb+srv://user:password@cluster.mongodb.net/mydb");
      expect(env.REDIS_URL).toBe("rediss://default:token@redis-host:6380");
      expect(env.AMQP_URL).toBe("amqps://user:pass@rabbitmq.example.com:5671/vhost");
    });

    test("should handle multi-environment configuration", () => {
      const baseConfig = createEnv({
        schema: {
          APP_NAME: z.string(),
          APP_VERSION: z.string(),
        },
        env: {
          APP_NAME: "my-app",
          APP_VERSION: "1.0.0",
        },
      });

      const stagingEnv: Record<string, string> = {
        STAGING_API_URL: "https://api.staging.example.com",
        STAGING_DEBUG: "true",
      };

      const env = createEnv({
        prefix: "STAGING_",
        schema: {
          API_URL: z.string().url(),
          DEBUG: z.string(),
        },
        env: stagingEnv,
        extends: [baseConfig],
      });

      // Extended keys should not have the prefix applied
      expect(env.APP_NAME).toBe("my-app");
      expect(env.APP_VERSION).toBe("1.0.0");
      // Own schema keys get the prefix applied
      expect(env.STAGING_API_URL).toBe("https://api.staging.example.com");
      expect(env.STAGING_DEBUG).toBe("true");
    });
  });

  test.describe("zod-specific features", () => {
    test("should validate with union types", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          LOG_LEVEL: z.union([
            z.literal("debug"),
            z.literal("info"),
            z.literal("warn"),
            z.literal("error"),
          ]),
        },
        env: {
          LOG_LEVEL: "info",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.LOG_LEVEL).toBe("info");
    });

    test("should validate with refine", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          PORT: z.coerce.number().refine((val) => val >= 1 && val <= 65535, {
            message: "Port must be between 1 and 65535",
          }),
        },
        env: {
          PORT: "8080",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.PORT).toBe(8080);
    });

    test("should fail validation with refine for invalid value", () => {
      const errors: Error[] = [];
      createEnv({
        schema: {
          PORT: z.coerce.number().refine((val) => val >= 1 && val <= 65535, {
            message: "Port must be between 1 and 65535",
          }),
        },
        env: {
          PORT: "99999",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors.length).toBeGreaterThan(0);
    });

    test("should validate with pipe for transformations", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          MAX_RETRIES: z.string().pipe(z.coerce.number().int().positive()),
        },
        env: {
          MAX_RETRIES: "5",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.MAX_RETRIES).toBe(5);
    });

    test("should validate with catch for fallback values", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          TIMEOUT: z.coerce.number().catch(5000),
        },
        env: {
          TIMEOUT: "invalid",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.TIMEOUT).toBe(5000);
    });

    test("should validate nullable schema", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          NULLABLE_VAR: z.string().nullable(),
        },
        env: {
          NULLABLE_VAR: null as unknown as string,
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.NULLABLE_VAR).toBeNull();
    });

    test("should validate with preprocessing", () => {
      const errors: Error[] = [];
      const env = createEnv({
        schema: {
          TRIMMED: z.preprocess((val) => {
            if (typeof val === "string") return val.trim();
            return val;
          }, z.string()),
        },
        env: {
          TRIMMED: "  hello world  ",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.TRIMMED).toBe("hello world");
    });

    test("should validate with brand for nominal typing", () => {
      const errors: Error[] = [];
      const BrandedApiKey = z.string().min(10).brand<"ApiKey">();

      const env = createEnv({
        schema: {
          API_KEY: BrandedApiKey,
        },
        env: {
          API_KEY: "my-secure-api-key",
        },
        onValidationError: (err) => errors.push(err),
      });

      expect(errors).toEqual([]);
      expect(env.API_KEY).toBe("my-secure-api-key");
    });
  });
});
