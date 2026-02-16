import { describe } from "../src/decorator-describe";
import { test } from "../src/decorator-test";
import { use } from "../src/decorator-use";
import { expect } from "@playwright/test";
import { BaseTest } from "../src/baseTest";

@describe("@use.define - Field Fixtures")
class FieldFixtureTests extends BaseTest {
  @use.define({ box: true })
  apiKey = "test-api-key-123";

  @use.define()
  defaultTimeout = 5000;

  @test("should have access to field fixtures")
  async testFieldFixtures() {
    expect(this.apiKey).toBe("test-api-key-123");
    expect(this.defaultTimeout).toBe(5000);
  }

  @test("field fixtures persist across tests")
  async testFieldPersistence() {
    expect(this.apiKey).toBe("test-api-key-123");
  }
}

@describe("@use.define - Getter Fixtures")
class GetterFixtureTests extends BaseTest {
  @use.define({ auto: true })
  get config() {
    return {
      apiUrl: "https://api.example.com",
      timeout: 3000,
      retries: 3,
    };
  }

  @use.define()
  get timestamp() {
    return Date.now();
  }

  @test("should have access to getter fixtures")
  async testGetterFixtures() {
    expect(this.config.apiUrl).toBe("https://api.example.com");
    expect(this.config.timeout).toBe(3000);
    expect(this.config.retries).toBe(3);
  }

  @test("getter is evaluated each time")
  async testGetterEvaluation() {
    const time1 = this.timestamp;
    await new Promise(resolve => setTimeout(resolve, 10));
    const time2 = this.timestamp;
    // Getters are re-evaluated, so times may be different
    expect(typeof time1).toBe("number");
    expect(typeof time2).toBe("number");
  }
}

@describe("@use.define - Multiple Fixtures")
class MultipleFixtureTests extends BaseTest {
  @use.define()
  user = {
    name: "Test User",
    email: "test@example.com",
    role: "admin",
  };

  @use.define({ box: true })
  get authToken() {
    return `token-for-${this.user.email}`;
  }

  @use.define()
  apiVersion = "v2";

  @test("should use multiple fixtures")
  async testMultipleFixtures() {
    expect(this.user.name).toBe("Test User");
    expect(this.authToken).toContain(this.user.email);
    expect(this.apiVersion).toBe("v2");
  }

  @test("fixtures are available in all tests")
  async testFixtureAvailability() {
    expect(this.user.role).toBe("admin");
    expect(this.authToken).toBeTruthy();
  }
}

@describe("@use.define - With Options")
class FixtureOptionsTests extends BaseTest {
  @use.define({ box: true, title: "API Configuration" })
  apiConfig = {
    baseUrl: "https://api.test.com",
    version: "1.0",
  };

  @use.define({ auto: true })
  defaultHeaders = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  @test("should work with fixture options")
  async testWithOptions() {
    expect(this.apiConfig.baseUrl).toBe("https://api.test.com");
    expect(this.defaultHeaders["Content-Type"]).toBe("application/json");
  }
}

@describe("@use.define - Complex Objects")
class ComplexObjectTests extends BaseTest {
  @use.define()
  database = {
    host: "localhost",
    port: 5432,
    database: "testdb",
    user: "testuser",
    password: "testpass",
  };

  @use.define()
  get connectionString() {
    return `postgresql://${this.database.user}:${this.database.password}@${this.database.host}:${this.database.port}/${this.database.database}`;
  }

  @test("should handle complex objects")
  async testComplexObjects() {
    expect(this.database.host).toBe("localhost");
    expect(this.database.port).toBe(5432);
  }

  @test("getter can depend on field fixture")
  async testGetterDependency() {
    expect(this.connectionString).toContain("localhost");
    expect(this.connectionString).toContain("testdb");
  }
}

@describe("@use.define - Arrays and Primitives")
class PrimitiveFixtureTests extends BaseTest {
  @use.define()
  tags = ["smoke", "regression", "critical"];

  @use.define()
  maxRetries = 3;

  @use.define()
  isDebugMode = false;

  @test("should handle array fixtures")
  async testArrayFixtures() {
    expect(this.tags).toHaveLength(3);
    expect(this.tags).toContain("smoke");
  }

  @test("should handle primitive fixtures")
  async testPrimitiveFixtures() {
    expect(this.maxRetries).toBe(3);
    expect(this.isDebugMode).toBe(false);
  }
}
