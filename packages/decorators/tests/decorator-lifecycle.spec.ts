import { test as baseTest, expect } from "@playwright/test";
import {
  describe,
  beforeEach,
  beforeAll,
  afterEach,
  afterAll,
  step,
  param,
  test,
} from "../src/index";

// Track execution order
let executionLog: string[] = [];

baseTest.beforeEach(() => {
  executionLog = [];
});

// Basic @beforeEach decorator
@describe("BeforeEach Decorator Tests")
class BeforeEachDecoratorTests {
  counter: number = 0;

  @beforeEach()
  setup() {
    executionLog.push("beforeEach-setup");
    this.counter = 10;
  }

  @test()
  counterInitialized() {
    executionLog.push("test1");
    expect(this.counter).toBe(10);
  }

  @test()
  testCounterStillInitialized() {
    executionLog.push("test2");
    expect(this.counter).toBe(10);
  }
}

// Multiple @beforeEach decorators
@describe("Multiple BeforeEach Tests")
class MultipleBeforeEachTests {
  value1: number = 0;
  value2: string = "";
  value3: boolean = false;

  @beforeEach()
  setupValue1() {
    executionLog.push("beforeEach1");
    this.value1 = 100;
  }

  @beforeEach()
  setupValue2() {
    executionLog.push("beforeEach2");
    this.value2 = "initialized";
  }

  @beforeEach()
  setupValue3() {
    executionLog.push("beforeEach3");
    this.value3 = true;
  }

  @test()
  testAllValuesSet() {
    executionLog.push("test");
    expect(this.value1).toBe(100);
    expect(this.value2).toBe("initialized");
    expect(this.value3).toBe(true);
  }
}

// Basic @afterEach decorator
@describe("AfterEach Decorator Tests")
class AfterEachDecoratorTests {
  resource: any = null;

  @beforeEach()
  allocate() {
    this.resource = { allocated: true };
  }

  @afterEach()
  cleanup() {
    executionLog.push("afterEach-cleanup");
    this.resource = null;
  }

  @test()
  testResourceAllocated() {
    executionLog.push("test1");
    expect(this.resource).toEqual({ allocated: true });
  }

  @test()
  testResourceStillAllocated() {
    executionLog.push("test2");
    expect(this.resource).toEqual({ allocated: true });
  }
}

// Multiple @afterEach decorators
@describe("Multiple AfterEach Tests")
class MultipleAfterEachTests {
  connection: any = null;
  cache: any = null;

  @beforeEach()
  setup() {
    this.connection = { open: true };
    this.cache = { data: {} };
  }

  @afterEach()
  closeConnection() {
    executionLog.push("afterEach1");
    this.connection = null;
  }

  @afterEach()
  clearCache() {
    executionLog.push("afterEach2");
    this.cache = null;
  }

  @test()
  testResourcesAvailable() {
    executionLog.push("test");
    expect(this.connection).toBeDefined();
    expect(this.cache).toBeDefined();
  }
}

// @beforeAll decorator
let beforeAllCounter = 0;

@describe("BeforeAll Decorator Tests")
class BeforeAllDecoratorTests {
  static initialized = false;

  @beforeAll()
  static setupOnce() {
    executionLog.push("beforeAll");
    this.initialized = true;
    beforeAllCounter++;
  }

  @test()
  testBeforeAllRan() {
    expect(BeforeAllDecoratorTests.initialized).toBe(true);
  }

  @test()
  testBeforeAllRanOnlyOnce() {
    expect(BeforeAllDecoratorTests.initialized).toBe(true);
    // beforeAllCounter should still be 1 after all tests
  }

  @test()
  testVerifyBeforeAllCounter() {
    expect(beforeAllCounter).toBe(1);
  }
}

// @afterAll decorator
let afterAllCounter = 0;

@describe("AfterAll Decorator Tests")
class AfterAllDecoratorTests {
  static cleanedUp = false;

  @afterAll()
  static teardownOnce() {
    executionLog.push("afterAll");
    this.cleanedUp = true;
    afterAllCounter++;
  }

  @test()
  testRunning() {
    expect(true).toBe(true);
  }
}

// Combined lifecycle decorators
@describe("Combined Lifecycle Tests")
class CombinedLifecycleTests {
  static globalResource: any = null;
  instanceResource: any = null;

  @beforeAll()
  static setupGlobal() {
    executionLog.push("beforeAll");
    this.globalResource = { global: true };
  }

  @beforeEach()
  setupInstance() {
    executionLog.push("beforeEach");
    this.instanceResource = { instance: true };
  }

  @afterEach()
  cleanupInstance() {
    executionLog.push("afterEach");
    this.instanceResource = null;
  }

  @afterAll()
  static cleanupGlobal() {
    executionLog.push("afterAll");
    this.globalResource = null;
  }

  @test()
  testBothResourcesAvailable() {
    executionLog.push("test1");
    expect(CombinedLifecycleTests.globalResource).toBeDefined();
    expect(this.instanceResource).toBeDefined();
  }

  @test()
  testResourcesStillAvailable() {
    executionLog.push("test2");
    expect(CombinedLifecycleTests.globalResource).toBeDefined();
    expect(this.instanceResource).toBeDefined();
  }
}

// Async lifecycle methods
@describe("Async Lifecycle Tests")
class AsyncLifecycleTests {
  data: any = null;

  @beforeEach()
  async loadData() {
    executionLog.push("asyncBeforeEach");
    this.data = await Promise.resolve({ loaded: true });
  }

  @afterEach()
  async cleanupData() {
    executionLog.push("asyncAfterEach");
    await Promise.resolve();
    this.data = null;
  }

  @test()
  async testDataLoaded() {
    executionLog.push("asyncTest");
    expect(this.data).toEqual({ loaded: true });
  }
}

// Lifecycle with @param decorator
@describe("Lifecycle with @param")
class LifecycleWithParamTests {
  @param("apiUrl")
  baseUrl: string = "https://api.example.com";

  @beforeEach()
  validateConfig() {
    executionLog.push("beforeEach-validateConfig");
    expect(this.baseUrl).toBeDefined();
  }

  @test()
  testConfigAvailable() {
    executionLog.push("test-param");
    expect(this.baseUrl).toBe("https://api.example.com");
  }
}

// Lifecycle with @step decorator
@describe("Lifecycle with @step")
class LifecycleWithStepTests {
  actionResult: string = "";

  @beforeEach()
  resetResult() {
    executionLog.push("beforeEach-reset");
    this.actionResult = "";
  }

  @step("Perform action $0")
  async performAction(action: string) {
    this.actionResult = action;
  }

  @test()
  async testStepExecution() {
    executionLog.push("test-step");
    await this.performAction("test");
    expect(this.actionResult).toBe("test");
  }
}

// Mixing decorator and method name approaches
@describe("Mixed Approach Tests")
class MixedApproachTests {
  value1: number = 0;
  value2: number = 0;

  // Using decorator
  @beforeEach()
  setupWithDecorator() {
    executionLog.push("decorator-beforeEach");
    this.value1 = 1;
  }

  // Using another decorator
  @beforeEach()
  setupWithAnotherDecorator() {
    executionLog.push("decorator2-beforeEach");
    this.value2 = 2;
  }

  @test()
  testBothApproachesWork() {
    executionLog.push("test-mixed");
    expect(this.value1).toBe(1);
    expect(this.value2).toBe(2);
  }
}

// Error handling in lifecycle
@describe("Error Handling in Lifecycle")
class ErrorHandlingLifecycleTests {
  wasCleanedUp: boolean = false;

  @beforeEach()
  setupThatMightFail() {
    executionLog.push("beforeEach-error-test");
    // Setup succeeds
  }

  @afterEach()
  cleanupAlwaysRuns() {
    executionLog.push("afterEach-always");
    this.wasCleanedUp = true;
  }

  @test()
  testNormalExecution() {
    executionLog.push("test-normal");
    expect(true).toBe(true);
  }
}

// Real-world example: Database tests
@describe("Database Operations")
class DatabaseOperationsTests {
  static connection: any = null;
  transaction: any = null;

  @beforeAll()
  static async connectDatabase() {
    executionLog.push("beforeAll-connect");
    this.connection = { connected: true, db: "test" };
  }

  @beforeEach()
  async startTransaction() {
    executionLog.push("beforeEach-transaction");
    this.transaction = { active: true };
  }

  @afterEach()
  async rollbackTransaction() {
    executionLog.push("afterEach-rollback");
    this.transaction = null;
  }

  @afterAll()
  static async disconnectDatabase() {
    executionLog.push("afterAll-disconnect");
    this.connection = null;
  }

  @test()
  testQueryExecution() {
    executionLog.push("test-query");
    expect(DatabaseOperationsTests.connection).toBeDefined();
    expect(this.transaction).toBeDefined();
  }

  @test()
  testAnotherQuery() {
    executionLog.push("test-query2");
    expect(DatabaseOperationsTests.connection).toBeDefined();
    expect(this.transaction).toBeDefined();
  }
}

// Real-world example: File operations
@describe("File Operations")
class FileOperationsTests {
  tempDir: string = "";
  files: string[] = [];

  @beforeAll()
  static createTestDirectory() {
    executionLog.push("beforeAll-createDir");
  }

  @beforeEach()
  setupTempFiles() {
    executionLog.push("beforeEach-setupFiles");
    this.tempDir = `/tmp/test-${Date.now()}`;
    this.files = [];
  }

  @afterEach()
  cleanupFiles() {
    executionLog.push("afterEach-cleanup");
    this.files = [];
  }

  @afterAll()
  static removeTestDirectory() {
    executionLog.push("afterAll-removeDir");
  }

  @test()
  testFileCreation() {
    executionLog.push("test-create");
    this.files.push("file1.txt");
    expect(this.files.length).toBe(1);
  }

  @test()
  testFileModification() {
    executionLog.push("test-modify");
    this.files.push("file2.txt");
    expect(this.files.length).toBe(1);
  }
}

// Real-world example: API client
@describe("API Client Tests")
class ApiClientLifecycleTests {
  static authToken: string = "";
  @param("endpoint")
  apiEndpoint: string = "/users";

  @beforeAll()
  static async authenticate() {
    executionLog.push("beforeAll-auth");
    this.authToken = "test-token-123";
  }

  @beforeEach()
  logRequest() {
    executionLog.push("beforeEach-logRequest");
  }

  @afterEach()
  logResponse() {
    executionLog.push("afterEach-logResponse");
  }

  @step("Request to $endpoint")
  async makeRequest() {
    executionLog.push("step-request");
    return { token: ApiClientLifecycleTests.authToken };
  }

  @test()
  async authenticatedRequest() {
    executionLog.push("test-request");
    const result = await this.makeRequest();
    expect(result.token).toBe("test-token-123");
  }

  @test()
  async verifyExecutionLog() {
    // Add our own log entry to verify the log is working
    executionLog.push("test-verify");

    // This test only sees its own execution log (due to global beforeEach clearing)
    // So we verify that this test's lifecycle events are logged
    const hasBeforeEach = executionLog.some((log) =>
      log.includes("beforeEach"),
    );
    const hasOwnLog = executionLog.some((log) => log.includes("test-verify"));

    expect(hasBeforeEach).toBe(true);
    expect(hasOwnLog).toBe(true);
    expect(executionLog.length).toBeGreaterThan(0);
  }
}
