import { describe, test, before, after, beforeEach, afterEach } from "../../src/index";

/**
 * Example demonstrating @before and @after decorators
 * 
 * Lifecycle order:
 * 1. beforeEach
 * 2. @before
 * 3. test method
 * 4. @after
 * 5. afterEach
 */

@describe("Before/After Example - Database Operations")
class DatabaseTestExample {
  private connection: any = null;
  private transaction: any = null;

  @beforeEach()
  async openConnection() {
    // Runs before each test
    this.connection = { connected: true };
    console.log("✓ Connection opened");
  }

  @afterEach()
  async closeConnection() {
    // Runs after each test
    if (this.connection) {
      this.connection.connected = false;
      console.log("✓ Connection closed");
    }
  }

  @test("should insert data with transaction")
  @before(async (self: DatabaseTestExample) => {
    // Test-specific setup: start transaction
    self.transaction = { active: true, data: [] };
    console.log("  ↳ Transaction started");
  })
  @after(async (self: DatabaseTestExample) => {
    // Test-specific cleanup: rollback transaction
    if (self.transaction && self.transaction.active) {
      self.transaction.active = false;
      console.log("  ↳ Transaction rolled back");
    }
  })
  async testInsert() {
    console.log("    → Running test: inserting data");
    this.transaction.data.push({ id: 1, name: "test" });
    
    // Assertions
    if (this.transaction.data.length !== 1) {
      throw new Error("Data not inserted");
    }
  }

  @test("should query data")
  async testQuery() {
    // This test doesn't need transaction, so no @before/@after hooks
    console.log("    → Running test: querying data");
    
    if (!this.connection.connected) {
      throw new Error("Connection should be open");
    }
  }
}

@describe("Before/After Example - File Operations")
class FileOperationsExample {
  private tempFile: string | null = null;

  @test("should create and cleanup temp file")
  @before(async (self: FileOperationsExample) => {
    // Create temp file before test
    self.tempFile = `/tmp/test-${Date.now()}.txt`;
    console.log(`✓ Created temp file: ${self.tempFile}`);
  })
  @after(async (self: FileOperationsExample) => {
    // Cleanup temp file after test (runs even if test fails)
    if (self.tempFile) {
      console.log(`✓ Cleaned up temp file: ${self.tempFile}`);
      self.tempFile = null;
    }
  })
  async testFileOperations() {
    console.log("  → Writing to temp file");
    
    if (!this.tempFile) {
      throw new Error("Temp file should exist");
    }
    
    // File operations would go here
    console.log("  → File operations completed");
  }
}

@describe("Before/After Example - Multiple Hooks")
class MultipleHooksExample {
  private resources: string[] = [];

  @test("should acquire and release multiple resources")
  @before(async (self: MultipleHooksExample) => {
    console.log("  ↳ Acquiring resource 1");
    self.resources.push("resource-1");
  })
  @before(async (self: MultipleHooksExample) => {
    console.log("  ↳ Acquiring resource 2");
    self.resources.push("resource-2");
  })
  @before(async (self: MultipleHooksExample) => {
    console.log("  ↳ Acquiring resource 3");
    self.resources.push("resource-3");
  })
  @after(async (self: MultipleHooksExample) => {
    console.log("  ↳ Releasing resource 3");
    self.resources.pop();
  })
  @after(async (self: MultipleHooksExample) => {
    console.log("  ↳ Releasing resource 2");
    self.resources.pop();
  })
  @after(async (self: MultipleHooksExample) => {
    console.log("  ↳ Releasing resource 1");
    self.resources.pop();
  })
  async testWithMultipleResources() {
    console.log("    → Test running with resources:", this.resources.join(", "));
    
    if (this.resources.length !== 3) {
      throw new Error("Should have 3 resources");
    }
  }
}

@describe("Before/After Example - API Test Pattern")
class ApiTestExample {
  private authToken: string | null = null;
  private apiClient: any = null;

  @test("should authenticate and make API call")
  @before(async (self: ApiTestExample) => {
    // Authenticate before test
    self.authToken = "mock-token-12345";
    self.apiClient = { 
      token: self.authToken,
      makeRequest: async (endpoint: string) => {
        return { status: 200, data: { endpoint } };
      }
    };
    console.log("  ↳ Authentication successful");
  })
  @after(async (self: ApiTestExample) => {
    // Invalidate token after test
    if (self.authToken) {
      console.log("  ↳ Token invalidated");
      self.authToken = null;
      self.apiClient = null;
    }
  })
  async testApiCall() {
    console.log("    → Making API call");
    
    if (!this.authToken || !this.apiClient) {
      throw new Error("Should be authenticated");
    }
    
    const response = await this.apiClient.makeRequest("/api/users");
    
    if (response.status !== 200) {
      throw new Error("API call failed");
    }
    
    console.log("    → API call successful");
  }
}
