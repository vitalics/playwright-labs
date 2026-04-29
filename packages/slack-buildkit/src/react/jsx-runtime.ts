import type { SlackBlock } from "../types.js";

type SlackChild = SlackBlock | SlackBlock[] | string | number | null | undefined | false;

export type SlackJsxNode = SlackBlock | SlackBlock[] | null;

function normalizeChildren(children: SlackChild | SlackChild[]): SlackBlock[] {
  const flat = Array.isArray(children) ? children.flat(Infinity as 1) : [children];
  return flat.filter((c): c is SlackBlock => !!c && typeof c === "object") as SlackBlock[];
}

export function jsx(
  type: string | ((props: Record<string, unknown>) => SlackJsxNode),
  props: Record<string, unknown> & { children?: SlackChild | SlackChild[]; key?: string },
): SlackJsxNode {
  if (typeof type === "function") {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { key: _key, ...rest } = props;
    return type(rest);
  }
  return null;
}

export function jsxs(
  type: string | ((props: Record<string, unknown>) => SlackJsxNode),
  props: Record<string, unknown> & { children?: SlackChild | SlackChild[]; key?: string },
): SlackJsxNode {
  return jsx(type, props);
}

export function jsxDEV(
  type: string | ((props: Record<string, unknown>) => SlackJsxNode),
  props: Record<string, unknown> & { children?: SlackChild | SlackChild[]; key?: string },
): SlackJsxNode {
  return jsx(type, props);
}

export function Fragment({
  children,
}: {
  children?: SlackChild | SlackChild[];
}): SlackBlock[] {
  return normalizeChildren(children ?? []);
}

export { normalizeChildren };
