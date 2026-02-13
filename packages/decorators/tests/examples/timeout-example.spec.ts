import { describe, test, timeout, beforeAll, beforeEach, use } from "../../src/index";

/**
 * Example demonstrating @timeout decorator usage
 * 
 * The @timeout decorator can be applied to:
 * - Classes (applies to all tests in the class)
 * - Methods (test methods, lifecycle hooks)
 * - Fields (fixture definitions)
 * 
 * Priority: Method timeout > Class timeout > Global timeout
 */

// Example 1: Class-level timeout
@describe("Example 1: Class-Level Timeout")
@timeout(30000) // All tests in this class have 30 second timeout
class SlowIntegrationTests {
  @test("slow database migration")
  async testDatabaseMigration() {
    console.log("Running database migration (max 30s)...");
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log("✓ Migration completed");
  }

  @test("slow data import")
  async testDataImport() {
    console.log("Importing large dataset (max 30s)...");
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log("✓ Import completed");
  }

  @test("slow API warmup")
  async testApiWarmup() {
    console.log("Warming up API cache (max 30s)...");
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log("✓ Warmup completed");
  }
}

// Example 2: Method-level timeout (overrides class timeout)
@describe("Example 2: Mixed Speed Tests")
@timeout(10000) // Default 10 seconds
class MixedSpeedTests {
  @test("fast unit test")
  @timeout(2000) // Override: 2 seconds
  async testFastOperation() {
    console.log("Running fast test (max 2s)...");
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log("✓ Fast test completed");
  }

  @test("medium test")
  async testMediumOperation() {
    console.log("Running medium test (uses class 10s timeout)...");
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log("✓ Medium test completed");
  }

  @test("very slow E2E test")
  @timeout(60000) // Override: 60 seconds
  async testSlowE2EOperation() {
    console.log("Running E2E test (max 60s)...");
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log("✓ E2E test completed");
  }
}

// Example 3: Lifecycle hooks with timeout
@describe("Example 3: Lifecycle Hooks with Timeout")
class LifecycleTimeoutExample {
  static setupData: any;

  @beforeAll()
  @timeout(60000) // 60 seconds for expensive setup
  static async setupExpensiveResources() {
    console.log("Setting up expensive resources (max 60s)...");
    await new Promise(resolve => setTimeout(resolve, 500));
    this.setupData = { initialized: true };
    console.log("✓ Expensive setup completed");
  }

  @beforeEach()
  @timeout(5000) // 5 seconds per test setup
  async setupTestData() {
    console.log("  ↳ Setting up test data (max 5s)...");
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  @test("test with lifecycle timeouts")
  @timeout(10000)
  async testOperation() {
    console.log("    → Running test (max 10s)");
    if (!LifecycleTimeoutExample.setupData?.initialized) {
      throw new Error("Setup should be complete");
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log("    ✓ Test completed");
  }
}

// Example 4: Field-level timeout with fixtures
@describe("Example 4: Fixture Timeout")
class FixtureTimeoutExample {
  @use.define({ auto: true })
  @timeout(15000) // 15 seconds to initialize database
  database = {
    connect: async () => {
      console.log("  ↳ Connecting to database (max 15s)...");
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log("  ✓ Database connected");
      return { connected: true };
    }
  };

  @test("test with fixture timeout")
  @timeout(10000)
  async testDatabaseQuery() {
    console.log("    → Running database test (max 10s)");
    const db = await this.database.connect();
    if (!db.connected) {
      throw new Error("Database should be connected");
    }
    console.log("    ✓ Database test completed");
  }
}

// Example 5: Real-world scenario - E2E tests
@describe("Example 5: E2E Test Suite")
@timeout(120000) // Default 2 minutes for E2E tests
class E2ETestSuite {
  @beforeAll()
  @timeout(180000) // 3 minutes for environment setup
  static async setupEnvironment() {
    console.log("Setting up test environment (max 3m)...");
    console.log("  → Starting servers...");
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log("  → Seeding database...");
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log("  → Warming up cache...");
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log("✓ Environment ready");
  }

  @test("quick smoke test")
  @timeout(30000) // 30 seconds
  async smokeTest() {
    console.log("    → Running smoke test (max 30s)");
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log("    ✓ Smoke test passed");
  }

  @test("full checkout flow")
  @timeout(180000) // 3 minutes for complex flow
  async fullCheckoutFlow() {
    console.log("    → Running checkout flow (max 3m)");
    console.log("      • Adding items to cart...");
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log("      • Filling shipping info...");
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log("      • Processing payment...");
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log("      • Confirming order...");
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log("    ✓ Checkout flow completed");
  }

  @test("standard user journey")
  async standardUserJourney() {
    console.log("    → Running user journey (uses class 2m timeout)");
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log("    ✓ User journey completed");
  }
}

// Example 6: Performance testing with strict timeouts
@describe("Example 6: Performance Tests")
class PerformanceTests {
  @test("API should respond within 500ms")
  @timeout(500)
  async testApiResponseTime() {
    console.log("    → Testing API response time (max 500ms)");
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 50));
    const duration = Date.now() - start;
    console.log(`    ✓ API responded in ${duration}ms`);
  }

  @test("Database query should complete within 2s")
  @timeout(2000)
  async testDatabasePerformance() {
    console.log("    → Testing database performance (max 2s)");
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 100));
    const duration = Date.now() - start;
    console.log(`    ✓ Query completed in ${duration}ms`);
  }

  @test("Page load should complete within 5s")
  @timeout(5000)
  async testPageLoadTime() {
    console.log("    → Testing page load time (max 5s)");
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 200));
    const duration = Date.now() - start;
    console.log(`    ✓ Page loaded in ${duration}ms`);
  }
}

// Example 7: Different timeouts for different operations
@describe("Example 7: Operation-Specific Timeouts")
class OperationSpecificTimeouts {
  @test("read operation (fast)")
  @timeout(1000)
  async testReadOperation() {
    console.log("    → Read operation (max 1s)");
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log("    ✓ Read completed");
  }

  @test("write operation (medium)")
  @timeout(5000)
  async testWriteOperation() {
    console.log("    → Write operation (max 5s)");
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log("    ✓ Write completed");
  }

  @test("batch operation (slow)")
  @timeout(30000)
  async testBatchOperation() {
    console.log("    → Batch operation (max 30s)");
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log("    ✓ Batch completed");
  }

  @test("report generation (very slow)")
  @timeout(120000)
  async testReportGeneration() {
    console.log("    → Report generation (max 2m)");
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log("    ✓ Report generated");
  }
}
