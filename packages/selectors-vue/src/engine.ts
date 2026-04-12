/// <reference lib="dom" />

import type {
  AttributeSelector,
  AttributeSelectorPart as BasePart,
} from "@playwright-labs/selectors-core";
import type { AttributeSelectorPart, AttributeSource } from "./types";

// NOTE: parseAttributeSelector and matchesAttributePart are intentionally
// inlined inside VueEngine() rather than imported from @playwright-labs/selectors-core.
//
// Playwright serializes the engine factory via .toString() and evaluates the
// resulting string in the browser context. Closure variables from Node.js imports
// are NOT available in the browser — only the code inside the function body is
// sent. Inlining keeps the factory self-contained without any external references.

type SelectorRoot = Element | ShadowRoot | Document;

type VueNode = {
  /** Vue component display name */
  name: string;
  /** First DOM element rendered by this component */
  element: Element;
  /** Component props */
  props: Record<string, any>;
  /**
   * Options API reactive data (`data()` return value).
   * `null` for Composition API-only components.
   */
  data: Record<string, any> | null;
  /**
   * Composition API setup state (`setup()` / `<script setup>` bindings).
   * Refs are automatically unwrapped. `null` when setup returns nothing.
   */
  setup: Record<string, any> | null;
};

export const VueEngine = () => {
  // ── Inlined from @playwright-labs/selectors-core ────────────────────────────
  // These must live inside the factory body so they are included when Playwright
  // serializes the factory via .toString() for browser-side evaluation.

  function parseAttributeSelector(
    selector: string,
    allowUnquotedStrings: boolean,
  ): AttributeSelector {
    let wp = 0;
    let EOL = selector.length === 0;

    const next = () => selector[wp] || "";
    const eat1 = () => {
      const result = next();
      ++wp;
      EOL = wp >= selector.length;
      return result;
    };

    const syntaxError = (stage: string | undefined) => {
      if (EOL)
        throw new Error(
          `Unexpected end of selector while parsing selector \`${selector}\``,
        );
      throw new Error(
        `Error while parsing selector \`${selector}\` - unexpected symbol "${next()}" at position ${wp}` +
          (stage ? " during " + stage : ""),
      );
    };

    function skipSpaces() {
      while (!EOL && /\s/.test(next())) eat1();
    }

    function isCSSNameChar(char: string) {
      return (
        char >= "\u0080" ||
        (char >= "\u0030" && char <= "\u0039") ||
        (char >= "\u0041" && char <= "\u005a") ||
        (char >= "\u0061" && char <= "\u007a") ||
        char === "\u005f" ||
        char === "\u002d"
      );
    }

    function readIdentifier() {
      let result = "";
      skipSpaces();
      while (!EOL && isCSSNameChar(next())) result += eat1();
      return result;
    }

    function readQuotedString(quote: string) {
      let result = eat1();
      if (result !== quote) syntaxError("parsing quoted string");
      while (!EOL && next() !== quote) {
        if (next() === "\\") eat1();
        result += eat1();
      }
      if (next() !== quote) syntaxError("parsing quoted string");
      result += eat1();
      return result;
    }

    function readRegularExpression() {
      if (eat1() !== "/") syntaxError("parsing regular expression");
      let source = "";
      let inClass = false;
      while (!EOL) {
        if (next() === "\\") {
          source += eat1();
          if (EOL) syntaxError("parsing regular expression");
        } else if (inClass && next() === "]") {
          inClass = false;
        } else if (!inClass && next() === "[") {
          inClass = true;
        } else if (!inClass && next() === "/") {
          break;
        }
        source += eat1();
      }
      if (eat1() !== "/") syntaxError("parsing regular expression");
      let flags = "";
      while (!EOL && next().match(/[dgimsuy]/)) flags += eat1();
      try {
        return new RegExp(source, flags);
      } catch (e) {
        throw new Error(
          `Error while parsing selector \`${selector}\`: ${(e as Error).message}`,
        );
      }
    }

    function readAttributeToken() {
      let token = "";
      skipSpaces();
      if (next() === `'` || next() === `"`)
        token = readQuotedString(next()).slice(1, -1);
      else token = readIdentifier();
      if (!token) syntaxError("parsing property path");
      return token;
    }

    function readOperator() {
      skipSpaces();
      let op = "";
      if (!EOL) op += eat1();
      if (!EOL && op !== "=") op += eat1();
      if (!["=", "*=", "^=", "$=", "|=", "~="].includes(op))
        syntaxError("parsing operator");
      return op;
    }

    function readAttribute(): BasePart {
      eat1();

      const jsonPath: string[] = [];
      jsonPath.push(readAttributeToken());
      skipSpaces();
      while (next() === ".") {
        eat1();
        jsonPath.push(readAttributeToken());
        skipSpaces();
      }

      if (next() === "]") {
        eat1();
        return {
          name: jsonPath.join("."),
          jsonPath,
          op: "<truthy>",
          value: null,
          caseSensitive: false,
        } as BasePart;
      }

      const operator = readOperator();

      let value: any = undefined;
      let caseSensitive = true;
      skipSpaces();
      if (next() === "/") {
        if (operator !== "=")
          throw new Error(
            `Error while parsing selector \`${selector}\` - cannot use ${operator} in attribute with regular expression`,
          );
        value = readRegularExpression();
      } else if (next() === `'` || next() === `"`) {
        value = readQuotedString(next()).slice(1, -1);
        skipSpaces();
        if (next() === "i" || next() === "I") {
          caseSensitive = false;
          eat1();
        } else if (next() === "s" || next() === "S") {
          caseSensitive = true;
          eat1();
        }
      } else {
        value = "";
        while (
          !EOL &&
          (isCSSNameChar(next()) || next() === "+" || next() === ".")
        )
          value += eat1();
        if (value === "true") {
          value = true;
        } else if (value === "false") {
          value = false;
        } else {
          if (!allowUnquotedStrings) {
            value = +value;
            if (Number.isNaN(value)) syntaxError("parsing attribute value");
          }
        }
      }
      skipSpaces();
      if (next() !== "]") syntaxError("parsing attribute value");

      eat1();
      if (operator !== "=" && typeof value !== "string")
        throw new Error(
          `Error while parsing selector \`${selector}\` - cannot use ${operator} in attribute with non-string matching value - ${value}`,
        );
      return {
        name: jsonPath.join("."),
        jsonPath,
        op: operator,
        value,
        caseSensitive,
      } as BasePart;
    }

    const result = { name: "", attributes: [] as BasePart[] };
    result.name = readIdentifier();
    skipSpaces();
    while (next() === "[") {
      result.attributes.push(readAttribute());
      skipSpaces();
    }
    if (!EOL) syntaxError(undefined);
    if (!result.name && !result.attributes.length)
      throw new Error(
        `Error while parsing selector \`${selector}\` - selector cannot be empty`,
      );
    return result;
  }

  function matchesAttributePart(value: any, attr: BasePart): boolean {
    const objValue =
      typeof value === "string" && !attr.caseSensitive
        ? value.toUpperCase()
        : value;
    const attrValue =
      typeof attr.value === "string" && !attr.caseSensitive
        ? attr.value.toUpperCase()
        : attr.value;

    if (attr.op === "<truthy>") return !!objValue;
    if (attr.op === "=") {
      if (attrValue instanceof RegExp)
        return typeof objValue === "string" && !!objValue.match(attrValue);
      return objValue === attrValue;
    }
    if (typeof objValue !== "string" || typeof attrValue !== "string")
      return false;
    if (attr.op === "*=") return objValue.includes(attrValue);
    if (attr.op === "^=") return objValue.startsWith(attrValue);
    if (attr.op === "$=") return objValue.endsWith(attrValue);
    if (attr.op === "|=")
      return objValue === attrValue || objValue.startsWith(attrValue + "-");
    if (attr.op === "~=") return objValue.split(" ").includes(attrValue);
    return false;
  }

  // ── Source extraction ────────────────────────────────────────────────────────

  const SOURCES: AttributeSource[] = ["props", "data", "setup"];

  function withSource(part: BasePart): AttributeSelectorPart {
    const [first, ...rest] = part.jsonPath;
    if (SOURCES.includes(first as AttributeSource) && rest.length > 0) {
      return {
        ...part,
        source: first as AttributeSource,
        name: rest.join("."),
        jsonPath: rest,
      };
    }
    return { ...part, source: "props" };
  }

  // ── Engine ───────────────────────────────────────────────────────────────────

  return {
    queryAll(scope: SelectorRoot, selector: string): Element[] {
      const parsed = parseAttributeSelector(selector, false);
      const attributes = parsed.attributes.map(withSource);
      const vueTree = this.buildVueTree(scope as Element);

      const nodes = vueTree.filter((node) => {
        if (parsed.name && node.name !== parsed.name) return false;
        for (const attr of attributes) {
          if (!this.matchesComponentAttribute(node, attr)) return false;
        }
        return true;
      });

      const allRootElements: Set<Element> = new Set();
      for (const node of nodes) allRootElements.add(node.element);
      return [...allRootElements];
    },

    buildVueTree(scope: Element): VueNode[] {
      const results: VueNode[] = [];

      /** Walk up the DOM (and then inward) to find the Vue app instance. */
      function findVueApp(el: Element): any {
        // Check el itself (the mount point has __vue_app__)
        if ((el as any).__vue_app__) return (el as any).__vue_app__;
        // Walk ancestors — scope might be nested inside the app
        let parent = el.parentElement;
        while (parent) {
          if ((parent as any).__vue_app__) return (parent as any).__vue_app__;
          parent = parent.parentElement;
        }
        // Walk descendants — scope might be document or a wrapper
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
        let node = walker.nextNode() as Element | null;
        while (node) {
          if ((node as any).__vue_app__) return (node as any).__vue_app__;
          node = walker.nextNode() as Element | null;
        }
        return null;
      }

      /** Resolve the component display name from the component definition type. */
      function getComponentName(type: any): string | null {
        if (!type) return null;
        // Options API `name`, SFC compiler `__name`, or custom `displayName`
        return type.displayName || type.name || type.__name || null;
      }

      /**
       * Find the first Element node in a VNode subtree.
       * Handles fragments (multiple root nodes) and component vnodes.
       */
      function getFirstElement(vnode: any): Element | null {
        if (!vnode) return null;
        // Direct element node
        if (vnode.el && vnode.el.nodeType === 1 /* ELEMENT_NODE */)
          return vnode.el as Element;
        // Fragment or element vnode with array children
        if (Array.isArray(vnode.children)) {
          for (const child of vnode.children as any[]) {
            if (child && typeof child === "object") {
              const found = getFirstElement(child);
              if (found) return found;
            }
          }
        }
        // Component vnode — look inside the component's rendered output
        if (vnode.component) return getFirstElement(vnode.component.subTree);
        return null;
      }

      /** Unwrap a Vue ref to its raw value. */
      function unref(val: any): any {
        return val && typeof val === "object" && val.__v_isRef
          ? val.value
          : val;
      }

      /**
       * Extract Composition API setup state.
       * Unwraps refs and filters Vue-internal keys.
       */
      function getSetupState(instance: any): Record<string, any> | null {
        const raw = instance.setupState;
        if (!raw || typeof raw !== "object") return null;
        const state: Record<string, any> = {};
        let hasAny = false;
        for (const key of Object.keys(raw)) {
          // Skip Vue-internal properties
          if (key.startsWith("__v_") || key.startsWith("__VUE")) continue;
          state[key] = unref(raw[key]);
          hasAny = true;
        }
        return hasAny ? state : null;
      }

      /**
       * Extract Options API reactive data.
       * Filters Vue-internal reactive bookkeeping keys.
       */
      function getData(instance: any): Record<string, any> | null {
        const data = instance.data;
        if (!data || typeof data !== "object") return null;
        const result: Record<string, any> = {};
        let hasAny = false;
        for (const key of Object.keys(data)) {
          if (key.startsWith("__v_")) continue;
          result[key] = data[key];
          hasAny = true;
        }
        return hasAny ? result : null;
      }

      /**
       * Walk the component instance tree depth-first, collecting VueNodes.
       * When a component vnode is encountered in the subTree, we recurse into
       * that component's own subTree (never into a component's vnode children,
       * which are slots — not the rendered output).
       */
      function walkComponent(instance: any) {
        if (!instance) return;

        const name = getComponentName(instance.type);
        if (name) {
          const el = getFirstElement(instance.subTree);
          if (el && (el === scope || scope.contains(el))) {
            results.push({
              name,
              element: el,
              props: instance.props || {},
              data: getData(instance),
              setup: getSetupState(instance),
            });
          }
        }

        walkVNode(instance.subTree);
      }

      function walkVNode(vnode: any) {
        if (!vnode) return;

        // Component vnode — recurse into the component's own rendered output
        if (vnode.component) {
          walkComponent(vnode.component);
          return;
        }

        // Element / fragment vnode — walk its children for nested components
        const children = vnode.children;
        if (Array.isArray(children)) {
          for (const child of children as any[]) {
            if (child && typeof child === "object") walkVNode(child);
          }
        }
      }

      const app = findVueApp(scope);
      if (!app || !app._instance) return results;

      walkComponent(app._instance);
      return results;
    },

    matchesComponentAttribute(
      node: VueNode,
      attr: AttributeSelectorPart,
    ): boolean {
      let obj: any;
      if (attr.source === "props") obj = node.props;
      else if (attr.source === "data") obj = node.data;
      else obj = node.setup;

      if (obj === null || obj === undefined) return false;

      let current = obj;
      for (const token of attr.jsonPath) {
        if (current === null || current === undefined) return false;
        current = current[token];
      }
      return matchesAttributePart(current, attr);
    },
  };
};
