import { test, expect } from "@playwright/test";
import { beforeEach, afterEach, beforeAll, afterAll } from "../src/index";

/**
 * Tests for lifecycle decorator validation.
 * These tests verify that decorators throw appropriate errors when used incorrectly.
 */

test("@beforeEach should throw error on static method", () => {
  expect(() => {
    class TestClass {
      @beforeEach()
      static staticMethod() {
        // This should throw
      }
    }
  }).toThrow(/@beforeEach cannot be used on static methods/);
});

test("@afterEach should throw error on static method", () => {
  expect(() => {
    class TestClass {
      @afterEach()
      static staticMethod() {
        // This should throw
      }
    }
  }).toThrow(/@afterEach cannot be used on static methods/);
});

test("@beforeEach should throw error on non-method", () => {
  expect(() => {
    class TestClass {
      @beforeEach()
      field = "value";
    }
  }).toThrow(/@beforeEach can only be used on methods/);
});

test("@afterEach should throw error on non-method", () => {
  expect(() => {
    class TestClass {
      @afterEach()
      field = "value";
    }
  }).toThrow(/@afterEach can only be used on methods/);
});

test("@beforeAll should throw error on non-method", () => {
  expect(() => {
    class TestClass {
      // @ts-expect-error cannot be used on non-methods
      @beforeAll()
      field = "value";
    }
  }).toThrow(/@beforeAll can only be used on methods/);
});

test("@afterAll should throw error on non-method", () => {
  expect(() => {
    class TestClass {
      @afterAll()
      field = "value";
    }
  }).toThrow(/@afterAll can only be used on methods/);
});
