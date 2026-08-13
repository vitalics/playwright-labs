/// <reference lib="dom" />

import {
  registerRealizer,
  type Realizer,
} from "@playwright-labs/locators-extra";

declare module "@playwright-labs/locators-extra" {
  interface KnownSelectorKinds {
    /** Realize a locator into a `react=ComponentName` selector. */
    react: true;
  }
}

/**
 * Realizer for the `react=` selector engine: element → `react=ComponentName`,
 * where the name comes from the nearest named component above the element in
 * the fiber tree.
 *
 * Runs in the browser (serialized by `@playwright-labs/locators-extra`), so the
 * fiber helpers are inlined — same constraint as `ReactEngine`.
 *
 * The realized selector identifies the component **type**, not the instance:
 * `react=Button` matches every `Button` on the page. Narrow with props
 * (`react=Button[label="Submit"]`) or `.nth()` when you need one instance.
 */
export const ReactRealizer: Realizer = (el) => {
  function getReactFiber(node: Element): any {
    const key = Object.keys(node).find(
      (k) => k.startsWith("__reactFiber$") || k.startsWith("_reactInternals"),
    );
    return key ? (node as any)[key] : null;
  }

  function getComponentName(fiber: any): string | null {
    const type = fiber.type;
    if (!type || typeof type === "string") return null;
    if (typeof type === "function")
      return type.displayName || type.name || null;
    if (typeof type === "object") {
      const inner = type.type || type.render;
      const innerName = inner
        ? inner.displayName || inner.name || null
        : null;
      return type.displayName || innerName || null;
    }
    return null;
  }

  // React puts the fiber key on host elements it rendered; for text-only or
  // portal edge cases walk the DOM up until an element carries one.
  let fiber: any = null;
  let dom: Element | null = el;
  while (dom && !fiber) {
    fiber = getReactFiber(dom);
    dom = dom.parentElement;
  }
  if (!fiber) {
    throw new Error(
      "ReactRealizer: no React fiber found — element is not rendered by React",
    );
  }

  while (fiber) {
    const name = getComponentName(fiber);
    if (name) return `react=${name}`;
    fiber = fiber.return;
  }
  throw new Error(
    "ReactRealizer: no named React component above the element",
  );
};

registerRealizer("react", ReactRealizer);
