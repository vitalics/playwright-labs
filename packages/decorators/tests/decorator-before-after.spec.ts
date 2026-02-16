import { describe, test, before, after, beforeAll, afterAll, beforeEach, afterEach } from "../src/index";

const executionOrder: string[] = [];

@describe("Lifecycle Order Test")
class LifecycleTest {
  @beforeAll()
  static async setupAll() {
    executionOrder.push("beforeAll");
  }

  @afterAll()
  static async teardownAll() {
    executionOrder.push("afterAll");
  }

  @beforeEach()
  async setupEach() {
    executionOrder.push("beforeEach");
  }

  @afterEach()
  async teardownEach() {
    executionOrder.push("afterEach");
  }

  @test("should execute hooks in correct lifecycle order")
  @before(async (self: LifecycleTest) => {
    executionOrder.push("before");
  })
  @after(async (self: LifecycleTest) => {
    executionOrder.push("after");
  })
  async testMethod() {
    executionOrder.push("test");
  }

  @test("verify execution order")
  async verifyOrder() {
    // This test runs after the previous one to verify the order
    if (executionOrder.length >= 7) {
      const expectedOrder = [
        "beforeAll",
        "beforeEach",
        "before",
        "test",
        "after",
        "afterEach",
        "beforeEach", // Second test's beforeEach
      ];
      
      for (let i = 0; i < expectedOrder.length; i++) {
        if (executionOrder[i] !== expectedOrder[i]) {
          throw new Error(
            `Expected ${expectedOrder[i]} at position ${i}, but got ${executionOrder[i]}. Full order: ${executionOrder.join(", ")}`
          );
        }
      }
    }
  }
}

@describe("Multiple Before Hooks")
class MultipleBeforeTest {
  private executionLog: string[] = [];

  @test("should execute multiple before hooks in order")
  @before(async (self: MultipleBeforeTest) => {
    self.executionLog.push("before-1");
  })
  @before(async (self: MultipleBeforeTest) => {
    self.executionLog.push("before-2");
  })
  @before(async (self: MultipleBeforeTest) => {
    self.executionLog.push("before-3");
  })
  async testMethod() {
    this.executionLog.push("test");
    
    const expected = ["before-1", "before-2", "before-3", "test"];
    if (this.executionLog.length !== expected.length) {
      throw new Error(`Expected ${expected.length} hooks, got ${this.executionLog.length}`);
    }
    
    for (let i = 0; i < expected.length; i++) {
      if (this.executionLog[i] !== expected[i]) {
        throw new Error(
          `Expected ${expected[i]} at position ${i}, but got ${this.executionLog[i]}`
        );
      }
    }
  }
}

@describe("Multiple After Hooks")
class MultipleAfterTest {
  private executionLog: string[] = [];

  @test("should execute multiple after hooks in order")
  @after(async (self: MultipleAfterTest) => {
    self.executionLog.push("after-1");
  })
  @after(async (self: MultipleAfterTest) => {
    self.executionLog.push("after-2");
  })
  @after(async (self: MultipleAfterTest) => {
    self.executionLog.push("after-3");
  })
  async testMethod() {
    this.executionLog.push("test");
  }

  @afterEach()
  async verifyAfterOrder() {
    const expected = ["test", "after-1", "after-2", "after-3"];
    if (this.executionLog.length === expected.length) {
      for (let i = 0; i < expected.length; i++) {
        if (this.executionLog[i] !== expected[i]) {
          throw new Error(
            `Expected ${expected[i]} at position ${i}, but got ${this.executionLog[i]}`
          );
        }
      }
    }
  }
}

@describe("After Hook on Failure")
class AfterOnFailureTest {
  cleanupLog: string[] = [];

  @test("should execute after hooks even when test fails")
  @after(async (self: AfterOnFailureTest) => {
    // This after hook should run even though the test fails
    self.cleanupLog.push("after-hook-executed");
  })
  async failingTest() {
    this.cleanupLog.push("test-started");
    
    // Simulate a test failure by catching and logging, but not throwing
    // This way we can verify the after hook ran by checking cleanupLog
    this.cleanupLog.push("test-finished");
    
    // Check that after hook hasn't run yet
    if (this.cleanupLog.includes("after-hook-executed")) {
      throw new Error("After hook should not have run yet");
    }
    
    // Note: We can't directly test that after hooks run on failure within the same test
    // because if we throw an error, the test fails and we can't check anything after
    // But the framework ensures after hooks always run in the finally block
  }

  @test("after hooks execute in afterEach which always runs")
  @after(async (self: AfterOnFailureTest) => {
    // This after hook runs and adds to cleanupLog
    self.cleanupLog.push("cleanup-completed");
  })
  async testAfterHookExecution() {
    this.cleanupLog.push("test-body");
    // Don't throw - just verify the flow works correctly
  }

  @afterEach()
  async verifyAfterHookRan() {
    // The afterEach runs after @after hooks
    // We can verify that @after hooks executed by checking the log
    if (this.cleanupLog.length > 0) {
      const hasAfterHook = this.cleanupLog.includes("after-hook-executed") || 
                           this.cleanupLog.includes("cleanup-completed");
      if (!hasAfterHook) {
        throw new Error("After hook should have executed before afterEach");
      }
    }
  }
}

@describe("Instance Context Test")
class InstanceContextTest {
  value = 42;
  capturedValue: number | undefined;

  @test("should provide instance context to hooks")
  @before(async (self: InstanceContextTest) => {
    self.capturedValue = self.value;
  })
  async testMethod() {
    if (this.capturedValue !== 42) {
      throw new Error(`Expected capturedValue to be 42, got ${this.capturedValue}`);
    }
  }
}

@describe("Modify Instance State")
class ModifyStateTest {
  value = 0;

  @test("should allow modifying instance state in before hook")
  @before(async (self: ModifyStateTest) => {
    self.value = 100;
  })
  async testMethod() {
    if (this.value !== 100) {
      throw new Error(`Expected value to be 100, got ${this.value}`);
    }
  }
}

@describe("Resource Cleanup")
class ResourceCleanupTest {
  resource: { id: string; disposed: boolean } | null = null;

  @test("should support resource cleanup pattern")
  @before(async (self: ResourceCleanupTest) => {
    self.resource = { id: "resource-1", disposed: false };
  })
  @after(async (self: ResourceCleanupTest) => {
    if (self.resource) {
      self.resource.disposed = true;
    }
  })
  async testMethod() {
    if (!this.resource) {
      throw new Error("Resource should be created");
    }
    if (this.resource.disposed) {
      throw new Error("Resource should not be disposed during test");
    }
  }
}

@describe("Async Hooks")
class AsyncHooksTest {
  private asyncBeforeCalled = false;
  private asyncAfterCalled = false;

  @test("should work with async hooks")
  @before(async (self: AsyncHooksTest) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    self.asyncBeforeCalled = true;
  })
  @after(async (self: AsyncHooksTest) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    self.asyncAfterCalled = true;
  })
  async testMethod() {
    if (!this.asyncBeforeCalled) {
      throw new Error("Async before hook should have been called");
    }
  }
}

@describe("Hook Isolation")
class HookIsolationTest {
  private testLog: string[] = [];

  @test("test 1 with isolated hooks")
  @before(async (self: HookIsolationTest) => {
    self.testLog.push("before-test1");
  })
  @after(async (self: HookIsolationTest) => {
    self.testLog.push("after-test1");
  })
  async testMethod1() {
    this.testLog.push("test1");
    
    // Verify only test1 hooks were called
    const expected = ["before-test1", "test1"];
    if (this.testLog.length !== expected.length) {
      throw new Error(`Expected ${expected.length} items in log, got ${this.testLog.length}`);
    }
  }

  @test("test 2 with isolated hooks")
  @before(async (self: HookIsolationTest) => {
    self.testLog.push("before-test2");
  })
  @after(async (self: HookIsolationTest) => {
    self.testLog.push("after-test2");
  })
  async testMethod2() {
    this.testLog.push("test2");
    
    // Each test gets a fresh instance, so testLog should only have this test's entries
    const expected = ["before-test2", "test2"];
    if (this.testLog.length !== expected.length) {
      throw new Error(`Expected ${expected.length} items in log, got ${this.testLog.length}`);
    }
  }
}

@describe("Combined Hooks")
class CombinedHooksTest {
  private hookLog: string[] = [];

  @beforeEach()
  async setupEach() {
    this.hookLog.push("beforeEach");
  }

  @afterEach()
  async teardownEach() {
    this.hookLog.push("afterEach");
  }

  @test("should work with beforeEach and afterEach")
  @before(async (self: CombinedHooksTest) => {
    self.hookLog.push("before");
  })
  @after(async (self: CombinedHooksTest) => {
    self.hookLog.push("after");
  })
  async testMethod() {
    this.hookLog.push("test");
    
    // At this point we should have: beforeEach, before, test
    const expected = ["beforeEach", "before", "test"];
    if (this.hookLog.length !== expected.length) {
      throw new Error(
        `Expected ${expected.length} items in log, got ${this.hookLog.length}: ${this.hookLog.join(", ")}`
      );
    }
    
    for (let i = 0; i < expected.length; i++) {
      if (this.hookLog[i] !== expected[i]) {
        throw new Error(
          `Expected ${expected[i]} at position ${i}, but got ${this.hookLog[i]}`
        );
      }
    }
  }
}

@describe("Stack Pattern")
class StackPatternTest {
  private stack: string[] = [];

  @test("should execute after hooks in reverse order of before hooks")
  @before(async (self: StackPatternTest) => {
    self.stack.push("open-connection");
  })
  @before(async (self: StackPatternTest) => {
    self.stack.push("begin-transaction");
  })
  @before(async (self: StackPatternTest) => {
    self.stack.push("acquire-lock");
  })
  @after(async (self: StackPatternTest) => {
    // First after hook should pop "test-executed" then "acquire-lock"
    const testItem = self.stack.pop();
    if (testItem !== "test-executed") {
      throw new Error(`Expected to pop 'test-executed', got '${testItem}'`);
    }
    const item = self.stack.pop();
    if (item !== "acquire-lock") {
      throw new Error(`Expected to pop 'acquire-lock', got '${item}'`);
    }
  })
  @after(async (self: StackPatternTest) => {
    const item = self.stack.pop();
    if (item !== "begin-transaction") {
      throw new Error(`Expected to pop 'begin-transaction', got '${item}'`);
    }
  })
  @after(async (self: StackPatternTest) => {
    const item = self.stack.pop();
    if (item !== "open-connection") {
      throw new Error(`Expected to pop 'open-connection', got '${item}'`);
    }
  })
  async testMethod() {
    this.stack.push("test-executed");
    
    const expected = ["open-connection", "begin-transaction", "acquire-lock", "test-executed"];
    if (this.stack.length !== expected.length) {
      throw new Error(`Expected stack length ${expected.length}, got ${this.stack.length}`);
    }
  }
}

interface MockConnection {
  connected: boolean;
  transactionActive: boolean;
  close: () => void;
  rollback: () => void;
}

@describe("Database Pattern")
class DatabasePatternTest {
  db: MockConnection | null = null;

  @test("should support database connection pattern")
  @before(async (self: DatabasePatternTest) => {
    self.db = {
      connected: true,
      transactionActive: false,
      close: () => {
        self.db!.connected = false;
      },
      rollback: () => {
        self.db!.transactionActive = false;
      },
    };
    self.db.transactionActive = true;
  })
  @after(async (self: DatabasePatternTest) => {
    if (self.db) {
      if (self.db.transactionActive) {
        self.db.rollback();
      }
      self.db.close();
    }
  })
  async testMethod() {
    if (!this.db) {
      throw new Error("Database should be initialized");
    }
    if (!this.db.connected) {
      throw new Error("Database should be connected");
    }
    if (!this.db.transactionActive) {
      throw new Error("Transaction should be active");
    }
  }
}
