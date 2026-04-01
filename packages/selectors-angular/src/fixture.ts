import { test as baseTest, type Locator, selectors } from "@playwright/test";
import { AngularEngine } from "./engine";

// ─── Browser-side helper builder ──────────────────────────────────────────────

/**
 * Builds a **self-contained** browser-side evaluate function that resolves
 * `window.ng` and injects it as the first argument before calling `fn`.
 *
 * Why `new Function` instead of a plain closure?
 * Playwright serialises evaluate callbacks via `.toString()`. A plain wrapper
 * that references `fn` as a closure variable would lose the reference once
 * stringified and sent to the browser. `new Function` embeds the stringified
 * body of `fn` directly into the generated function so the result is fully
 * self-contained and does not depend on any Node.js scope.
 *
 * Throws `Error` when `window.ng` is unavailable (production builds).
 *
 * @example
 * locator.evaluate(withNg((ng, el) => ng.getComponent(el) !== null));
 * locator.evaluate(withNg((ng, el, name: string) => ng.getComponent(el)?.[name]), "label");
 */
function withNg<T>(
  fn: (ng: any, el: Element, arg?: any) => T,
): (el: Element, arg?: any) => T {
  return new Function(
    "el",
    "arg",
    `"use strict";
var ng = window.ng;
if (!ng) throw new Error(
  "window.ng is not available \\u2014 make sure the Angular app runs in development mode"
);
return (${fn.toString()})(ng, el, arg);`,
  ) as (el: Element, arg?: any) => T;
}

// ─── NgHtmlElement ─────────────────────────────────────────────────────────────

/**
 * A wrapper around a Playwright `Locator` that exposes a typed, Angular-aware
 * API for inspecting and interacting with Angular component instances at runtime.
 *
 * Obtained via the `$ng` fixture:
 * ```typescript
 * const btn = $ng("app-button");
 * const label = await btn.input("label");   // "Submit"
 * await btn.detectChanges();
 * ```
 *
 * All methods require the Angular app to run in **development mode** so that
 * `window.ng` (Angular's global debug API) is available.
 */
export class NgHtmlElement {
  constructor(private readonly locator: Locator) {}

  // ── Locator narrowing ──────────────────────────────────────────────────────

  /** Returns an `NgHtmlElement` for the element at position `index` (0-based). */
  nth(index: number): NgHtmlElement {
    return new NgHtmlElement(this.locator.nth(index));
  }

  /** Returns an `NgHtmlElement` for the first matched element. */
  first(): NgHtmlElement {
    return new NgHtmlElement(this.locator.first());
  }

  /** Returns an `NgHtmlElement` for the last matched element. */
  last(): NgHtmlElement {
    return new NgHtmlElement(this.locator.last());
  }

  // ── Component / directive introspection ────────────────────────────────────

  /**
   * Returns `true` when the element is an Angular component host
   * (`window.ng.getComponent` returns a non-null instance).
   * Returns `false` (rather than throwing) when `window.ng` is unavailable.
   */
  async isComponent(): Promise<boolean> {
    return this.locator.evaluate((el) => {
      const ng = (window as any).ng;
      if (!ng) return false;
      try {
        return ng.getComponent(el) !== null;
      } catch {
        return false;
      }
    });
  }

  /**
   * Returns the constructor names of all directives currently applied to this
   * element (via `window.ng.getDirectives`).
   *
   * @example
   * const names = await $ng("router-outlet").directives();
   * // ["RouterOutlet"]
   */
  async directives(): Promise<string[]> {
    return this.locator.evaluate(
      withNg((ng, el) => {
        const dirs: unknown[] = ng.getDirectives(el) ?? [];
        return dirs
          .map((d: any) => d.constructor?.name ?? "")
          .filter(Boolean) as string[];
      }),
    );
  }

  // ── Inputs ─────────────────────────────────────────────────────────────────

  /**
   * Returns the JS property names of all `@Input()` bindings declared on the
   * component (keys of the `ɵcmp.inputs` map).
   *
   * @example
   * await $ng("app-button").inputs(); // ["label", "disabled", "type"]
   */
  async inputs(): Promise<string[]> {
    return this.locator.evaluate(
      withNg((ng, el) => {
        const comp = ng.getComponent(el);
        if (!comp) return [];
        const def = comp.constructor?.ɵcmp ?? comp.constructor?.ɵdir;
        return def?.inputs ? Object.keys(def.inputs) : [];
      }),
    );
  }

  /**
   * Returns the current value of a specific `@Input()` binding.
   * Signal-based inputs (`input()`) are automatically unwrapped.
   *
   * @throws if `window.ng` is unavailable, the element is not a component host,
   *         or the property does not exist.
   *
   * @example
   * const label = await $ng('angular=app-button[label="Submit"]').input("label");
   * // "Submit"
   */
  async input<T = unknown>(name: string): Promise<T> {
    return this.locator.evaluate(
      withNg((ng, el, propName: string) => {
        const comp = ng.getComponent(el);
        if (!comp) throw new Error("Element is not an Angular component host");
        if (!(propName in comp))
          throw new Error(`@Input() "${propName}" not found on component`);

        const def = comp.constructor?.ɵcmp ?? comp.constructor?.ɵdir;
        const inputDef = def?.inputs?.[propName];
        let value: unknown = comp[propName];

        const isSignalInput =
          Array.isArray(inputDef) &&
          typeof inputDef[1] === "number" &&
          (inputDef[1] & 1) !== 0;
        const isWritableSignal =
          typeof value === "function" &&
          typeof (value as any).set === "function";

        if ((isSignalInput || isWritableSignal) && typeof value === "function") {
          value = (value as () => unknown)();
        }

        return value as T;
      }),
      name,
    );
  }

  // ── Outputs ────────────────────────────────────────────────────────────────

  /**
   * Returns the JS property names of all `@Output()` bindings declared on the
   * component (keys of the `ɵcmp.outputs` map).
   *
   * @example
   * await $ng("app-button").outputs(); // ["clicked"]
   */
  async outputs(): Promise<string[]> {
    return this.locator.evaluate(
      withNg((ng, el) => {
        const comp = ng.getComponent(el);
        if (!comp) return [];
        const def = comp.constructor?.ɵcmp ?? comp.constructor?.ɵdir;
        return def?.outputs ? Object.keys(def.outputs) : [];
      }),
    );
  }

  // ── Signals ────────────────────────────────────────────────────────────────

  /**
   * Returns the property names of all `WritableSignal`s (created with
   * `signal()`) found on the component instance.
   *
   * @example
   * await $ng("app-counter").signals(); // ["count"]
   */
  async signals(): Promise<string[]> {
    return this.locator.evaluate(
      withNg((ng, el) => {
        const comp = ng.getComponent(el);
        if (!comp) return [];
        return Object.getOwnPropertyNames(comp).filter((key) => {
          const val = comp[key];
          return (
            typeof val === "function" &&
            typeof (val as any).set === "function" &&
            typeof (val as any).update === "function"
          );
        });
      }),
    );
  }

  /**
   * Returns the current value of a `WritableSignal` by property name.
   *
   * @throws if the signal does not exist or the property is not a `WritableSignal`.
   *
   * @example
   * const count = await $ng("app-counter").signal<number>("count");
   * // 0
   */
  async signal<T = unknown>(name: string): Promise<T> {
    return this.locator.evaluate(
      withNg((ng, el, signalName: string) => {
        const comp = ng.getComponent(el);
        if (!comp) throw new Error("Element is not an Angular component host");
        if (!(signalName in comp))
          throw new Error(`Property "${signalName}" not found on component`);
        const raw = comp[signalName];
        const isSignal =
          typeof raw === "function" &&
          typeof (raw as any).set === "function" &&
          typeof (raw as any).update === "function";
        if (!isSignal) throw new Error(`"${signalName}" is not a WritableSignal`);
        return (raw as () => T)();
      }),
      name,
    );
  }

  // ── Change detection ───────────────────────────────────────────────────────

  /**
   * Triggers Angular change detection for this component via
   * `window.ng.applyChanges`. Useful after imperatively mutating component state.
   *
   * @example
   * await $ng("app-counter").detectChanges();
   */
  async detectChanges(): Promise<void> {
    await this.locator.evaluate(
      withNg((ng, el) => {
        const comp = ng.getComponent(el);
        if (comp) ng.applyChanges(comp);
      }),
    );
  }
}

// ─── Fixture ───────────────────────────────────────────────────────────────────

type WorkerFixtures = {
  /** @internal Registers the Angular selector engine once per worker process. */
  _registerAngularEngine: void;
};

export type Fixture = {
  /**
   * Returns an {@link NgHtmlElement} wrapping the first element matched by
   * `selector`. Accepts the same options as `page.locator()`.
   *
   * The Angular selector engine (`angular=…` syntax) is registered
   * automatically when this fixture is used.
   *
   * @example
   * const btn = $ng("app-button");
   * const label = await btn.input("label");        // read @Input
   * const names  = await btn.inputs();             // list all @Inputs
   * await btn.detectChanges();                     // trigger CD
   *
   * // Use the Angular selector engine:
   * const submit = $ng('angular=app-button[label="Submit"]');
   */
  $ng: (
    selector: string,
    options?: {
      has?: Locator;
      hasNot?: Locator;
      hasNotText?: string | RegExp;
      hasText?: string | RegExp;
    },
  ) => NgHtmlElement;
};

export const test = baseTest.extend<Fixture, WorkerFixtures>({
  _registerAngularEngine: [
    async ({}, use) => {
      try {
        selectors.register("angular", AngularEngine);
      } catch {
        // Already registered in this worker — safe to ignore
      }
      await use();
    },
    { scope: "worker", auto: true },
  ],

  $ng: async ({ page }, use) => {
    await use((selector, options) => new NgHtmlElement(page.locator(selector, options)));
  },
});
