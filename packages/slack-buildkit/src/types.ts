// ---------------------------------------------------------------------------
// Composition objects
// ---------------------------------------------------------------------------

export type PlainTextObject = {
  type: "plain_text";
  text: string;
  emoji?: boolean;
};

export type MrkdwnObject = {
  type: "mrkdwn";
  text: string;
  verbatim?: boolean;
};

export type TextObject = PlainTextObject | MrkdwnObject;

export type OptionObject = {
  text: PlainTextObject;
  value: string;
  description?: PlainTextObject;
  url?: string;
};

export type OptionGroupObject = {
  label: PlainTextObject;
  options: OptionObject[];
};

export type ConfirmObject = {
  title: PlainTextObject;
  text: TextObject;
  confirm: PlainTextObject;
  deny: PlainTextObject;
  style?: "primary" | "danger";
};

// ---------------------------------------------------------------------------
// Block elements (interactive)
// ---------------------------------------------------------------------------

export type ButtonElement = {
  type: "button";
  text: PlainTextObject;
  action_id?: string;
  url?: string;
  value?: string;
  style?: "primary" | "danger";
  confirm?: ConfirmObject;
  accessibility_label?: string;
};

export type StaticSelectElement = {
  type: "static_select";
  placeholder: PlainTextObject;
  action_id?: string;
  options: OptionObject[];
  option_groups?: OptionGroupObject[];
  initial_option?: OptionObject;
  confirm?: ConfirmObject;
  focus_on_load?: boolean;
};

export type MultiStaticSelectElement = {
  type: "multi_static_select";
  placeholder: PlainTextObject;
  action_id?: string;
  options: OptionObject[];
  option_groups?: OptionGroupObject[];
  initial_options?: OptionObject[];
  confirm?: ConfirmObject;
  max_selected_items?: number;
  focus_on_load?: boolean;
};

export type OverflowElement = {
  type: "overflow";
  action_id?: string;
  options: OptionObject[];
  confirm?: ConfirmObject;
};

export type DatepickerElement = {
  type: "datepicker";
  action_id?: string;
  placeholder?: PlainTextObject;
  initial_date?: string;
  confirm?: ConfirmObject;
  focus_on_load?: boolean;
};

export type TimepickerElement = {
  type: "timepicker";
  action_id?: string;
  placeholder?: PlainTextObject;
  initial_time?: string;
  confirm?: ConfirmObject;
  focus_on_load?: boolean;
  timezone?: string;
};

export type RadioButtonsElement = {
  type: "radio_buttons";
  action_id?: string;
  options: OptionObject[];
  initial_option?: OptionObject;
  confirm?: ConfirmObject;
  focus_on_load?: boolean;
};

export type CheckboxesElement = {
  type: "checkboxes";
  action_id?: string;
  options: OptionObject[];
  initial_options?: OptionObject[];
  confirm?: ConfirmObject;
  focus_on_load?: boolean;
};

export type PlainTextInputElement = {
  type: "plain_text_input";
  action_id?: string;
  placeholder?: PlainTextObject;
  initial_value?: string;
  multiline?: boolean;
  min_length?: number;
  max_length?: number;
  dispatch_action_config?: {
    trigger_actions_on?: ("on_enter_pressed" | "on_character_entered")[];
  };
  focus_on_load?: boolean;
};

export type ImageElement = {
  type: "image";
  image_url: string;
  alt_text: string;
};

export type BlockElement =
  | ButtonElement
  | StaticSelectElement
  | MultiStaticSelectElement
  | OverflowElement
  | DatepickerElement
  | TimepickerElement
  | RadioButtonsElement
  | CheckboxesElement
  | PlainTextInputElement
  | ImageElement;

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

export type SectionBlock = {
  type: "section";
  block_id?: string;
  text?: TextObject;
  fields?: TextObject[];
  accessory?: BlockElement;
};

export type DividerBlock = {
  type: "divider";
  block_id?: string;
};

export type HeaderBlock = {
  type: "header";
  block_id?: string;
  text: PlainTextObject;
};

export type ImageBlock = {
  type: "image";
  block_id?: string;
  image_url: string;
  alt_text: string;
  title?: PlainTextObject;
  slack_file?: { id?: string; url?: string };
};

export type ActionsBlock = {
  type: "actions";
  block_id?: string;
  elements: BlockElement[];
};

export type ContextBlock = {
  type: "context";
  block_id?: string;
  elements: (ImageElement | TextObject)[];
};

export type InputBlock = {
  type: "input";
  block_id?: string;
  label: PlainTextObject;
  element:
    | PlainTextInputElement
    | StaticSelectElement
    | MultiStaticSelectElement
    | DatepickerElement
    | TimepickerElement
    | RadioButtonsElement
    | CheckboxesElement;
  dispatch_action?: boolean;
  hint?: PlainTextObject;
  optional?: boolean;
};

export type RichTextSection = {
  type: "rich_text_section";
  elements: RichTextElement[];
};

export type RichTextList = {
  type: "rich_text_list";
  style: "bullet" | "ordered";
  elements: RichTextSection[];
  indent?: number;
  offset?: number;
  border?: number;
};

export type RichTextPreformatted = {
  type: "rich_text_preformatted";
  elements: RichTextElement[];
  border?: number;
};

export type RichTextQuote = {
  type: "rich_text_quote";
  elements: RichTextElement[];
  border?: number;
};

export type RichTextElement = {
  type: "text" | "channel" | "user" | "usergroup" | "broadcast" | "emoji" | "link";
  text?: string;
  name?: string;
  channel_id?: string;
  user_id?: string;
  usergroup_id?: string;
  range?: string;
  url?: string;
  style?: {
    bold?: boolean;
    italic?: boolean;
    strike?: boolean;
    code?: boolean;
  };
};

export type RichTextBlock = {
  type: "rich_text";
  block_id?: string;
  elements: (RichTextSection | RichTextList | RichTextPreformatted | RichTextQuote)[];
};

export type MarkdownBlock = {
  type: "markdown";
  block_id?: string;
  text: string;
};

export type VideoBlock = {
  type: "video";
  block_id?: string;
  alt_text: string;
  author_name?: string;
  description?: PlainTextObject;
  provider_icon_url?: string;
  provider_name?: string;
  thumbnail_url: string;
  title: PlainTextObject;
  title_url?: string;
  video_url: string;
};

export type SlackBlock =
  | SectionBlock
  | DividerBlock
  | HeaderBlock
  | ImageBlock
  | ActionsBlock
  | ContextBlock
  | InputBlock
  | RichTextBlock
  | MarkdownBlock
  | VideoBlock;

// ---------------------------------------------------------------------------
// Message payload
// ---------------------------------------------------------------------------

export type SlackMessage = {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  thread_ts?: string;
  mrkdwn?: boolean;
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
};

export type SlackAttachment = {
  color?: string;
  blocks?: SlackBlock[];
  fallback?: string;
};
