import { mrkdwn, plainText } from "./objects.js";
import type {
  ActionsBlock,
  BlockElement,
  ContextBlock,
  DividerBlock,
  HeaderBlock,
  ImageBlock,
  ImageElement,
  InputBlock,
  MarkdownBlock,
  PlainTextInputElement,
  CheckboxesElement,
  MultiStaticSelectElement,
  RadioButtonsElement,
  StaticSelectElement,
  DatepickerElement,
  TimepickerElement,
  RichTextBlock,
  RichTextList,
  RichTextPreformatted,
  RichTextQuote,
  RichTextSection,
  SectionBlock,
  TextObject,
  VideoBlock,
} from "./types.js";

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export type SectionOptions = {
  block_id?: string;
  fields?: (string | TextObject)[];
  accessory?: BlockElement;
};

export function section(
  text: string | TextObject,
  options: SectionOptions = {},
): SectionBlock {
  const textObj: TextObject =
    typeof text === "string" ? mrkdwn(text) : text;

  const block: SectionBlock = { type: "section", text: textObj };
  if (options.block_id) block.block_id = options.block_id;
  if (options.accessory) block.accessory = options.accessory;
  if (options.fields) {
    block.fields = options.fields.map((f) =>
      typeof f === "string" ? mrkdwn(f) : f,
    );
  }
  return block;
}

export function fields(
  items: (string | TextObject)[],
  block_id?: string,
): SectionBlock {
  const block: SectionBlock = {
    type: "section",
    fields: items.map((f) => (typeof f === "string" ? mrkdwn(f) : f)),
  };
  if (block_id) block.block_id = block_id;
  return block;
}

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------

export function divider(block_id?: string): DividerBlock {
  const block: DividerBlock = { type: "divider" };
  if (block_id) block.block_id = block_id;
  return block;
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function header(text: string, block_id?: string): HeaderBlock {
  const block: HeaderBlock = { type: "header", text: plainText(text) };
  if (block_id) block.block_id = block_id;
  return block;
}

// ---------------------------------------------------------------------------
// Image block
// ---------------------------------------------------------------------------

export type ImageBlockOptions = {
  block_id?: string;
  title?: string;
};

export function image(
  imageUrl: string,
  altText: string,
  options: ImageBlockOptions = {},
): ImageBlock {
  const block: ImageBlock = {
    type: "image",
    image_url: imageUrl,
    alt_text: altText,
  };
  if (options.block_id) block.block_id = options.block_id;
  if (options.title) block.title = plainText(options.title);
  return block;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function actions(elements: BlockElement[], block_id?: string): ActionsBlock {
  const block: ActionsBlock = { type: "actions", elements };
  if (block_id) block.block_id = block_id;
  return block;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export function context(
  elements: (string | ImageElement | TextObject)[],
  block_id?: string,
): ContextBlock {
  const mapped = elements.map((el): ImageElement | TextObject => {
    if (typeof el === "string") return mrkdwn(el);
    return el;
  });
  const block: ContextBlock = { type: "context", elements: mapped };
  if (block_id) block.block_id = block_id;
  return block;
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export type InputOptions = {
  block_id?: string;
  dispatch_action?: boolean;
  hint?: string;
  optional?: boolean;
};

export function input(
  label: string,
  element:
    | PlainTextInputElement
    | StaticSelectElement
    | MultiStaticSelectElement
    | DatepickerElement
    | TimepickerElement
    | RadioButtonsElement
    | CheckboxesElement,
  options: InputOptions = {},
): InputBlock {
  const block: InputBlock = {
    type: "input",
    label: plainText(label),
    element,
  };
  if (options.block_id) block.block_id = options.block_id;
  if (options.dispatch_action !== undefined) block.dispatch_action = options.dispatch_action;
  if (options.hint) block.hint = plainText(options.hint);
  if (options.optional !== undefined) block.optional = options.optional;
  return block;
}

// ---------------------------------------------------------------------------
// Markdown block (full GFM markdown, supports tables)
// ---------------------------------------------------------------------------

export function markdownBlock(text: string, block_id?: string): MarkdownBlock {
  const block: MarkdownBlock = { type: "markdown", text };
  if (block_id) block.block_id = block_id;
  return block;
}

// ---------------------------------------------------------------------------
// Rich text
// ---------------------------------------------------------------------------

export function richText(
  elements: (RichTextSection | RichTextList | RichTextPreformatted | RichTextQuote)[],
  block_id?: string,
): RichTextBlock {
  const block: RichTextBlock = { type: "rich_text", elements };
  if (block_id) block.block_id = block_id;
  return block;
}

// ---------------------------------------------------------------------------
// Video
// ---------------------------------------------------------------------------

export type VideoOptions = {
  block_id?: string;
  author_name?: string;
  description?: string;
  provider_icon_url?: string;
  provider_name?: string;
  title_url?: string;
};

export function video(
  title: string,
  videoUrl: string,
  thumbnailUrl: string,
  altText: string,
  options: VideoOptions = {},
): VideoBlock {
  const block: VideoBlock = {
    type: "video",
    title: plainText(title),
    video_url: videoUrl,
    thumbnail_url: thumbnailUrl,
    alt_text: altText,
  };
  if (options.block_id) block.block_id = options.block_id;
  if (options.author_name) block.author_name = options.author_name;
  if (options.description) block.description = plainText(options.description);
  if (options.provider_icon_url) block.provider_icon_url = options.provider_icon_url;
  if (options.provider_name) block.provider_name = options.provider_name;
  if (options.title_url) block.title_url = options.title_url;
  return block;
}
