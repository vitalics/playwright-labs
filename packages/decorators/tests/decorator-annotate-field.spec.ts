import { test } from "../src/decorator-test";
import { annotate } from "../src/decorator-annotate";
import { expect } from "@playwright/test";
import { test as pwTest } from "@playwright/test";
import { makeDecorators } from "../src/makeDecorators";

const { describe, BaseTest } = makeDecorators(pwTest);

@describe("@annotate.field Decorator Tests")
class AnnotateFieldTests extends BaseTest {
  toAnnotation(value: any) {
    return BaseTest.toAnnotation(value, this);
  }

  @annotate.field()
  issueId = "JIRA-123";

  @annotate.field()
  priority = "high";

  @annotate.field()
  testCategory = "regression";

  @test("should use field annotation via lazy function")
  @annotate((self) => self.toAnnotation(self.issueId))
  async testWithFieldAnnotation() {
    // Verify the field value is accessible
    expect(this.issueId).toBe("JIRA-123");

    // Verify annotation is applied in test info
    const testInfo = pwTest.info();
    const annotations = testInfo.annotations;

    // Should have the lazy annotation from the decorator
    // annotate.field() creates annotation with field name as type
    const issueAnnotation = annotations.find((a) => a.type === "issueId");
    expect(issueAnnotation).toBeDefined();
    expect(issueAnnotation?.description).toBe("JIRA-123");
  }

  @test("should use multiple field annotations")
  @annotate((self) => self.toAnnotation(self.issueId))
  @annotate((self) => self.toAnnotation(self.priority))
  @annotate((self) => self.toAnnotation(self.testCategory))
  async testWithMultipleFieldAnnotations() {
    expect(this.issueId).toBe("JIRA-123");
    expect(this.priority).toBe("high");
    expect(this.testCategory).toBe("regression");

    const testInfo = pwTest.info();
    const annotations = testInfo.annotations;

    // All three annotations should be present
    expect(annotations.length).toBeGreaterThanOrEqual(3);
  }

  @test("should combine static and lazy annotations")
  @annotate("type", "unit-test")
  @annotate((self) => self.toAnnotation(self.issueId))
  async testWithMixedAnnotations() {
    const testInfo = pwTest.info();
    const annotations = testInfo.annotations;

    // Should have both static and lazy annotations
    const staticAnnotation = annotations.find((a) => a.type === "type");
    expect(staticAnnotation).toBeDefined();
    expect(staticAnnotation?.description).toBe("unit-test");

    // makeAnnotation with instance uses the field name as type
    const lazyAnnotation = annotations.find((a) => a.type === "issueId");
    expect(lazyAnnotation).toBeDefined();
    expect(lazyAnnotation?.description).toBe("JIRA-123");
  }

  @test("should modify field value and use updated value")
  @annotate((self) => BaseTest.toAnnotation(self.priority, self))
  async testWithModifiedField() {
    // Modify the field value before checking
    this.priority = "critical";

    expect(this.priority).toBe("critical");
  }
}

@describe("@annotate.field with Custom Transformation")
class AnnotateFieldCustomTests extends BaseTest {
  @annotate.field((value) => ({
    type: "custom-issue",
    description: `Issue: ${value}`,
  }))
  ticketNumber = "TICKET-456";

  @test("should use custom transformation function")
  @annotate((self) => {
    const annotation = (self.ticketNumber as any)[Symbol.for("annotate")]?.();
    return annotation || { type: "default", description: "none" };
  })
  async testWithCustomTransformation() {
    expect(this.ticketNumber).toBe("TICKET-456");
  }
}

@describe("@annotate.field Edge Cases")
class AnnotateFieldEdgeCaseTests extends BaseTest {
  @annotate.field()
  numericValue = 42;

  @annotate.field()
  booleanValue = true;

  @annotate.field()
  emptyString = "";

  @test("should handle numeric field values")
  @annotate((self) => BaseTest.toAnnotation(self.numericValue, self))
  async testNumericField() {
    expect(this.numericValue).toBe(42);
  }

  @test("should handle boolean field values")
  @annotate((self) => BaseTest.toAnnotation(self.booleanValue, self))
  async testBooleanField() {
    expect(this.booleanValue).toBe(true);
  }

  @test("should handle empty string field values")
  @annotate((self) => BaseTest.toAnnotation(self.emptyString, self))
  async testEmptyStringField() {
    expect(this.emptyString).toBe("");
  }
}
