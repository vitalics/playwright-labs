/**
 * Unit tests for Angular matchers.
 *
 * Each test uses a mock Locator whose `evaluate()` returns a pre-built value,
 * bypassing the browser entirely. This isolates the matcher logic (pass/fail
 * decision, error messages) from the Angular runtime.
 */
import { test } from "@playwright/test";
import { expect } from "../src/matchers";

// ─── Mock helpers ─────────────────────────────────────────────────────────────

/**
 * Creates a minimal Playwright Locator stub that always returns `evaluateResult`
 * from `evaluate()`, regardless of the function or arguments passed.
 */
function mockLocator(evaluateResult: unknown) {
  return {
    evaluate: async (_fn: unknown, ..._args: unknown[]) => evaluateResult,
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// ─── toBeNgComponent ──────────────────────────────────────────────────────────

test.describe("toBeNgComponent", () => {
  test("passes when element is a component host", async () => {
    await expect(mockLocator(true)).toBeNgComponent();
  });

  test("fails when element is not a component host", async () => {
    await expect(mockLocator(false)).not.toBeNgComponent();
  });

  test("fails with helpful hint when window.ng is unavailable (returns false)", async () => {
    const locator = mockLocator(false);
    let errorMessage = "";
    try {
      await expect(locator).toBeNgComponent();
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("Angular component host");
  });

  test("returns failure for non-Locator received value", async () => {
    let errorMessage = "";
    try {
      await expect("not a locator" as any).toBeNgComponent();
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("Playwright Locator");
  });
});

// ─── toHaveNgInput ────────────────────────────────────────────────────────────

test.describe("toHaveNgInput", () => {
  const withInputs = (inputs: string[], found = true) =>
    mockLocator({ found, inputs, reason: "" });

  test("passes when input is found", async () => {
    await expect(withInputs(["label", "disabled", "type"], true)).toHaveNgInput("label");
  });

  test("negated assertion fails when input is found (checks .not message)", async () => {
    let errorMessage = "";
    try {
      await expect(withInputs(["label"], true)).not.toHaveNgInput("label");
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain('NOT to have @Input() "label"');
  });

  test("fails when input is not found", async () => {
    await expect(withInputs(["label", "type"], false)).not.toHaveNgInput("nonExistent");
  });

  test("error message lists available inputs", async () => {
    const locator = withInputs(["label", "disabled", "type"], false);
    let errorMessage = "";
    try {
      await expect(locator).toHaveNgInput("missing");
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("label");
    expect(errorMessage).toContain("disabled");
    expect(errorMessage).toContain("type");
  });

  test("includes reason in error when component def is missing", async () => {
    const locator = mockLocator({ found: false, inputs: [], reason: "component definition (ɵcmp) not found" });
    let errorMessage = "";
    try {
      await expect(locator).toHaveNgInput("step");
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("ɵcmp");
  });
});

// ─── toHaveNgOutput ───────────────────────────────────────────────────────────

test.describe("toHaveNgOutput", () => {
  const withOutputs = (outputs: string[], found = true) =>
    mockLocator({ found, outputs, reason: "" });

  test("passes when output is found", async () => {
    await expect(withOutputs(["clicked"], true)).toHaveNgOutput("clicked");
  });

  test("fails when output is not found", async () => {
    await expect(withOutputs(["clicked"], false)).not.toHaveNgOutput("nonExistent");
  });

  test("error message lists available outputs", async () => {
    const locator = withOutputs(["clicked", "selected"], false);
    let errorMessage = "";
    try {
      await expect(locator).toHaveNgOutput("missing");
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("clicked");
    expect(errorMessage).toContain("selected");
  });
});

// ─── toBeNgInput ─────────────────────────────────────────────────────────────

test.describe("toBeNgInput", () => {
  const withValue = (value: unknown, ok = true) =>
    mockLocator({ ok, value, reason: "" });

  test("passes when value matches (string)", async () => {
    await expect(withValue("Submit")).toBeNgInput("label", "Submit");
  });

  test("passes when value matches (number)", async () => {
    await expect(withValue(42)).toBeNgInput("count", 42);
  });

  test("passes when value matches (boolean)", async () => {
    await expect(withValue(true)).toBeNgInput("disabled", true);
  });

  test("passes when value matches (plain object)", async () => {
    await expect(withValue({ name: "Alice", role: "admin" })).toBeNgInput("user", {
      name: "Alice",
      role: "admin",
    });
  });

  test("fails when string values differ", async () => {
    await expect(withValue("Cancel")).not.toBeNgInput("label", "Submit");
  });

  test("fails when numeric values differ", async () => {
    await expect(withValue(5)).not.toBeNgInput("step", 1);
  });

  test("fails when object properties differ", async () => {
    await expect(withValue({ name: "Bob", role: "user" })).not.toBeNgInput("user", {
      name: "Alice",
      role: "admin",
    });
  });

  test("error message shows expected and received values", async () => {
    const locator = withValue("Cancel");
    let errorMessage = "";
    try {
      await expect(locator).toBeNgInput("label", "Submit");
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("Submit");
    expect(errorMessage).toContain("Cancel");
  });

  test("error message shows reason when property not found", async () => {
    const locator = mockLocator({ ok: false, value: undefined, reason: 'property "missing" not found on component' });
    let errorMessage = "";
    try {
      await expect(locator).toBeNgInput("missing", "x");
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("missing");
  });
});

// ─── toBeNgOutput ─────────────────────────────────────────────────────────────

test.describe("toBeNgOutput", () => {
  test("passes for model signal with matching value", async () => {
    const locator = mockLocator({ ok: true, value: "hello", isEventEmitter: false, reason: "" });
    await expect(locator).toBeNgOutput("modelProp", "hello");
  });

  test("fails for model signal with different value", async () => {
    const locator = mockLocator({ ok: true, value: "world", isEventEmitter: false, reason: "" });
    await expect(locator).not.toBeNgOutput("modelProp", "hello");
  });

  test("fails with helpful message for EventEmitter outputs", async () => {
    const locator = mockLocator({ ok: true, value: undefined, isEventEmitter: true, reason: "" });
    let errorMessage = "";
    try {
      await expect(locator).toBeNgOutput("clicked", "anything");
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("EventEmitter");
    expect(errorMessage).toContain("toHaveNgOutput");
  });
});

// ─── toHaveNgSignal ───────────────────────────────────────────────────────────

test.describe("toHaveNgSignal", () => {
  test("passes when property is a WritableSignal", async () => {
    const locator = mockLocator({ found: true, isSignal: true, reason: "" });
    await expect(locator).toHaveNgSignal("count");
  });

  test("fails when property is not a signal", async () => {
    const locator = mockLocator({
      found: true,
      isSignal: false,
      reason: '"count" exists but is not a WritableSignal (typeof: number)',
    });
    await expect(locator).not.toHaveNgSignal("count");
  });

  test("fails when property does not exist", async () => {
    const locator = mockLocator({ found: false, isSignal: false, reason: 'property "missing" not found on component' });
    await expect(locator).not.toHaveNgSignal("missing");
  });

  test("error message includes reason", async () => {
    const locator = mockLocator({
      found: false,
      isSignal: false,
      reason: 'property "nonExistent" not found on component',
    });
    let errorMessage = "";
    try {
      await expect(locator).toHaveNgSignal("nonExistent");
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("nonExistent");
  });
});

// ─── toBeNgSignal ─────────────────────────────────────────────────────────────

test.describe("toBeNgSignal", () => {
  test("passes when signal value matches (number)", async () => {
    const locator = mockLocator({ ok: true, value: 0, reason: "" });
    await expect(locator).toBeNgSignal("count", 0);
  });

  test("passes when signal value matches (string)", async () => {
    const locator = mockLocator({ ok: true, value: "active", reason: "" });
    await expect(locator).toBeNgSignal("status", "active");
  });

  test("passes when signal value matches (object)", async () => {
    const locator = mockLocator({ ok: true, value: { x: 1, y: 2 }, reason: "" });
    await expect(locator).toBeNgSignal("coords", { x: 1, y: 2 });
  });

  test("fails when values differ", async () => {
    const locator = mockLocator({ ok: true, value: 5, reason: "" });
    await expect(locator).not.toBeNgSignal("count", 0);
  });

  test("fails when property is not a signal", async () => {
    const locator = mockLocator({ ok: false, value: undefined, reason: '"count" is not a WritableSignal' });
    let errorMessage = "";
    try {
      await expect(locator).toBeNgSignal("count", 0);
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("WritableSignal");
  });

  test("error message shows expected and received values", async () => {
    const locator = mockLocator({ ok: true, value: 3, reason: "" });
    let errorMessage = "";
    try {
      await expect(locator).toBeNgSignal("count", 0);
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("0"); // expected
    expect(errorMessage).toContain("3"); // received
  });
});

// ─── toBeNgRouterOutlet ───────────────────────────────────────────────────────

test.describe("toBeNgRouterOutlet", () => {
  test("passes when element has RouterOutlet directive (by constructor name)", async () => {
    const locator = mockLocator({ pass: true, reason: "" });
    await expect(locator).toBeNgRouterOutlet();
  });

  test("passes when element has RouterOutlet directive (by isActivated/activatedRoute shape)", async () => {
    const locator = mockLocator({ pass: true, reason: "" });
    await expect(locator).toBeNgRouterOutlet();
  });

  test("fails when element has no RouterOutlet directive", async () => {
    const locator = mockLocator({ pass: false, reason: "no RouterOutlet directive found on element" });
    await expect(locator).not.toBeNgRouterOutlet();
  });

  test("fails when window.ng is unavailable", async () => {
    const locator = mockLocator({ pass: false, reason: "window.ng not available" });
    let errorMessage = "";
    try {
      await expect(locator).toBeNgRouterOutlet();
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("RouterOutlet");
  });

  test("negated message mentions RouterOutlet", async () => {
    const locator = mockLocator({ pass: true, reason: "" });
    let errorMessage = "";
    try {
      await expect(locator).not.toBeNgRouterOutlet();
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("RouterOutlet");
  });

  test("returns failure for non-Locator received value", async () => {
    let errorMessage = "";
    try {
      await expect(42 as any).toBeNgRouterOutlet();
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("Playwright Locator");
  });
});

// ─── toBeNgIf ─────────────────────────────────────────────────────────────────

test.describe("toBeNgIf", () => {
  test("passes when NgIf directive is present (no condition check)", async () => {
    const locator = mockLocator({ ok: true, value: true, reason: "" });
    await expect(locator).toBeNgIf();
  });

  test("passes when NgIf directive is present and condition matches (true)", async () => {
    const locator = mockLocator({ ok: true, value: true, reason: "" });
    await expect(locator).toBeNgIf(true);
  });

  test("passes when NgIf directive is present and condition matches (false)", async () => {
    const locator = mockLocator({ ok: true, value: false, reason: "" });
    await expect(locator).toBeNgIf(false);
  });

  test("fails when NgIf condition does not match", async () => {
    const locator = mockLocator({ ok: true, value: false, reason: "" });
    await expect(locator).not.toBeNgIf(true);
  });

  test("fails when NgIf directive is not found", async () => {
    const locator = mockLocator({ ok: false, value: undefined, reason: "no NgIf directive found on element" });
    let errorMessage = "";
    try {
      await expect(locator).toBeNgIf();
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("NgIf");
  });

  test("fails when window.ng is unavailable", async () => {
    const locator = mockLocator({ ok: false, value: undefined, reason: "window.ng not available" });
    let errorMessage = "";
    try {
      await expect(locator).toBeNgIf();
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("NgIf");
  });

  test("error message shows actual vs expected condition", async () => {
    const locator = mockLocator({ ok: true, value: false, reason: "" });
    let errorMessage = "";
    try {
      await expect(locator).toBeNgIf(true);
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("true");
    expect(errorMessage).toContain("false");
  });

  test("negated message mentions NgIf when no condition", async () => {
    const locator = mockLocator({ ok: true, value: true, reason: "" });
    let errorMessage = "";
    try {
      await expect(locator).not.toBeNgIf();
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("NgIf");
  });

  test("returns failure for non-Locator received value", async () => {
    let errorMessage = "";
    try {
      await expect(null as any).toBeNgIf();
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("Playwright Locator");
  });
});

// ─── toBeNgFor ────────────────────────────────────────────────────────────────

test.describe("toBeNgFor", () => {
  test("passes when NgForOf directive is present", async () => {
    const locator = mockLocator({ pass: true, reason: "" });
    await expect(locator).toBeNgFor();
  });

  test("fails when NgForOf directive is not found", async () => {
    const locator = mockLocator({ pass: false, reason: "no NgForOf directive found on element" });
    await expect(locator).not.toBeNgFor();
  });

  test("fails when window.ng is unavailable", async () => {
    const locator = mockLocator({ pass: false, reason: "window.ng not available" });
    let errorMessage = "";
    try {
      await expect(locator).toBeNgFor();
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("NgForOf");
  });

  test("error message mentions *ngFor", async () => {
    const locator = mockLocator({ pass: false, reason: "no NgForOf directive found on element" });
    let errorMessage = "";
    try {
      await expect(locator).toBeNgFor();
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("*ngFor");
  });

  test("negated message mentions NgForOf", async () => {
    const locator = mockLocator({ pass: true, reason: "" });
    let errorMessage = "";
    try {
      await expect(locator).not.toBeNgFor();
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("NgForOf");
  });

  test("returns failure for non-Locator received value", async () => {
    let errorMessage = "";
    try {
      await expect({} as any).toBeNgFor();
    } catch (e: unknown) {
      errorMessage = String(e);
    }
    expect(errorMessage).toContain("Playwright Locator");
  });
});
