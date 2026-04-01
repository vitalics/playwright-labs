import {
  expect as baseExpect,
  type Locator,
  type ExpectMatcherState,
  type MatcherReturnType,
} from "@playwright/test";

export type AngularMatchers = {
  /** Asserts that the element is an Angular component host (`window.ng.getComponent` returns non-null). */
  toBeNgComponent(
    this: ExpectMatcherState,
    received: Locator,
  ): Promise<MatcherReturnType>;
  /** Asserts that the component declares an `@Input()` with the given property name. */
  toHaveNgInput(
    this: ExpectMatcherState,
    received: Locator,
    name: string,
  ): Promise<MatcherReturnType>;
  /** Asserts that the component declares an `@Output()` with the given property name. */
  toHaveNgOutput(
    this: ExpectMatcherState,
    received: Locator,
    name: string,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the `@Input()` property `name` has the given value.
   * Signal-based inputs (`input()`) are unwrapped automatically.
   * Deep equality is used for objects and arrays.
   */
  toBeNgInput(
    this: ExpectMatcherState,
    received: Locator,
    name: string,
    value: unknown,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the `@Output()` / model-signal property `name` has the given current value.
   * Only meaningful for `model()` signals — EventEmitters have no current value.
   */
  toBeNgOutput(
    this: ExpectMatcherState,
    received: Locator,
    name: string,
    value: unknown,
  ): Promise<MatcherReturnType>;
  /** Asserts that the component has a `WritableSignal` (created with `signal()`) named `name`. */
  toHaveNgSignal(
    this: ExpectMatcherState,
    received: Locator,
    name: string,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the `WritableSignal` named `name` currently holds `value`.
   * Deep equality is used for objects and arrays.
   */
  toBeNgSignal(
    this: ExpectMatcherState,
    received: Locator,
    name: string,
    value: unknown,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the element hosts a `RouterOutlet` directive.
   *
   * The locator must point to the `<router-outlet>` element itself, not to a
   * child or parent.
   *
   * Detection relies on the unminified constructor name `"RouterOutlet"` and
   * the presence of the `isActivated` property. This may produce false
   * negatives if the application is built with a custom minifier that renames
   * Angular internals (e.g. Terser with `keep_classnames: false`).
   *
   * Requires Angular DevTools API (`window.ng`) — available only in
   * development builds (`ng serve` / `ng build --configuration=development`).
   */
  toBeNgRouterOutlet(
    this: ExpectMatcherState,
    received: Locator,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the element has an `NgIf` structural directive applied.
   * When `condition` is provided, also asserts the current truthy/falsy value
   * of the `ngIf` expression.
   *
   * **Only works with the legacy `*ngIf` / `NgIf` directive** (Angular 2–16
   * template syntax). It does **not** detect the built-in `@if {}` control
   * flow block introduced in Angular 17, because that syntax compiles to
   * embedded views without attaching a directive instance to the host element.
   *
   * When `*ngIf` evaluates to `false`, Angular removes the element from the
   * DOM entirely. In that case the locator will throw `"Element not found"`
   * before this matcher is ever called. Use `.not.toBeVisible()` or
   * `page.locator(...).count()` to assert absence instead.
   *
   * Requires Angular DevTools API (`window.ng`) — available only in
   * development builds (`ng serve` / `ng build --configuration=development`).
   */
  toBeNgIf(
    this: ExpectMatcherState,
    received: Locator,
    condition?: boolean,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the element has an `NgForOf` structural directive applied
   * (i.e. `*ngFor="let item of items"`).
   *
   * **Only works with the legacy `NgForOf` / `*ngFor` directive** (Angular
   * 2–16 template syntax). It does **not** detect the built-in `@for {}`
   * control flow block introduced in Angular 17, because that syntax compiles
   * to embedded views without attaching a directive instance to the host
   * element.
   *
   * The matcher must be called on the element that carries the `*ngFor`
   * attribute, not on the repeated children.
   *
   * Requires Angular DevTools API (`window.ng`) — available only in
   * development builds (`ng serve` / `ng build --configuration=development`).
   */
  toBeNgFor(
    this: ExpectMatcherState,
    received: Locator,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the serialized DOM of the component host element matches the
   * provided `snapshot` string.
   *
   * The snapshot is derived from the element's `outerHTML` with the following
   * normalization applied to both sides before comparison:
   * - each line is trimmed of leading/trailing whitespace
   * - blank lines are removed
   *
   * **What IS captured in the snapshot:**
   * - Rendered HTML attributes and their values (e.g. `type="text"`, `class="btn"`)
   * - Text content
   * - In development builds: `ng-reflect-*` attributes for `@Input()` bindings
   *   (e.g. `ng-reflect-label="Submit"`)
   * - Child elements emitted by the component template
   *
   * **What is NOT captured in the snapshot:**
   * - Angular event bindings (`(click)="handler()"`, `(keyup)="update()"`).
   *   These compile to DOM event listeners and have no HTML attribute
   *   representation.
   * - Structural directive template syntax (`*ngIf`, `*ngFor`). Only the
   *   currently rendered DOM is captured, not the template expression.
   * - Angular 17+ built-in control flow blocks (`@if`, `@for`, `@switch`).
   *
   * @example
   * // Component template: <button class="btn" [disabled]="isDisabled">Save</button>
   * // In dev mode the snapshot will include ng-reflect-disabled:
   * await expect(page.locator('app-save-button')).toMatchNgSnapshot(`
   *   <app-save-button ng-reflect-is-disabled="false">
   *     <button class="btn">Save</button>
   *   </app-save-button>
   * `);
   *
   * @example
   * // For a component with an event-only binding:
   * // template: <input type="text" (keyup)="update()" />
   * // The (keyup) binding is invisible in the snapshot:
   * await expect(page.locator('app-root')).toMatchNgSnapshot(`
   *   <app-root>
   *     <input type="text">
   *   </app-root>
   * `);
   */
  toMatchNgSnapshot(
    this: ExpectMatcherState,
    received: Locator,
    snapshot: string,
  ): Promise<MatcherReturnType>;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Recursive deep equality without external dependencies. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, (b as unknown[])[i]));
  }
  if (typeof a !== "object" || typeof b !== "object") return false;
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(
    (k) =>
      Object.prototype.hasOwnProperty.call(b, k) &&
      deepEqual(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      ),
  );
}

/**
 * Returns a failure `MatcherReturnType` when `received` is not a Playwright
 * Locator, or `null` when the guard passes.
 */
function assertIsLocator(received: unknown): MatcherReturnType | null {
  if (
    received !== null &&
    typeof received === "object" &&
    typeof (received as Locator).evaluate === "function"
  )
    return null;
  return {
    pass: false,
    message: () =>
      "Expected a Playwright Locator as the received value, but got: " +
      (received === null ? "null" : typeof received),
  };
}

// ─── Matcher implementations ───────────────────────────────────────────────────

export const expect = baseExpect.extend<AngularMatchers>({
  // ── toBeNgComponent ────────────────────────────────────────────────────────

  async toBeNgComponent(received): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const pass = await locator.evaluate((el) => {
      const ng = (window as any).ng;
      if (!ng) return false;
      try {
        return ng.getComponent(el) !== null;
      } catch {
        return false;
      }
    });

    return {
      pass,
      message: () =>
        pass
          ? "Expected element NOT to be an Angular component host"
          : "Expected element to be an Angular component host, but `window.ng.getComponent` returned null\n" +
            "  Hint: make sure the Angular app runs in development mode (`ng serve` or `ng build --configuration=development`)",
    };
  },

  // ── toHaveNgInput ──────────────────────────────────────────────────────────

  async toHaveNgInput(received, name): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate((el, inputName) => {
      const ng = (window as any).ng;
      if (!ng)
        return {
          found: false,
          inputs: [] as string[],
          reason: "window.ng not available",
        };
      try {
        const comp = ng.getComponent(el);
        if (!comp)
          return {
            found: false,
            inputs: [],
            reason: "element is not a component host",
          };
        const def = comp.constructor?.ɵcmp ?? comp.constructor?.ɵdir;
        if (!def?.inputs)
          return {
            found: false,
            inputs: [],
            reason: "component definition (ɵcmp) not found",
          };
        const inputs: string[] = Object.keys(def.inputs);
        // Match by JS property name OR by the template alias (string value in inputs map)
        const found =
          inputName in def.inputs ||
          inputs.some((k) => {
            const v = def.inputs[k];
            return v === inputName || (Array.isArray(v) && v[0] === inputName);
          });
        return { found, inputs, reason: "" };
      } catch (e) {
        return { found: false, inputs: [], reason: String(e) };
      }
    }, name as string);

    return {
      pass: result.found,
      message: () =>
        result.found
          ? `Expected component NOT to have @Input() "${name}"`
          : [
              `Expected component to have @Input() "${name}"`,
              result.inputs.length
                ? `  Available inputs: ${result.inputs.join(", ")}`
                : "",
              result.reason ? `  Reason: ${result.reason}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
    };
  },

  // ── toHaveNgOutput ─────────────────────────────────────────────────────────

  async toHaveNgOutput(received, name): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate((el, outputName) => {
      const ng = (window as any).ng;
      if (!ng)
        return {
          found: false,
          outputs: [] as string[],
          reason: "window.ng not available",
        };
      try {
        const comp = ng.getComponent(el);
        if (!comp)
          return {
            found: false,
            outputs: [],
            reason: "element is not a component host",
          };
        const def = comp.constructor?.ɵcmp ?? comp.constructor?.ɵdir;
        if (!def?.outputs)
          return {
            found: false,
            outputs: [],
            reason: "component definition (ɵcmp) not found",
          };
        const outputs: string[] = Object.keys(def.outputs);
        // Match by JS property name OR by the emitted event name (value in outputs map)
        const found =
          outputName in def.outputs ||
          Object.values(def.outputs).includes(outputName);
        return { found, outputs, reason: "" };
      } catch (e) {
        return { found: false, outputs: [], reason: String(e) };
      }
    }, name as string);

    return {
      pass: result.found,
      message: () =>
        result.found
          ? `Expected component NOT to have @Output() "${name}"`
          : [
              `Expected component to have @Output() "${name}"`,
              result.outputs.length
                ? `  Available outputs: ${result.outputs.join(", ")}`
                : "",
              result.reason ? `  Reason: ${result.reason}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
    };
  },

  // ── toBeNgInput ────────────────────────────────────────────────────────────

  async toBeNgInput(received, name, expectedValue): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate((el, propName) => {
      const ng = (window as any).ng;
      if (!ng)
        return {
          ok: false,
          value: undefined as unknown,
          reason: "window.ng not available",
        };
      try {
        const comp = ng.getComponent(el);
        if (!comp)
          return {
            ok: false,
            value: undefined,
            reason: "element is not a component host",
          };
        if (!(propName in comp))
          return {
            ok: false,
            value: undefined,
            reason: `property "${propName}" not found on component`,
          };

        const def = comp.constructor?.ɵcmp ?? comp.constructor?.ɵdir;
        const inputDef = def?.inputs?.[propName];
        let value: unknown = comp[propName];

        // Signal-based input from input(): flags tuple, flags & 1 (SignalBased) is set
        const isSignalInput =
          Array.isArray(inputDef) &&
          typeof inputDef[1] === "number" &&
          (inputDef[1] & 1) !== 0;
        // Writable signal from signal(): callable + has .set()
        const isWritableSignal =
          typeof value === "function" &&
          typeof (value as any).set === "function";

        if (
          (isSignalInput || isWritableSignal) &&
          typeof value === "function"
        ) {
          value = (value as () => unknown)();
        }

        return { ok: true, value, reason: "" };
      } catch (e) {
        return { ok: false, value: undefined, reason: String(e) };
      }
    }, name as string);

    const pass = result.ok && deepEqual(result.value, expectedValue);
    return {
      pass,
      expected: expectedValue,
      actual: result.ok ? result.value : undefined,
      message: () =>
        pass
          ? `Expected @Input() "${name}" NOT to equal ${JSON.stringify(expectedValue)}`
          : !result.ok
            ? `Expected component to expose @Input() "${name}", but: ${result.reason}`
            : [
                `Expected @Input() "${name}" to equal:`,
                `  Expected: ${JSON.stringify(expectedValue)}`,
                `  Received: ${JSON.stringify(result.value)}`,
              ].join("\n"),
    };
  },

  // ── toBeNgOutput ───────────────────────────────────────────────────────────

  async toBeNgOutput(
    received,
    name,
    expectedValue,
  ): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate((el, propName) => {
      const ng = (window as any).ng;
      if (!ng)
        return {
          ok: false,
          value: undefined as unknown,
          isEventEmitter: false,
          reason: "window.ng not available",
        };
      try {
        const comp = ng.getComponent(el);
        if (!comp)
          return {
            ok: false,
            value: undefined,
            isEventEmitter: false,
            reason: "element is not a component host",
          };
        if (!(propName in comp))
          return {
            ok: false,
            value: undefined,
            isEventEmitter: false,
            reason: `property "${propName}" not found on component`,
          };

        const raw: unknown = comp[propName];
        // EventEmitter has .emit() and .subscribe()
        const isEventEmitter =
          raw !== null &&
          typeof raw === "object" &&
          typeof (raw as any).emit === "function" &&
          typeof (raw as any).subscribe === "function";
        // model() output is a WritableSignal: callable + has .set()
        const isModelSignal =
          typeof raw === "function" && typeof (raw as any).set === "function";

        const value: unknown = isModelSignal
          ? (raw as () => unknown)()
          : isEventEmitter
            ? undefined
            : raw;

        return { ok: true, value, isEventEmitter, reason: "" };
      } catch (e) {
        return {
          ok: false,
          value: undefined,
          isEventEmitter: false,
          reason: String(e),
        };
      }
    }, name as string);

    const pass =
      result.ok &&
      !result.isEventEmitter &&
      deepEqual(result.value, expectedValue);
    return {
      pass,
      expected: expectedValue,
      actual: result.ok && !result.isEventEmitter ? result.value : undefined,
      message: () => {
        if (pass)
          return `Expected @Output() "${name}" NOT to equal ${JSON.stringify(expectedValue)}`;
        if (!result.ok)
          return `Expected component to expose @Output() "${name}", but: ${result.reason}`;
        if (result.isEventEmitter)
          return (
            `@Output() "${name}" is an EventEmitter — it has no "current value".\n` +
            `  Use \`toHaveNgOutput("${name}")\` to check existence,\n` +
            `  or subscribe and capture emitted values manually.`
          );
        return [
          `Expected @Output() "${name}" to equal:`,
          `  Expected: ${JSON.stringify(expectedValue)}`,
          `  Received: ${JSON.stringify(result.value)}`,
        ].join("\n");
      },
    };
  },

  // ── toHaveNgSignal ─────────────────────────────────────────────────────────

  async toHaveNgSignal(received, name): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate((el, signalName) => {
      const ng = (window as any).ng;
      if (!ng)
        return {
          found: false,
          isSignal: false,
          reason: "window.ng not available",
        };
      try {
        const comp = ng.getComponent(el);
        if (!comp)
          return {
            found: false,
            isSignal: false,
            reason: "element is not a component host",
          };
        if (!(signalName in comp))
          return {
            found: false,
            isSignal: false,
            reason: `property "${signalName}" not found on component`,
          };
        const value = comp[signalName];
        // WritableSignal from signal(): callable + has .set() and .update()
        const isSignal =
          typeof value === "function" &&
          typeof (value as any).set === "function" &&
          typeof (value as any).update === "function";
        return {
          found: true,
          isSignal,
          reason: isSignal
            ? ""
            : `"${signalName}" exists but is not a WritableSignal (typeof: ${typeof value})`,
        };
      } catch (e) {
        return { found: false, isSignal: false, reason: String(e) };
      }
    }, name as string);

    const pass = result.found && result.isSignal;
    return {
      pass,
      message: () =>
        pass
          ? `Expected component NOT to have signal "${name}"`
          : [
              `Expected component to have a WritableSignal named "${name}"`,
              result.reason ? `  Reason: ${result.reason}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
    };
  },

  // ── toBeNgSignal ───────────────────────────────────────────────────────────

  async toBeNgSignal(
    received,
    name,
    expectedValue,
  ): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate((el, signalName) => {
      const ng = (window as any).ng;
      if (!ng)
        return {
          ok: false,
          value: undefined as unknown,
          reason: "window.ng not available",
        };
      try {
        const comp = ng.getComponent(el);
        if (!comp)
          return {
            ok: false,
            value: undefined,
            reason: "element is not a component host",
          };
        if (!(signalName in comp))
          return {
            ok: false,
            value: undefined,
            reason: `property "${signalName}" not found on component`,
          };
        const raw = comp[signalName];
        const isSignal =
          typeof raw === "function" &&
          typeof (raw as any).set === "function" &&
          typeof (raw as any).update === "function";
        if (!isSignal)
          return {
            ok: false,
            value: undefined,
            reason: `"${signalName}" is not a WritableSignal`,
          };
        return { ok: true, value: (raw as () => unknown)(), reason: "" };
      } catch (e) {
        return { ok: false, value: undefined, reason: String(e) };
      }
    }, name as string);

    const pass = result.ok && deepEqual(result.value, expectedValue);
    return {
      pass,
      expected: expectedValue,
      actual: result.ok ? result.value : undefined,
      message: () =>
        pass
          ? `Expected signal "${name}" NOT to equal ${JSON.stringify(expectedValue)}`
          : !result.ok
            ? `Expected component to have WritableSignal "${name}", but: ${result.reason}`
            : [
                `Expected signal "${name}" to equal:`,
                `  Expected: ${JSON.stringify(expectedValue)}`,
                `  Received: ${JSON.stringify(result.value)}`,
              ].join("\n"),
    };
  },

  // ── toBeNgRouterOutlet ─────────────────────────────────────────────────────

  async toBeNgRouterOutlet(received): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate((el) => {
      const ng = (window as any).ng;
      if (!ng) return { pass: false, reason: "window.ng not available" };
      try {
        const directives: unknown[] = ng.getDirectives(el) ?? [];
        const found = directives.some(
          (d: any) =>
            d.constructor?.name === "RouterOutlet" ||
            typeof d.isActivated === "boolean",
        );
        return { pass: found, reason: found ? "" : "no RouterOutlet directive found on element" };
      } catch (e) {
        return { pass: false, reason: String(e) };
      }
    });

    return {
      pass: result.pass,
      message: () =>
        result.pass
          ? "Expected element NOT to be a RouterOutlet"
          : `Expected element to be a RouterOutlet, but: ${result.reason}`,
    };
  },

  // ── toBeNgIf ───────────────────────────────────────────────────────────────

  async toBeNgIf(received, condition): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate((el, expectedCondition) => {
      const ng = (window as any).ng;
      if (!ng) return { ok: false, value: undefined as boolean | undefined, reason: "window.ng not available" };
      try {
        const directives: unknown[] = ng.getDirectives(el) ?? [];
        const dir: any = directives.find(
          (d: any) => d.constructor?.name === "NgIf" || "ngIf" in (d as object),
        );
        if (!dir) return { ok: false, value: undefined, reason: "no NgIf directive found on element" };
        return { ok: true, value: !!dir.ngIf, reason: "" };
      } catch (e) {
        return { ok: false, value: undefined, reason: String(e) };
      }
    }, condition as boolean | undefined);

    if (!result.ok) {
      return {
        pass: false,
        message: () => `Expected element to have NgIf directive, but: ${result.reason}`,
      };
    }

    const pass =
      condition === undefined ? true : result.value === condition;
    return {
      pass,
      message: () =>
        pass
          ? condition === undefined
            ? "Expected element NOT to have NgIf directive"
            : `Expected NgIf condition NOT to be ${condition}`
          : `Expected NgIf condition to be ${condition}, but got ${result.value}`,
    };
  },

  // ── toBeNgFor ──────────────────────────────────────────────────────────────

  async toBeNgFor(received): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate((el) => {
      const ng = (window as any).ng;
      if (!ng) return { pass: false, reason: "window.ng not available" };
      try {
        const directives: unknown[] = ng.getDirectives(el) ?? [];
        const found = directives.some(
          (d: any) =>
            d.constructor?.name === "NgForOf" || "ngForOf" in (d as object),
        );
        return { pass: found, reason: found ? "" : "no NgForOf directive found on element" };
      } catch (e) {
        return { pass: false, reason: String(e) };
      }
    });

    return {
      pass: result.pass,
      message: () =>
        result.pass
          ? "Expected element NOT to have NgForOf (*ngFor) directive"
          : `Expected element to have NgForOf (*ngFor) directive, but: ${result.reason}`,
    };
  },

  // ── toMatchNgSnapshot ──────────────────────────────────────────────────────

  async toMatchNgSnapshot(received, snapshot): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;

    const actual = await locator.evaluate((el): string => {
      function normalizeHtml(html: string): string {
        return html
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .join("\n");
      }
      return normalizeHtml(el.outerHTML);
    });

    const normalizedSnapshot = (snapshot as string)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");

    const pass = actual === normalizedSnapshot;

    return {
      pass,
      expected: normalizedSnapshot,
      actual,
      message: () =>
        pass
          ? "Expected component DOM snapshot NOT to match, but it did"
          : [
              "Component DOM snapshot does not match.",
              "",
              "Expected:",
              normalizedSnapshot,
              "",
              "Received:",
              actual,
            ].join("\n"),
    };
  },
});
