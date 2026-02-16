import { describe, test, timeout, before, after, beforeEach, afterEach, use } from "../../src/index";

/**
 * Example demonstrating combined usage of @timeout, @before, and @after decorators
 * 
 * Shows realistic scenarios where these decorators work together to create
 * robust, well-configured tests with proper setup, cleanup, and timeout management.
 */

// Example 1: Database tests with setup, cleanup, and timeouts
@describe("Example 1: Database Operations")
@timeout(30000) // Default 30s for database operations
class DatabaseTests {
  private connection: any = null;
  private transaction: any = null;

  @beforeEach()
  @timeout(10000) // 10s to establish connection
  async connectToDatabase() {
    console.log("  ↳ Connecting to database (max 10s)...");
    await new Promise(resolve => setTimeout(resolve, 200));
    this.connection = { connected: true, queries: [] };
    console.log("  ✓ Connected");
  }

  @afterEach()
  async disconnectFromDatabase() {
    if (this.connection) {
      console.log("  ↳ Disconnecting from database...");
      this.connection.connected = false;
      console.log("  ✓ Disconnected");
    }
  }

  @test("complex query with transaction")
  @timeout(60000) // Override: 60s for complex operation
  @before(async (self: DatabaseTests) => {
    console.log("    ↳ Starting transaction...");
    self.transaction = { active: true, operations: [] };
    console.log("    ✓ Transaction started");
  })
  @after(async (self: DatabaseTests) => {
    if (self.transaction && self.transaction.active) {
      console.log("    ↳ Rolling back transaction...");
      self.transaction.active = false;
      console.log("    ✓ Transaction rolled back");
    }
  })
  async testComplexQuery() {
    console.log("      → Executing complex query...");
    await new Promise(resolve => setTimeout(resolve, 300));
    this.transaction.operations.push("INSERT INTO users");
    this.transaction.operations.push("UPDATE profiles");
    console.log(`      ✓ Query completed (${this.transaction.operations.length} operations)`);
  }

  @test("simple query")
  @timeout(5000) // Override: 5s for simple query
  async testSimpleQuery() {
    console.log("      → Executing simple query...");
    await new Promise(resolve => setTimeout(resolve, 100));
    this.connection.queries.push("SELECT * FROM users");
    console.log("      ✓ Simple query completed");
  }
}

// Example 2: API tests with authentication and timeouts
@describe("Example 2: API Integration Tests")
@timeout(15000) // Default 15s for API tests
class ApiTests {
  private authToken: string | null = null;
  private apiClient: any = null;

  @test("authenticated API call")
  @timeout(10000) // 10s total for auth + API call
  @before(async (self: ApiTests) => {
    console.log("    ↳ Authenticating (max 10s)...");
    await new Promise(resolve => setTimeout(resolve, 200));
    self.authToken = "mock-token-abc123";
    self.apiClient = {
      token: self.authToken,
      get: async (endpoint: string) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { status: 200, data: { endpoint } };
      }
    };
    console.log("    ✓ Authenticated");
  })
  @after(async (self: ApiTests) => {
    if (self.authToken) {
      console.log("    ↳ Invalidating token...");
      await new Promise(resolve => setTimeout(resolve, 50));
      self.authToken = null;
      self.apiClient = null;
      console.log("    ✓ Token invalidated");
    }
  })
  async testAuthenticatedEndpoint() {
    console.log("      → Calling API endpoint...");
    const response = await this.apiClient.get("/api/users");
    if (response.status !== 200) {
      throw new Error("API call failed");
    }
    console.log("      ✓ API call successful");
  }

  @test("batch API calls")
  @timeout(30000) // 30s for multiple API calls
  @before(async (self: ApiTests) => {
    console.log("    ↳ Setting up batch client...");
    self.apiClient = {
      batchGet: async (endpoints: string[]) => {
        await new Promise(resolve => setTimeout(resolve, 200 * endpoints.length));
        return endpoints.map(endpoint => ({ status: 200, endpoint }));
      }
    };
    console.log("    ✓ Batch client ready");
  })
  async testBatchCalls() {
    console.log("      → Making batch API calls...");
    const results = await this.apiClient.batchGet(["/api/users", "/api/posts", "/api/comments"]);
    console.log(`      ✓ Batch completed (${results.length} calls)`);
  }
}

// Example 3: File operations with resource management
@describe("Example 3: File Processing")
class FileProcessingTests {
  private tempFiles: string[] = [];
  private fileHandle: any = null;

  @test("process large file")
  @timeout(60000) // 60s for large file processing
  @before(async (self: FileProcessingTests) => {
    console.log("    ↳ Creating temp file...");
    const tempFile = `/tmp/large-file-${Date.now()}.dat`;
    self.tempFiles.push(tempFile);
    self.fileHandle = {
      path: tempFile,
      size: 1024 * 1024 * 100, // 100MB
      write: async (data: string) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return data.length;
      },
      read: async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return "file content";
      }
    };
    console.log(`    ✓ Created temp file: ${tempFile}`);
  })
  @after(async (self: FileProcessingTests) => {
    console.log("    ↳ Cleaning up temp files...");
    for (const file of self.tempFiles) {
      await new Promise(resolve => setTimeout(resolve, 50));
      console.log(`    ✓ Removed: ${file}`);
    }
    self.tempFiles = [];
  })
  async testLargeFileProcessing() {
    console.log("      → Writing to large file...");
    await this.fileHandle.write("test data");
    console.log("      → Reading from large file...");
    const content = await this.fileHandle.read();
    console.log(`      ✓ Processed ${this.fileHandle.size} bytes`);
  }

  @test("process multiple files")
  @timeout(90000) // 90s for multiple files
  @before(async (self: FileProcessingTests) => {
    console.log("    ↳ Creating multiple temp files...");
    for (let i = 0; i < 5; i++) {
      const tempFile = `/tmp/file-${i}-${Date.now()}.dat`;
      self.tempFiles.push(tempFile);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    console.log(`    ✓ Created ${self.tempFiles.length} files`);
  })
  @after(async (self: FileProcessingTests) => {
    console.log("    ↳ Cleaning up all files...");
    for (const file of self.tempFiles) {
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    console.log(`    ✓ Cleaned up ${self.tempFiles.length} files`);
    self.tempFiles = [];
  })
  async testMultipleFiles() {
    console.log("      → Processing files...");
    for (const file of this.tempFiles) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log(`      ✓ Processed ${this.tempFiles.length} files`);
  }
}

// Example 4: E2E test with multiple resources
@describe("Example 4: E2E Checkout Flow")
@timeout(120000) // 2 minutes for E2E tests
class CheckoutFlowTests {
  private browser: any = null;
  private testData: any = null;
  private orderCleanup: string[] = [];

  @beforeEach()
  @timeout(30000) // 30s to set up browser
  async setupBrowser() {
    console.log("  ↳ Setting up browser (max 30s)...");
    await new Promise(resolve => setTimeout(resolve, 300));
    this.browser = { ready: true };
    console.log("  ✓ Browser ready");
  }

  @afterEach()
  async teardownBrowser() {
    if (this.browser) {
      console.log("  ↳ Closing browser...");
      await new Promise(resolve => setTimeout(resolve, 100));
      this.browser = null;
      console.log("  ✓ Browser closed");
    }
  }

  @test("complete checkout flow")
  @timeout(180000) // 3 minutes for full checkout
  @before(async (self: CheckoutFlowTests) => {
    console.log("    ↳ Setting up test data...");
    self.testData = {
      user: { email: "test@example.com", name: "Test User" },
      cart: [
        { id: 1, name: "Product 1", price: 10.99 },
        { id: 2, name: "Product 2", price: 20.99 }
      ],
      payment: { cardNumber: "4111111111111111", cvv: "123" }
    };
    console.log("    ✓ Test data ready");
  })
  @after(async (self: CheckoutFlowTests) => {
    console.log("    ↳ Cleaning up orders...");
    for (const orderId of self.orderCleanup) {
      await new Promise(resolve => setTimeout(resolve, 50));
      console.log(`    ✓ Cleaned order: ${orderId}`);
    }
    self.orderCleanup = [];
  })
  async testFullCheckout() {
    console.log("      → Adding items to cart...");
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log("      → Proceeding to checkout...");
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log("      → Filling shipping details...");
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log("      → Processing payment...");
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const orderId = `order-${Date.now()}`;
    this.orderCleanup.push(orderId);
    
    console.log(`      ✓ Order placed: ${orderId}`);
  }
}

// Example 5: Performance testing with strict timeouts
@describe("Example 5: Performance Benchmarks")
class PerformanceTests {
  private metrics: any[] = [];

  @test("API latency benchmark")
  @timeout(1000) // Strict 1s timeout
  @before(async (self: PerformanceTests) => {
    console.log("    ↳ Preparing benchmark...");
    self.metrics = [];
  })
  @after(async (self: PerformanceTests) => {
    if (self.metrics.length > 0) {
      const avg = self.metrics.reduce((a, b) => a + b, 0) / self.metrics.length;
      console.log(`    ✓ Average latency: ${avg.toFixed(2)}ms`);
    }
  })
  async testApiLatency() {
    console.log("      → Measuring API latency...");
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      await new Promise(resolve => setTimeout(resolve, 50));
      const latency = Date.now() - start;
      this.metrics.push(latency);
    }
    console.log(`      ✓ Measured ${this.metrics.length} requests`);
  }

  @test("database query performance")
  @timeout(5000) // 5s timeout
  @before(async (self: PerformanceTests) => {
    console.log("    ↳ Warming up database...");
    await new Promise(resolve => setTimeout(resolve, 100));
    self.metrics = [];
  })
  @after(async (self: PerformanceTests) => {
    if (self.metrics.length > 0) {
      const max = Math.max(...self.metrics);
      const min = Math.min(...self.metrics);
      console.log(`    ✓ Query time range: ${min.toFixed(2)}ms - ${max.toFixed(2)}ms`);
    }
  })
  async testQueryPerformance() {
    console.log("      → Running performance queries...");
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 20));
      const duration = Date.now() - start;
      this.metrics.push(duration);
    }
    console.log(`      ✓ Executed ${this.metrics.length} queries`);
  }
}
