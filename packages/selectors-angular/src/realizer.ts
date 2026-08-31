/// <reference lib="dom" />

import {
  registerRealizer,
  type Realizer,
} from "@playwright-labs/locators-extra";

declare module "@playwright-labs/locators-extra" {
  interface KnownSelectorKinds {
    /** Realize a locator into an `angular=<host-tag-name>` selector. */
    angular: true;
  }
}

/**
 * Realizer for the `angular=` selector engine: element → `angular=<tag-name>`,
 * where the tag name is the host element of the nearest Angular component
 * above (or at) the element, resolved via the dev-mode `window.ng` globals.
 *
 * Runs in the browser (serialized by `@playwright-labs/locators-extra`), so the
 * `window.ng` helpers are inlined — same constraint as `AngularEngine`.
 *
 * The realized selector identifies the component **type**, not the instance:
 * `angular=app-button` matches every `app-button` on the page. Narrow with
 * props (`angular=app-button[label="Submit"]`) or `.nth()` when you need one
 * instance.
 */
export const AngularRealizer: Realizer = (el) => {
  const ng = (window as any).ng;
  if (!ng || typeof ng.getComponent !== "function") {
    throw new Error(
      "AngularRealizer: window.ng is not available — Angular dev mode is required",
    );
  }

  // `ng.getComponent(hostElement)` returns the component whose host is that
  // element. A component's template DOM lives inside its host element, so
  // walking up the ancestors finds the nearest component that owns `el`.
  let node: Element | null = el;
  while (node) {
    let component: any = null;
    try {
      component = ng.getComponent(node);
    } catch {
      // not an Angular-managed node — keep walking up
    }
    if (component) {
      const host: Element = ng.getHostElement(component) || node;
      return `angular=${host.tagName.toLowerCase()}`;
    }
    node = node.parentElement;
  }

  // Fallback: the element may sit in a template whose host is not an ancestor
  // (e.g. projected content). Ask Angular which component's template owns it.
  try {
    const owner = ng.getOwningComponent(el);
    if (owner) {
      const host: Element = ng.getHostElement(owner);
      return `angular=${host.tagName.toLowerCase()}`;
    }
  } catch {
    // no owning component either — fall through to the error
  }

  throw new Error("AngularRealizer: no Angular component owns the element");
};

registerRealizer("angular", AngularRealizer);
