import { test as baseTest, type Locator, selectors } from "@playwright/test";
import { ReactEngine } from "./engine";

// ─── Browser-side helper builder ──────────────────────────────────────────────

/**
 * Builds a **self-contained** browser-side evaluate function that resolves the
 * nearest React component fiber for the element and injects it as the first
 * argument before calling `fn`.
 *
 * Why `new Function` instead of a plain closure?
 * Playwright serialises evaluate callbacks via `.toString()`. A plain wrapper
 * that references `fn` as a closure variable would lose the reference once
 * stringified and sent to the browser. `new Function` embeds the stringified
 * body of `fn` directly into the generated function so the result is fully
 * self-contained and does not depend on any Node.js scope.
 *
 * **HOC limitation**: when a component renders only child components with no
 * own DOM nodes (e.g. a Higher Order Component), the returned element is the
 * first DOM element of the inner component. In that case `getFiber` will
 * resolve the inner component's fiber, not the outer one. This limitation does
 * not affect the selector engine itself, only the introspection methods.
 *
 * Throws `Error` when no React fiber is found on the element.
 *
 * @example
 * locator.evaluate(withReact((getFiber, el) => getFiber(el)?.memoizedProps));
 */
function withReact<T>(
  fn: (getFiber: (el: Element) => any, el: Element, arg?: any) => T,
): (el: Element, arg?: any) => T {
  return new Function(
    "el",
    "arg",
    `"use strict";
function getReactFiber(element) {
  var key = Object.keys(element).find(function(k) {
    return k.startsWith('__reactFiber$') || k.startsWith('_reactInternals');
  });
  return key ? element[key] : null;
}
function getNearestComponentFiber(element) {
  var fiber = getReactFiber(element);
  if (!fiber) return null;
  // React double-buffers: after a commit __reactFiber$... may point to the
  // alternate (stale) tree. Walk up to the HostRoot fiber and compare with
  // FiberRootNode.current to decide which tree we are reading from.
  var root = fiber;
  while (root.return) root = root.return;
  var fiberRoot = root.stateNode;
  var startFiber = (fiberRoot && fiberRoot.current && fiberRoot.current !== root)
    ? (fiber.alternate || fiber)
    : fiber;
  var f = startFiber;
  while (f) {
    var type = f.type;
    if (type && (typeof type === 'function' || (typeof type === 'object' && type !== null))) {
      return f;
    }
    f = f.return;
  }
  return null;
}
return (${fn.toString()})(getNearestComponentFiber, el, arg);`,
  ) as (el: Element, arg?: any) => T;
}

// ─── ReactHtmlElement ──────────────────────────────────────────────────────────

/**
 * A wrapper around a Playwright `Locator` that exposes a typed, React-aware
 * API for inspecting React component instances at runtime.
 *
 * `ReactHtmlElement` is fully compatible with `Locator` — all standard
 * Playwright methods (`click`, `fill`, `waitFor`, etc.) are forwarded to the
 * underlying locator via a transparent `Proxy`. React-specific methods
 * (`props`, `state`, `context`, …) are layered on top.
 *
 * Obtained via the `$r` fixture:
 * ```typescript
 * const counter = $r("react=Counter");
 * await counter.click();                // ← standard Locator method
 * const state   = await counter.state(); // ← React-specific method
 * ```
 *
 * The selector engine uses React's internal fiber tree, which is available in
 * **development builds** and in production builds that have not been stripped
 * of fiber metadata. React DevTools are **not** required.
 */
export class ReactHtmlElement {
  constructor(private readonly _locator: Locator) {
    return new Proxy(this, {
      get(target, prop, receiver) {
        // Prioritise class-defined methods and own properties (incl. _locator).
        if (Reflect.has(target, prop)) {
          return Reflect.get(target, prop, receiver);
        }
        // Fall through to the underlying Playwright Locator.
        const val = Reflect.get(_locator as object, prop, _locator);
        return typeof val === "function" ? (val as any).bind(_locator) : val;
      },
    });
  }

  // ── Locator narrowing ──────────────────────────────────────────────────────

  /** Returns a `ReactHtmlElement` for the element at position `index` (0-based). */
  nth(index: number): ReactHtmlElement {
    return new ReactHtmlElement(this._locator.nth(index));
  }

  /** Returns a `ReactHtmlElement` for the first matched element. */
  first(): ReactHtmlElement {
    return new ReactHtmlElement(this._locator.first());
  }

  /** Returns a `ReactHtmlElement` for the last matched element. */
  last(): ReactHtmlElement {
    return new ReactHtmlElement(this._locator.last());
  }

  // ── Component introspection ────────────────────────────────────────────────

  /**
   * Returns `true` when a React component fiber can be found for this element
   * by walking up the fiber tree.
   */
  async isComponent(): Promise<boolean> {
    return this._locator.evaluate((el) => {
      const key = Object.keys(el).find(
        (k) => k.startsWith("__reactFiber$") || k.startsWith("_reactInternals"),
      );
      if (!key) return false;
      let f = (el as any)[key];
      while (f) {
        const type = f.type;
        if (
          type &&
          (typeof type === "function" ||
            (typeof type === "object" && type !== null))
        )
          return true;
        f = f.return;
      }
      return false;
    });
  }

  /**
   * Returns the display name of the nearest React component.
   * Uses `displayName`, then `name`, then falls back to `null`.
   */
  async componentName(): Promise<string | null> {
    return this._locator.evaluate(
      withReact((getFiber, el) => {
        const fiber = getFiber(el);
        if (!fiber) return null;
        const type = fiber.type;
        if (typeof type === "function")
          return (type as any).displayName || type.name || null;
        if (typeof type === "object" && type) {
          const inner = (type as any).type || (type as any).render;
          return (
            (type as any).displayName ||
            (inner ? inner.displayName || inner.name : null) ||
            null
          );
        }
        return null;
      }),
    );
  }

  // ── Props ──────────────────────────────────────────────────────────────────

  /**
   * Returns all props of the nearest React component (`memoizedProps`).
   *
   * @example
   * const props = await $r("react=Button").props<{ label: string; disabled: boolean }>();
   */
  async props<T = Record<string, any>>(): Promise<T> {
    return this._locator.evaluate(
      withReact((getFiber, el) => {
        const fiber = getFiber(el);
        return (fiber?.memoizedProps ?? {}) as any;
      }),
    ) as Promise<T>;
  }

  /**
   * Returns the value of a specific prop.
   *
   * @throws when the element has no React fiber or the prop does not exist.
   *
   * @example
   * const label = await $r("react=Button[props.label='Submit']").prop("label");
   */
  async prop<T = unknown>(name: string): Promise<T> {
    return this._locator.evaluate(
      withReact((getFiber, el, propName: string) => {
        const fiber = getFiber(el);
        if (!fiber)
          throw new Error("No React component fiber found for this element");
        const props = fiber.memoizedProps ?? {};
        if (!(propName in props))
          throw new Error(`Prop "${propName}" not found on component`);
        return props[propName];
      }),
      name,
    ) as Promise<T>;
  }

  // ── State ──────────────────────────────────────────────────────────────────

  /**
   * Returns the state of the nearest React component.
   *
   * - **Class components**: returns the state object (`this.state`).
   * - **Function components**: returns an indexed object
   *   `{ "0": state0, "1": state1, … }` where each key corresponds to a
   *   `useState` / `useReducer` hook in declaration order.
   *
   * Returns `null` when the component has no state.
   *
   * @example
   * // Class component with this.state = { count: 3 }
   * const state = await $r("react=Counter").state<{ count: number }>();
   * // state.count === 3
   *
   * // Function component: const [count, setCount] = useState(0);
   * const state = await $r("react=Counter").state<{ "0": number }>();
   * // state["0"] === 0
   */
  async state<T = any>(): Promise<T | null> {
    return this._locator.evaluate(
      withReact((getFiber, el) => {
        const fiber = getFiber(el);
        if (!fiber) return null;
        const ms = fiber.memoizedState;
        if (!ms) return null;

        // Class component
        if (
          fiber.stateNode &&
          typeof fiber.stateNode === "object" &&
          (fiber.stateNode as any).isReactComponent
        ) {
          return ms;
        }

        // Function component — hooks linked list
        const states: any[] = [];
        let hook = ms;
        let guard = 0;
        while (hook !== null && guard < 200) {
          if (hook.queue != null) states.push(hook.memoizedState);
          hook = hook.next;
          guard++;
        }
        if (states.length === 0) return null;
        return states.reduce(
          (acc: any, s: any, i: number) => ({ ...acc, [String(i)]: s }),
          {},
        );
      }),
    ) as Promise<T | null>;
  }

  // ── Context ────────────────────────────────────────────────────────────────

  /**
   * Returns the context of the nearest React **class** component (`this.context`).
   *
   * Returns `null` for function components — context consumed via `useContext`
   * hooks is not directly accessible through the fiber tree.
   *
   * @example
   * // Class component that consumes a ThemeContext
   * const ctx = await $r("react=ThemedButton").context<{ theme: string }>();
   */
  async context<T = any>(): Promise<T | null> {
    return this._locator.evaluate(
      withReact((getFiber, el) => {
        const fiber = getFiber(el);
        if (!fiber) return null;
        if (
          fiber.stateNode &&
          typeof fiber.stateNode === "object" &&
          (fiber.stateNode as any).isReactComponent
        ) {
          return (fiber.stateNode as any).context ?? null;
        }
        return null;
      }),
    ) as Promise<T | null>;
  }
}

// Declaration merging: ReactHtmlElement gains all Playwright Locator methods.
// At runtime the Proxy in the constructor forwards unknown property lookups to
// the underlying locator, so all standard Playwright methods (click, fill,
// waitFor, …) work directly on ReactHtmlElement instances.
export interface ReactHtmlElement extends Locator {}

// ─── Fixture ───────────────────────────────────────────────────────────────────

type WorkerFixtures = {
  /** @internal Registers the React selector engine once per worker process. */
  _registerReactEngine: void;
};

export type Fixture = {
  /**
   * Returns a {@link ReactHtmlElement} wrapping the first element matched by
   * `selector`. Accepts the same options as `page.locator()`.
   *
   * The React selector engine (`react=…` syntax) is registered automatically
   * when this fixture is used.
   *
   * Selector syntax:
   * - `react=ComponentName` — match by component display name
   * - `react=ComponentName[props.name="value"]` — match by prop value
   * - `react=ComponentName[state.count=5]` — match by hook state (index) or class state key
   * - `react=ComponentName[context.theme="dark"]` — match by class component context
   *
   * @example
   * const btn   = $r("react=Button[props.disabled=false]");
   * await btn.click();                     // ← standard Locator method
   * const count = (await btn.state())?.["0"];
   * const label = await btn.prop("label");
   */
  $r: (
    selector: string,
    options?: {
      has?: Locator;
      hasNot?: Locator;
      hasNotText?: string | RegExp;
      hasText?: string | RegExp;
    },
  ) => ReactHtmlElement;
};

export const test = baseTest.extend<Fixture, WorkerFixtures>({
  _registerReactEngine: [
    async ({}, use) => {
      try {
        selectors.register("react", ReactEngine);
      } catch {
        // Already registered in this worker — safe to ignore
      }
      await use();
    },
    { scope: "worker", auto: true },
  ],

  $r: async ({ page }, use) => {
    await use(
      (selector, options) =>
        new ReactHtmlElement(page.locator(selector, options)),
    );
  },
});
