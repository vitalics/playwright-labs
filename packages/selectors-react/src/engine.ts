/// <reference lib="dom" />

import type {
  AttributeSelector,
  AttributeSelectorPart as BasePart,
} from "@playwright-labs/selectors-core";
import type { AttributeSelectorPart, AttributeSource } from "./types";

// NOTE: parseAttributeSelector and matchesAttributePart are intentionally
// inlined inside ReactEngine() rather than imported from @playwright-labs/selectors-core.
//
// Playwright serializes the engine factory via .toString() and evaluates the
// resulting string in the browser context. Closure variables from Node.js imports
// are NOT available in the browser — only the code inside the function body is
// sent. Inlining keeps the factory self-contained without any external references.

type SelectorRoot = Element | ShadowRoot | Document;

type ReactNode = {
  /** React component display name */
  name: string;
  /** First DOM element rendered by this component */
  element: Element;
  /** Component props (memoizedProps) */
  props: Record<string, any>;
  /**
   * Component state.
   * - Class components: plain state object.
   * - Function components: `{ "0": hookState0, "1": hookState1, … }` indexed by hook order.
   */
  state: any;
  /**
   * Context value.
   * - Class components: `this.context`.
   * - Function components: `null` (context hooks are not directly accessible via fibers).
   */
  context: any;
};

export const ReactEngine = () => {
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

  const SOURCES: AttributeSource[] = ["props", "state", "context"];

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
      const reactTree = this.buildReactTree(scope as Element);

      const nodes = reactTree.filter((node) => {
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

    buildReactTree(scope: Element): ReactNode[] {
      const results: ReactNode[] = [];

      function getReactFiber(el: Element): any {
        const key = Object.keys(el).find(
          (k) =>
            k.startsWith("__reactFiber$") || k.startsWith("_reactInternals"),
        );
        return key ? (el as any)[key] : null;
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

      function getFirstDomElement(fiber: any): Element | null {
        if (
          typeof fiber.type === "string" &&
          fiber.stateNode instanceof Element
        ) {
          return fiber.stateNode;
        }
        let child = fiber.child;
        while (child) {
          const found = getFirstDomElement(child);
          if (found) return found;
          child = child.sibling;
        }
        return null;
      }

      function getState(fiber: any): any {
        const ms = fiber.memoizedState;
        if (!ms) return null;

        if (
          fiber.stateNode &&
          typeof fiber.stateNode === "object" &&
          fiber.stateNode.isReactComponent
        ) {
          return ms;
        }

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
          (acc: Record<string, any>, s: any, i: number) => ({
            ...acc,
            [String(i)]: s,
          }),
          {},
        );
      }

      function getContext(fiber: any): any {
        if (
          fiber.stateNode &&
          typeof fiber.stateNode === "object" &&
          fiber.stateNode.isReactComponent
        ) {
          return fiber.stateNode.context ?? null;
        }
        return null;
      }

      function findRootFiber(): any {
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_ELEMENT);
        let el: Element | null = scope;
        while (el) {
          const fiber = getReactFiber(el);
          if (fiber) {
            let f = fiber;
            while (f.return) f = f.return;
            // f is the HostRoot fiber. React double-buffers: after a commit
            // __reactFiber$... may point to the alternate (stale) tree.
            // FiberRootNode.current always points to the current tree's root.
            const fiberRoot = f.stateNode;
            return fiberRoot && fiberRoot.current ? fiberRoot.current : f;
          }
          el = walker.nextNode() as Element | null;
        }
        return null;
      }

      const rootFiber = findRootFiber();
      if (!rootFiber) return results;

      function walk(fiber: any) {
        if (!fiber) return;

        const name = getComponentName(fiber);
        if (name) {
          const domEl = getFirstDomElement(fiber);
          if (domEl && (domEl === scope || scope.contains(domEl))) {
            results.push({
              element: domEl,
              name,
              props: fiber.memoizedProps || {},
              state: getState(fiber),
              context: getContext(fiber),
            });
          }
        }

        walk(fiber.child);
        walk(fiber.sibling);
      }

      walk(rootFiber.child);
      return results;
    },

    matchesComponentAttribute(
      node: ReactNode,
      attr: AttributeSelectorPart,
    ): boolean {
      let obj: any;
      if (attr.source === "props") obj = node.props;
      else if (attr.source === "state") obj = node.state;
      else obj = node.context;

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
