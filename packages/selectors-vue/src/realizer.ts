/// <reference lib="dom" />

import {
  registerRealizer,
  type Realizer,
} from "@playwright-labs/locators-extra";

declare module "@playwright-labs/locators-extra" {
  interface KnownSelectorKinds {
    /** Realize a locator into a `vue=ComponentName` selector. */
    vue: true;
  }
}

/**
 * Realizer for the `vue=` selector engine: element → `vue=ComponentName`,
 * where the name comes from the nearest named component above the element in
 * the Vue component instance tree.
 *
 * Runs in the browser (serialized by `@playwright-labs/locators-extra`), so the
 * instance helpers are inlined — same constraint as `VueEngine`.
 *
 * The realized selector identifies the component **type**, not the instance:
 * `vue=Button` matches every `Button` on the page. Narrow with props
 * (`vue=Button[label="Submit"]`) or `.nth()` when you need one instance.
 */
export const VueRealizer: Realizer = (el) => {
  function getComponentName(instance: any): string | null {
    const type = instance && instance.type;
    if (!type) return null;
    // Options API `name`, SFC compiler `__name`, or custom `displayName`
    return type.displayName || type.name || type.__name || null;
  }

  // Vue 3 sets __vueParentComponent on the root DOM elements of each
  // component; for inner elements walk the DOM up until an element carries one.
  let instance: any = null;
  let dom: Element | null = el;
  while (dom && !instance) {
    instance = (dom as any).__vueParentComponent || null;
    dom = dom.parentElement;
  }
  if (!instance) {
    throw new Error(
      "VueRealizer: no Vue component instance found — element is not rendered by Vue",
    );
  }

  // The found instance may be anonymous (or the element's own host instance);
  // walk the instance.parent chain until a named component is found.
  while (instance) {
    const name = getComponentName(instance);
    if (name) return `vue=${name}`;
    instance = instance.parent;
  }
  throw new Error("VueRealizer: no named Vue component above the element");
};

registerRealizer("vue", VueRealizer);
