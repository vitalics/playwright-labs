/// <reference lib="dom" />

import {
  AttributeSelector,
  AttributeSelectorOperator,
  AttributeSelectorPart,
} from "./types";

type SelectorRoot = Element | ShadowRoot | Document;

type AngularNode = {
  /** angular component class name */
  name: string | null;
  /** properties */
  properties: AngularComponent;
  /** HTML native element. this component is mounted in DOM */
  nativeElement: Element;
  parent: AngularComponent | null;
  parentNativeElement: Element | null;
  directives: any[];
};

type AngularComponent = Record<string, any> & { __ngContext__?: any };

export const AngularEngine = () => ({
  queryAll(scope: SelectorRoot, selector: string): Element[] {
    const { name, attributes } = this.parseAttributeSelector(selector, false);
    // get all angular components for selected scope
    const angularTree = this.buildComponentsAngularTree(scope);
    const nodes = angularTree.filter((tree) => {
      if (name && tree.name !== name) return false;
      for (const attr of attributes) {
        if (!this.matchesComponentAttribute(tree.properties, attr))
          return false;
      }
      return true;
    });

    const allRootElements: Set<Element> = new Set();
    for (const treeNode of nodes) allRootElements.add(treeNode.nativeElement);

    return [...allRootElements];
  },
  parseAttributeSelector(
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
      // https://www.w3.org/TR/css-syntax-3/#ident-token-diagram
      return (
        char >= "\u0080" || // non-ascii
        (char >= "\u0030" && char <= "\u0039") || // digit
        (char >= "\u0041" && char <= "\u005a") || // uppercase letter
        (char >= "\u0061" && char <= "\u007a") || // lowercase letter
        char === "\u005f" || // "_"
        char === "\u002d"
      ); // "-"
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
      // https://262.ecma-international.org/11.0/#sec-literals-regular-expression-literals
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
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
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

    function readOperator(): AttributeSelectorOperator {
      skipSpaces();
      let op = "";
      if (!EOL) op += eat1();
      if (!EOL && op !== "=") op += eat1();
      if (!["=", "*=", "^=", "$=", "|=", "~="].includes(op))
        syntaxError("parsing operator");
      return op as AttributeSelectorOperator;
    }

    function readAttribute(): AttributeSelectorPart {
      // skip leading [
      eat1();

      // read attribute name:
      // foo.bar
      // 'foo'  . "ba zz"
      const jsonPath = [];
      jsonPath.push(readAttributeToken());
      skipSpaces();
      while (next() === ".") {
        eat1();
        jsonPath.push(readAttributeToken());
        skipSpaces();
      }
      // check property is truthy: [enabled]
      if (next() === "]") {
        eat1();
        return {
          name: jsonPath.join("."),
          jsonPath,
          op: "<truthy>",
          value: null,
          caseSensitive: false,
        };
      }

      const operator = readOperator();

      let value = undefined;
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
      };
    }

    const result: AttributeSelector = {
      name: "",
      attributes: [],
    };
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
  },
  buildComponentsAngularTree(
    root: Document | ShadowRoot | Element,
    roots: any[] = [],
  ): AngularNode[] {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    do {
      const node = walker.currentNode as Element;

      // angular provides global urils for dev mode
      // see https://github.com/angular/angular/blob/e1454aeb7b617ff1b273a65db71fd23115ff5175/packages/core/src/render3/util/discovery_utils.ts#L57
      if ((window as any).ng) {
        // who render current node
        try {
          const currentComponent: AngularComponent | null = (
            window as any
          ).ng.getComponent(node);
          const parentComponent: AngularComponent | null = (
            window as any
          ).ng.getOwningComponent(node);

          const parentNativeElement: Element = parentComponent
            ? (window as any).ng.getHostElement(parentComponent)
            : (window as any).ng.getHostElement(node);
          roots.push({
            directives: (window as any).ng.getDirectives(node),
            name: node.tagName.toLowerCase(),
            nativeElement: node,
            properties: currentComponent! || parentComponent!,
            parent: parentComponent,
            parentNativeElement,
          });
        } catch {
          // document.body is not a angular application, goto next node
          continue;
        }
      }

      const shadowRoot = node instanceof Element ? node.shadowRoot : null;
      if (shadowRoot) this.buildComponentsAngularTree(shadowRoot, roots);
    } while (walker.nextNode());
    return roots;
  },
  matchesComponentAttribute(obj: any, attr: AttributeSelectorPart) {
    for (const token of attr.jsonPath) {
      if (obj !== undefined && obj !== null) obj = obj[token];
    }
    return this.matchesAttributePart(obj, attr);
  },
  matchesAttributePart(value: any, attr: AttributeSelectorPart) {
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
  },
});
