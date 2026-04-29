/** @jsxImportSource @playwright-labs/slack-buildkit/react */
import { actions, context, divider, header, image, input, markdownBlock, section } from "../blocks.js";
import { button, checkboxes, datepicker, imageElement, multiStaticSelect, overflow, plainTextInput, radioButtons, staticSelect, timepicker } from "../elements.js";
import { mrkdwn, plainText } from "../objects.js";
import type {
  ActionsBlock,
  BlockElement,
  CheckboxesElement,
  ConfirmObject,
  ContextBlock,
  DatepickerElement,
  DividerBlock,
  HeaderBlock,
  ImageBlock,
  InputBlock,
  MarkdownBlock,
  MultiStaticSelectElement,
  OptionObject,
  PlainTextInputElement,
  RadioButtonsElement,
  SlackBlock,
  StaticSelectElement,
  TextObject,
  TimepickerElement,
} from "../types.js";
import { normalizeChildren, type SlackJsxNode } from "./jsx-runtime.js";

type SlackChild = SlackBlock | SlackBlock[] | string | null | undefined | false;

// ---------------------------------------------------------------------------
// Blocks container
// ---------------------------------------------------------------------------

/** Collect all child blocks into a flat array. Use as the root wrapper. */
export function Blocks({ children }: { children?: SlackChild | SlackChild[] }): SlackBlock[] {
  return normalizeChildren(children as Parameters<typeof normalizeChildren>[0]);
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export type SectionProps = {
  children?: string | TextObject;
  fields?: (string | TextObject)[];
  accessory?: BlockElement;
  block_id?: string;
};

export function Section({ children, fields: fieldsProp, accessory, block_id }: SectionProps): SlackBlock {
  const textVal = children ?? "";
  const textObj: TextObject = typeof textVal === "string" ? mrkdwn(textVal) : textVal;
  return section(textObj, { fields: fieldsProp, accessory, block_id });
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export type HeaderProps = {
  children: string;
  block_id?: string;
};

export function Header({ children, block_id }: HeaderProps): HeaderBlock {
  return header(children, block_id);
}

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------

export function Divider({ block_id }: { block_id?: string }): DividerBlock {
  return divider(block_id);
}

// ---------------------------------------------------------------------------
// Image block
// ---------------------------------------------------------------------------

export type ImageBlockProps = {
  src: string;
  alt: string;
  title?: string;
  block_id?: string;
};

export function Image({ src, alt, title, block_id }: ImageBlockProps): ImageBlock {
  return image(src, alt, { title, block_id });
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type ActionsProps = {
  children: SlackJsxNode | SlackJsxNode[];
  block_id?: string;
};

export function Actions({ children, block_id }: ActionsProps): ActionsBlock {
  const elements = normalizeChildren(children as Parameters<typeof normalizeChildren>[0]) as BlockElement[];
  return actions(elements, block_id);
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export type ContextProps = {
  children: SlackChild | SlackChild[];
  block_id?: string;
};

export function Context({ children, block_id }: ContextProps): ContextBlock {
  const raw = Array.isArray(children) ? children.flat(Infinity as 1) : [children];
  const mapped = raw
    .filter((c): c is SlackBlock | string => !!c && (typeof c === "object" || typeof c === "string"))
    .map((c) => (typeof c === "string" ? mrkdwn(c) : c));
  return context(mapped as Parameters<typeof context>[0], block_id);
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export type InputProps = {
  label: string;
  children:
    | PlainTextInputElement
    | StaticSelectElement
    | MultiStaticSelectElement
    | DatepickerElement
    | TimepickerElement
    | RadioButtonsElement
    | CheckboxesElement;
  hint?: string;
  optional?: boolean;
  dispatch_action?: boolean;
  block_id?: string;
};

export function Input({ label, children, hint, optional, dispatch_action, block_id }: InputProps): InputBlock {
  return input(label, children, { hint, optional, dispatch_action, block_id });
}

// ---------------------------------------------------------------------------
// Interactive elements (used inside Actions / Input)
// ---------------------------------------------------------------------------

export type ButtonProps = {
  children: string;
  action_id?: string;
  value?: string;
  url?: string;
  style?: "primary" | "danger";
  confirm?: ConfirmObject;
  accessibility_label?: string;
};

export function Button({ children, ...opts }: ButtonProps): BlockElement {
  return button(children, opts);
}

export type StaticSelectProps = {
  placeholder: string;
  options: OptionObject[];
  action_id?: string;
  initial_option?: OptionObject;
  confirm?: ConfirmObject;
  focus_on_load?: boolean;
};

export function StaticSelect({ placeholder, options, ...opts }: StaticSelectProps): StaticSelectElement {
  return staticSelect(placeholder, options, opts);
}

export type MultiStaticSelectProps = {
  placeholder: string;
  options: OptionObject[];
  action_id?: string;
  initial_options?: OptionObject[];
  max_selected_items?: number;
  confirm?: ConfirmObject;
  focus_on_load?: boolean;
};

export function MultiStaticSelect({ placeholder, options, ...opts }: MultiStaticSelectProps): MultiStaticSelectElement {
  return multiStaticSelect(placeholder, options, opts);
}

export type OverflowProps = {
  options: OptionObject[];
  action_id?: string;
  confirm?: ConfirmObject;
};

export function Overflow({ options, action_id, confirm }: OverflowProps) {
  return overflow(options, action_id, confirm);
}

export type DatepickerProps = {
  action_id?: string;
  placeholder?: string;
  initial_date?: string;
  confirm?: ConfirmObject;
  focus_on_load?: boolean;
};

export function Datepicker(props: DatepickerProps): DatepickerElement {
  return datepicker(props);
}

export type TimepickerProps = {
  action_id?: string;
  placeholder?: string;
  initial_time?: string;
  confirm?: ConfirmObject;
  focus_on_load?: boolean;
  timezone?: string;
};

export function Timepicker(props: TimepickerProps): TimepickerElement {
  return timepicker(props);
}

export type RadioButtonsProps = {
  options: OptionObject[];
  action_id?: string;
  initial_option?: OptionObject;
  confirm?: ConfirmObject;
  focus_on_load?: boolean;
};

export function RadioButtons({ options, ...opts }: RadioButtonsProps): RadioButtonsElement {
  return radioButtons(options, opts);
}

export type CheckboxesProps = {
  options: OptionObject[];
  action_id?: string;
  initial_options?: OptionObject[];
  confirm?: ConfirmObject;
  focus_on_load?: boolean;
};

export function Checkboxes({ options, ...opts }: CheckboxesProps): CheckboxesElement {
  return checkboxes(options, opts);
}

export type PlainTextInputProps = {
  action_id?: string;
  placeholder?: string;
  initial_value?: string;
  multiline?: boolean;
  min_length?: number;
  max_length?: number;
  focus_on_load?: boolean;
};

export function PlainTextInput(props: PlainTextInputProps): PlainTextInputElement {
  return plainTextInput(props);
}

export type ImageElementProps = {
  src: string;
  alt: string;
};

export function ImageEl({ src, alt }: ImageElementProps) {
  return imageElement(src, alt);
}

// ---------------------------------------------------------------------------
// Markdown block (GFM — supports tables, bold, strikethrough, links, etc.)
// ---------------------------------------------------------------------------

export function Markdown({ children, block_id }: { children: string; block_id?: string }): MarkdownBlock {
  return markdownBlock(children, block_id);
}

// ---------------------------------------------------------------------------
// Table — HTML-like API that renders to a GFM markdown block
// ---------------------------------------------------------------------------

/** @internal Intermediate node — not a SlackBlock */
export type TableCellNode = { __skTableCell: true; tag: "th" | "td"; content: string };
/** @internal Intermediate node — not a SlackBlock */
export type TableRowNode = { __skTableRow: true; cells: TableCellNode[] };

function flattenToCells(children: unknown): TableCellNode[] {
  const raw = Array.isArray(children) ? children : [children];
  return (raw as unknown[])
    .flat(Infinity as 1)
    .filter((c): c is TableCellNode => Boolean(c && (c as TableCellNode).__skTableCell));
}

function flattenToRows(children: unknown): TableRowNode[] {
  const raw = Array.isArray(children) ? children : [children];
  return (raw as unknown[])
    .flat(Infinity as 1)
    .filter((r): r is TableRowNode => Boolean(r && (r as TableRowNode).__skTableRow));
}

export function Th({ children }: { children: string }): TableCellNode {
  return { __skTableCell: true, tag: "th", content: children };
}

export function Td({ children }: { children: string }): TableCellNode {
  return { __skTableCell: true, tag: "td", content: children };
}

export function Tr({ children }: { children: unknown }): TableRowNode {
  return { __skTableRow: true, cells: flattenToCells(children) };
}

/**
 * Renders an HTML-like table as a Slack markdown block.
 * Use `<Th>` in header rows and `<Td>` in data rows.
 *
 * @example
 * ```tsx
 * <Table>
 *   <Tr><Th>Name</Th><Th>Status</Th></Tr>
 *   <Tr><Td>`login`</Td><Td>passed</Td></Tr>
 * </Table>
 * ```
 */
export function Table({ children, block_id }: { children: unknown; block_id?: string }): MarkdownBlock {
  const rows = flattenToRows(children);
  const lines: string[] = [];
  let separatorAdded = false;
  for (const row of rows) {
    lines.push(`| ${row.cells.map((c) => c.content).join(" | ")} |`);
    if (!separatorAdded && row.cells.some((c) => c.tag === "th")) {
      lines.push(`| ${row.cells.map(() => "---").join(" | ")} |`);
      separatorAdded = true;
    }
  }
  return markdownBlock(lines.join("\n"), block_id);
}

// ---------------------------------------------------------------------------
// Text helpers (inline use in Section/Context children)
// ---------------------------------------------------------------------------

export function Mrkdwn({ children, verbatim }: { children: string; verbatim?: boolean }) {
  return mrkdwn(children, verbatim);
}

export function PlainText({ children, emoji }: { children: string; emoji?: boolean }) {
  return plainText(children, emoji);
}
