import type { Locator } from "playwright-core";

/**
 * Selector kinds known at the type level. Selector-engine packages extend this
 * via module augmentation, so their kind shows up in `SelectorKind`
 * autocomplete as soon as the package is imported:
 *
 * ```ts
 * declare module "@playwright-labs/locators-extra" {
 *   interface KnownSelectorKinds {
 *     react: true;
 *   }
 * }
 * ```
 */
export interface KnownSelectorKinds {
  css: true;
  xpath: true;
  tag: true;
}

/**
 * Selector language to realize a locator into. Built-ins: `"css"`, `"xpath"`,
 * `"tag"`. Other kinds come from custom realizers registered via
 * {@link registerRealizer} — e.g. the react/vue/angular selector engines;
 * packages that also augment {@link KnownSelectorKinds} get autocomplete.
 */
export type SelectorKind = keyof KnownSelectorKinds | (string & {});

/**
 * Browser-side function: element → selector string. Serialized into the page,
 * so it must be self-contained — no closures over module scope.
 */
export type Realizer = (el: Element) => string;

const customRealizers = new Map<string, Realizer>();

/**
 * Registers a realizer for a custom selector engine, making
 * `selectorRealization(locator, kind)` understand that `kind`.
 *
 * ```ts
 * registerRealizer("testid", (el) => {
 *   const id = el.getAttribute("data-testid");
 *   if (!id) throw new Error("element has no data-testid");
 *   return `[data-testid="${id}"]`;
 * });
 * ```
 */
export function registerRealizer(kind: string, realizer: Realizer): void {
  customRealizers.set(kind, realizer);
}

/**
 * Runs in the browser. Handles both a single element (`locator.evaluate`)
 * and an array (`locator.evaluateAll`) so the DOM-walking logic exists once —
 * page functions are serialized, they cannot share helpers across calls.
 */
function realizeInPage(
  target: Element | Element[],
  kind: SelectorKind,
): string | string[] {
  const escape = (value: string): string =>
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(value)
      : value.replace(/([^a-zA-Z0-9_-])/g, "\\$1");

  const one = (el: Element): string => {
    if (kind === "tag") return el.tagName.toLowerCase();

    if (kind === "css") {
      const parts: string[] = [];
      let node: Element | null = el;
      while (node) {
        // An id is unique per document — anchor the path here and stop.
        if (node.id) {
          parts.unshift(`#${escape(node.id)}`);
          return parts.join(" > ");
        }
        const tag = node.tagName.toLowerCase();
        const parent: Element | null = node.parentElement;
        let part = tag;
        if (parent) {
          const current = node;
          const siblings = Array.from(parent.children).filter(
            (child) => child.tagName === current.tagName,
          );
          if (siblings.length > 1) {
            part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
          }
        }
        parts.unshift(part);
        node = parent;
      }
      return parts.join(" > ");
    }

    // xpath
    const parts: string[] = [];
    let node: Element | null = el;
    while (node) {
      const tag = node.tagName.toLowerCase();
      const parent: Element | null = node.parentElement;
      if (parent) {
        const current = node;
        const siblings = Array.from(parent.children).filter(
          (child) => child.tagName === current.tagName,
        );
        parts.unshift(
          siblings.length > 1
            ? `${tag}[${siblings.indexOf(current) + 1}]`
            : tag,
        );
      } else {
        parts.unshift(tag);
      }
      node = parent;
    }
    return `/${parts.join("/")}`;
  };

  return Array.isArray(target) ? target.map(one) : one(target);
}

/**
 * Runs in the browser: revives a serialized custom realizer and applies it.
 * Uses indirect eval, so pages with a strict CSP (no `unsafe-eval`) reject it —
 * built-in kinds do not have this constraint.
 */
function realizeCustomInPage(
  target: Element | Element[],
  source: string,
): string | string[] {
  const realizer = (0, eval)(`(${source})`) as (el: Element) => string;
  return Array.isArray(target) ? target.map(realizer) : realizer(target);
}

function customRealizerSource(kind: string): string | undefined {
  const realizer = customRealizers.get(kind);
  return realizer?.toString();
}

function unknownKind(kind: string): Error {
  const known = ["css", "xpath", "tag", ...customRealizers.keys()];
  return new Error(
    `Unknown selector kind "${kind}". Known kinds: ${known.join(", ")}. ` +
      `Register custom kinds with registerRealizer(kind, realizer).`,
  );
}

function isBuiltinKind(kind: SelectorKind): kind is "css" | "xpath" | "tag" {
  return kind === "css" || kind === "xpath" || kind === "tag";
}

/**
 * Realizes a locator into a concrete selector for the element it resolves to.
 *
 * Follows `locator.evaluate` semantics: waits for the element and throws on
 * strict-mode violation when the locator matches more than one element —
 * use {@link selectorRealizationAll} for multi-element locators.
 *
 * - `"css"` (default) — unique CSS path, anchored at the nearest ancestor with an id
 *   (`#form > div > input:nth-of-type(2)`)
 * - `"xpath"` — absolute XPath (`/html/body/div[2]/input`)
 * - `"tag"` — lower-case tag name (`input`)
 * - any kind registered via {@link registerRealizer}
 */
export async function selectorRealization(
  locator: Locator,
  kind: SelectorKind = "css",
): Promise<string> {
  if (isBuiltinKind(kind)) {
    return locator.evaluate(realizeInPage, kind) as Promise<string>;
  }
  const source = customRealizerSource(kind);
  if (source === undefined) throw unknownKind(kind);
  return locator.evaluate(realizeCustomInPage, source) as Promise<string>;
}

/**
 * Realizes a locator into selectors for **every** element it currently matches.
 * Follows `locator.evaluateAll` semantics: does not wait, resolves to `[]`
 * when nothing matches.
 */
export async function selectorRealizationAll(
  locator: Locator,
  kind: SelectorKind = "css",
): Promise<string[]> {
  if (isBuiltinKind(kind)) {
    return locator.evaluateAll(realizeInPage, kind) as Promise<string[]>;
  }
  const source = customRealizerSource(kind);
  if (source === undefined) throw unknownKind(kind);
  return locator.evaluateAll(realizeCustomInPage, source) as Promise<string[]>;
}
