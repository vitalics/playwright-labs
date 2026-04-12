import { test as baseTest, type Locator, selectors } from "@playwright/test";
import { VueEngine } from "./engine";

// ─── Browser-side helper builder ──────────────────────────────────────────────

/**
 * Builds a **self-contained** browser-side evaluate function that resolves the
 * Vue component instance for the element and injects it as the first argument
 * before calling `fn`.
 *
 * Uses `new Function` (not a plain closure) so the complete helper code is
 * embedded in the generated function string — safe to serialise and send to
 * the browser by Playwright's `evaluate`.
 *
 * The lookup strategy:
 *  1. Walk up the DOM tree from `el` to find the Vue app (`__vue_app__`).
 *  2. Walk the component tree (`app._instance.subTree`) to find the component
 *     whose first rendered DOM element equals `el`.
 *
 * **HOC limitation**: when a wrapper component renders only a single child
 * component with no DOM nodes of its own, `getFirstElement` of both components
 * resolves to the same element. In that case the outermost (wrapper) component
 * instance is returned.
 *
 * @example
 * locator.evaluate(withVue((getInstance, el) => getInstance(el)?.props));
 */
function withVue<T>(
  fn: (getInstance: (el: Element) => any, el: Element, arg?: any) => T,
): (el: Element, arg?: any) => T {
  return new Function(
    "el",
    "arg",
    `"use strict";
function findVueApp(el) {
  var current = el;
  while (current) {
    if (current.__vue_app__) return current.__vue_app__;
    current = current.parentElement;
  }
  return null;
}
function getFirstElement(vnode) {
  if (!vnode) return null;
  if (vnode.el && vnode.el.nodeType === 1) return vnode.el;
  if (Array.isArray(vnode.children)) {
    for (var i = 0; i < vnode.children.length; i++) {
      var child = vnode.children[i];
      if (child && typeof child === 'object') {
        var found = getFirstElement(child);
        if (found) return found;
      }
    }
  }
  if (vnode.component) return getFirstElement(vnode.component.subTree);
  return null;
}
function searchInVNode(vnode, targetEl) {
  if (!vnode) return null;
  if (vnode.component) return searchForElement(vnode.component, targetEl);
  var children = vnode.children;
  if (Array.isArray(children)) {
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child && typeof child === 'object') {
        var found2 = searchInVNode(child, targetEl);
        if (found2) return found2;
      }
    }
  }
  return null;
}
function searchForElement(instance, targetEl) {
  if (!instance || !instance.subTree) return null;
  if (getFirstElement(instance.subTree) === targetEl) return instance;
  return searchInVNode(instance.subTree, targetEl);
}
function getVueInstance(el) {
  var app = findVueApp(el);
  if (!app || !app._instance) return null;
  return searchForElement(app._instance, el);
}
return (${fn.toString()})(getVueInstance, el, arg);`,
  ) as (el: Element, arg?: any) => T;
}

// ─── VueHtmlElement ────────────────────────────────────────────────────────────

/**
 * A wrapper around a Playwright `Locator` that exposes a typed, Vue-aware API
 * for inspecting Vue component instances at runtime.
 *
 * `VueHtmlElement` is fully compatible with `Locator` — all standard Playwright
 * methods (`click`, `fill`, `waitFor`, etc.) are forwarded to the underlying
 * locator via a transparent `Proxy`. Vue-specific methods (`props`, `setup`,
 * `data`, …) are layered on top.
 *
 * Obtained via the `$v` fixture:
 * ```typescript
 * const counter = $v("vue=Counter");
 * await counter.click();                   // ← standard Locator method
 * const state = await counter.setup();     // ← Vue-specific method
 * ```
 *
 * The selector engine uses Vue 3's internal component tree (`app._instance` and
 * `subTree`), which is available in **development builds**. Vue DevTools are
 * **not** required.
 */
export class VueHtmlElement {
  constructor(private readonly _locator: Locator) {
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (Reflect.has(target, prop)) {
          return Reflect.get(target, prop, receiver);
        }
        const val = Reflect.get(_locator as object, prop, _locator);
        return typeof val === "function" ? (val as any).bind(_locator) : val;
      },
    });
  }

  // ── Locator narrowing ──────────────────────────────────────────────────────

  /** Returns a `VueHtmlElement` for the element at position `index` (0-based). */
  nth(index: number): VueHtmlElement {
    return new VueHtmlElement(this._locator.nth(index));
  }

  /** Returns a `VueHtmlElement` for the first matched element. */
  first(): VueHtmlElement {
    return new VueHtmlElement(this._locator.first());
  }

  /** Returns a `VueHtmlElement` for the last matched element. */
  last(): VueHtmlElement {
    return new VueHtmlElement(this._locator.last());
  }

  // ── Component introspection ────────────────────────────────────────────────

  /**
   * Returns the display name of the nearest Vue component, or `null` when the
   * element is not associated with a Vue component.
   */
  async componentName(): Promise<string | null> {
    return this._locator.evaluate(
      withVue((getInstance, el) => {
        const instance = getInstance(el);
        if (!instance) return null;
        const type = instance.type;
        return (
          (type as any)?.displayName ||
          (type as any)?.name ||
          (type as any)?.__name ||
          null
        );
      }),
    );
  }

  // ── Props ──────────────────────────────────────────────────────────────────

  /**
   * Returns all props of the nearest Vue component.
   *
   * @example
   * const props = await $v("vue=Button").props<{ label: string }>();
   */
  async props<T = Record<string, any>>(): Promise<T> {
    return this._locator.evaluate(
      withVue((getInstance, el) => {
        const instance = getInstance(el);
        return ((instance?.props ?? {}) as any) as T;
      }),
    ) as Promise<T>;
  }

  /**
   * Returns the value of a specific prop.
   *
   * @throws when no Vue component fiber is found or the prop does not exist.
   *
   * @example
   * const label = await $v("vue=Button").prop("label");
   */
  async prop<T = unknown>(name: string): Promise<T> {
    return this._locator.evaluate(
      withVue((getInstance, el, propName: string) => {
        const instance = getInstance(el);
        if (!instance)
          throw new Error("No Vue component instance found for this element");
        const props = instance.props ?? {};
        if (!(propName in props))
          throw new Error(`Prop "${propName}" not found on component`);
        return props[propName];
      }),
      name,
    ) as Promise<T>;
  }

  // ── Setup state (Composition API) ─────────────────────────────────────────

  /**
   * Returns the Composition API setup state of the nearest Vue component.
   *
   * Refs are automatically unwrapped. Returns `null` when the component has no
   * setup state (e.g. an Options API component without a `setup()` function).
   *
   * @example
   * // Counter.vue: const count = ref(0)
   * const state = await $v("vue=Counter").setup<{ count: number }>();
   * // state.count === 0
   */
  async setup<T = Record<string, any>>(): Promise<T | null> {
    return this._locator.evaluate(
      withVue((getInstance, el) => {
        const instance = getInstance(el);
        if (!instance) return null;
        const raw = instance.setupState;
        if (!raw || typeof raw !== "object") return null;
        const state: Record<string, any> = {};
        let hasAny = false;
        const keys = Object.keys(raw);
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (key.startsWith("__v_") || key.startsWith("__VUE")) continue;
          const val = raw[key];
          state[key] =
            val && typeof val === "object" && val.__v_isRef ? val.value : val;
          hasAny = true;
        }
        return (hasAny ? state : null) as T | null;
      }),
    ) as Promise<T | null>;
  }

  // ── Data (Options API) ────────────────────────────────────────────────────

  /**
   * Returns the Options API reactive data (`data()`) of the nearest Vue
   * component.
   *
   * Returns `null` for Composition API-only components.
   *
   * @example
   * // OptionsCounter.vue: data() { return { count: 0 } }
   * const data = await $v("vue=OptionsCounter").data<{ count: number }>();
   * // data.count === 0
   */
  async data<T = Record<string, any>>(): Promise<T | null> {
    return this._locator.evaluate(
      withVue((getInstance, el) => {
        const instance = getInstance(el);
        if (!instance) return null;
        const data = instance.data;
        if (!data || typeof data !== "object") return null;
        const result: Record<string, any> = {};
        let hasAny = false;
        const keys = Object.keys(data);
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (key.startsWith("__v_")) continue;
          result[key] = data[key];
          hasAny = true;
        }
        return (hasAny ? result : null) as T | null;
      }),
    ) as Promise<T | null>;
  }
}

// Declaration merging: VueHtmlElement gains all Playwright Locator methods.
export interface VueHtmlElement extends Locator {}

// ─── Fixture ───────────────────────────────────────────────────────────────────

type WorkerFixtures = {
  /** @internal Registers the Vue selector engine once per worker process. */
  _registerVueEngine: void;
};

export type Fixture = {
  /**
   * Returns a {@link VueHtmlElement} wrapping the first element matched by
   * `selector`. Accepts the same options as `page.locator()`.
   *
   * The Vue selector engine (`vue=…` syntax) is registered automatically when
   * this fixture is used.
   *
   * Selector syntax:
   * - `vue=ComponentName` — match by component display name
   * - `vue=ComponentName[label="value"]` — match by prop value (default source)
   * - `vue=ComponentName[props.label="value"]` — explicit props prefix
   * - `vue=ComponentName[setup.count=0]` — Composition API state
   * - `vue=ComponentName[data.count=0]` — Options API data
   *
   * @example
   * const btn = $v("vue=Button[props.disabled=false]");
   * await btn.click();
   * const label = await btn.prop("label");
   */
  $v: (
    selector: string,
    options?: {
      has?: Locator;
      hasNot?: Locator;
      hasNotText?: string | RegExp;
      hasText?: string | RegExp;
    },
  ) => VueHtmlElement;
};

export const test = baseTest.extend<Fixture, WorkerFixtures>({
  _registerVueEngine: [
    async ({}, use) => {
      try {
        selectors.register("vue", VueEngine);
      } catch {
        // Already registered in this worker — safe to ignore
      }
      await use();
    },
    { scope: "worker", auto: true },
  ],

  $v: async ({ page }, use) => {
    await use(
      (selector, options) =>
        new VueHtmlElement(page.locator(selector, options)),
    );
  },
});
