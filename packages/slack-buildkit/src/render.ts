import type { SlackBlock, SlackMessage } from "./types.js";

type Renderable = SlackBlock | SlackBlock[] | null | undefined | false;

function flattenBlocks(value: Renderable): SlackBlock[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flat(Infinity as 1) as SlackBlock[];
  return [value];
}

/**
 * Collects blocks from a JSX tree (or plain block array) into a flat SlackBlock[].
 *
 * @example
 * // plain builders
 * const blocks = render([header("Results"), divider()]);
 *
 * @example
 * // JSX (with jsxImportSource: "@playwright-labs/slack-buildkit/react")
 * const blocks = render(<Report passed={10} failed={2} />);
 */
export function render(value: Renderable): SlackBlock[] {
  return flattenBlocks(value);
}

/**
 * Wraps a flat block array into a full Slack message payload.
 */
export function message(
  blocks: Renderable,
  options: Omit<SlackMessage, "blocks"> = {},
): SlackMessage {
  return { ...options, blocks: render(blocks) };
}
