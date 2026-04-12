/// <reference lib="dom" />

import {
  matchesAttributePart,
  parseAttributeSelector,
} from "@playwright-labs/selectors-core";
import { AttributeSelectorPart } from "./types";

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
    const { name, attributes } = parseAttributeSelector(selector, false);
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
  buildComponentsAngularTree(
    root: Document | ShadowRoot | Element,
    roots: any[] = [],
  ): AngularNode[] {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    do {
      const node = walker.currentNode as Element;

      // angular provides global utils for dev mode
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
    return matchesAttributePart(obj, attr);
  },
});
