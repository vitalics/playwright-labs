import { test } from "../src/decorator-test";
import { attachment } from "../src/decorator-attachment";
import { expect } from "@playwright/test";
import { test as pwTest } from "@playwright/test";
import { makeDecorators } from "../src/makeDecorators";

const { describe, BaseTest } = makeDecorators(pwTest);

@describe("@attachment.field Decorator Tests")
class AttachmentFieldTests extends BaseTest {
  @attachment.field()
  logData = Buffer.from("Test log content");

  @attachment.field()
  configData = JSON.stringify({ env: "test", version: "1.0" });

  @attachment.field()
  binaryData = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);

  @test("should attach field data via lazy function")
  @attachment((self) => BaseTest.toAttachment(self.logData, self, "test-log"))
  async testWithFieldAttachment() {
    // Verify the field value is accessible
    expect(this.logData.toString()).toBe("Test log content");

    // Check that attachment was added (we can't easily verify in test report from here)
    const testInfo = pwTest.info();
    const attachments = testInfo.attachments;

    // Should have the attachment from the decorator
    const logAttachment = attachments.find((a) => a.name === "test-log");
    expect(logAttachment).toBeDefined();
  }

  @test("should attach multiple field attachments")
  @attachment((self) => BaseTest.toAttachment(self.logData, self, "log-1"))
  @attachment((self) =>
    BaseTest.toAttachment(self.configData, self, "config-1"),
  )
  @attachment((self) =>
    BaseTest.toAttachment(self.binaryData, self, "binary-1"),
  )
  async testWithMultipleFieldAttachments() {
    expect(this.logData.toString()).toBe("Test log content");
    expect(this.configData).toContain("test");
    expect(this.binaryData).toBeInstanceOf(Buffer);

    const testInfo = pwTest.info();
    const attachments = testInfo.attachments;

    // All three attachments should be present
    expect(attachments.length).toBeGreaterThanOrEqual(3);
  }

  @test("should handle buffer data")
  @attachment((self) =>
    BaseTest.toAttachment(self.binaryData, self, "binary-data"),
  )
  async testWithBufferAttachment() {
    expect(this.binaryData).toBeInstanceOf(Buffer);
    expect(this.binaryData.length).toBe(5);
  }

  @test("should handle string data")
  @attachment((self) =>
    BaseTest.toAttachment(self.configData, self, "config-data"),
  )
  async testWithStringAttachment() {
    expect(typeof this.configData).toBe("string");
    const parsed = JSON.parse(this.configData);
    expect(parsed.env).toBe("test");
  }
}

@describe("@attachment.field with Custom Transformation")
class AttachmentFieldCustomTests extends BaseTest {
  @attachment.field((value) => ({
    name: "custom-log",
    body: value,
    contentType: "application/json",
  }))
  jsonData = Buffer.from(JSON.stringify({ test: true }));

  @test("should use custom transformation function")
  @attachment((self) => {
    const kAttachment = Symbol.for("attachment");
    const attachmentFn = (self.jsonData as any)[kAttachment];
    if (typeof attachmentFn === "function") {
      return attachmentFn();
    }
    return BaseTest.toAttachment(self.jsonData, self, "fallback");
  })
  async testWithCustomTransformation() {
    expect(this.jsonData).toBeInstanceOf(Buffer);
  }
}

@describe("@attachment.field with Dynamic Data")
class AttachmentFieldDynamicTests extends BaseTest {
  @attachment.field()
  dynamicData = Buffer.from("initial");

  @test("should handle modified field values")
  @attachment((self) =>
    BaseTest.toAttachment(self.dynamicData, self, "dynamic-log"),
  )
  async testWithModifiedField() {
    // Modify the field value before attaching
    this.dynamicData = Buffer.from("modified content");

    expect(this.dynamicData.toString()).toBe("modified content");
  }
}

@describe("@attachment Lazy Decorator Tests")
class AttachmentLazyTests extends BaseTest {
  logContent = "Runtime log content";

  @test("should support lazy attachment via function")
  @attachment((self) => ({
    name: "runtime-log",
    body: self.logContent,
    contentType: "text/plain",
  }))
  async testLazyAttachment() {
    expect(this.logContent).toBe("Runtime log content");

    const testInfo = pwTest.info();
    const attachments = testInfo.attachments;
    const runtimeLog = attachments.find((a) => a.name === "runtime-log");
    expect(runtimeLog).toBeDefined();
  }

  @test("should support lazy attachment with dynamic data")
  @attachment((self) => ({
    name: "dynamic-report",
    body: JSON.stringify({ timestamp: Date.now(), test: "data" }),
    contentType: "application/json",
  }))
  async testLazyDynamicAttachment() {
    const testInfo = pwTest.info();
    const attachments = testInfo.attachments;
    const dynamicReport = attachments.find((a) => a.name === "dynamic-report");
    expect(dynamicReport).toBeDefined();
  }

  @test("should combine static and lazy attachments")
  @attachment("static-file", {
    body: "Static content",
    contentType: "text/plain",
  })
  @attachment((self) => ({
    name: "lazy-file",
    body: self.logContent,
    contentType: "text/plain",
  }))
  async testMixedAttachments() {
    const testInfo = pwTest.info();
    const attachments = testInfo.attachments;

    const staticAttachment = attachments.find((a) => a.name === "static-file");
    expect(staticAttachment).toBeDefined();

    const lazyAttachment = attachments.find((a) => a.name === "lazy-file");
    expect(lazyAttachment).toBeDefined();

    // Should have both attachments
    expect(attachments.length).toBeGreaterThanOrEqual(2);
  }
}

@describe("@attachment.field Edge Cases")
class AttachmentFieldEdgeCaseTests extends BaseTest {
  @attachment.field()
  emptyBuffer = Buffer.from("");

  @attachment.field()
  largeBuffer = Buffer.alloc(1024, "x");

  @test("should handle empty buffer")
  @attachment((self) => BaseTest.toAttachment(self.emptyBuffer, self, "empty"))
  async testEmptyBuffer() {
    expect(this.emptyBuffer.length).toBe(0);
  }

  @test("should handle large buffer")
  @attachment((self) => BaseTest.toAttachment(self.largeBuffer, self, "large"))
  async testLargeBuffer() {
    expect(this.largeBuffer.length).toBe(1024);
  }
}
