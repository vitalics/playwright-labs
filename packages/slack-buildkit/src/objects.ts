import type {
  ConfirmObject,
  MrkdwnObject,
  OptionGroupObject,
  OptionObject,
  PlainTextObject,
  TextObject,
} from "./types.js";

export function plainText(text: string, emoji = true): PlainTextObject {
  return { type: "plain_text", text, emoji };
}

export function mrkdwn(text: string, verbatim?: boolean): MrkdwnObject {
  return verbatim !== undefined
    ? { type: "mrkdwn", text, verbatim }
    : { type: "mrkdwn", text };
}

export function text(value: string, type: "plain_text" | "mrkdwn" = "mrkdwn"): TextObject {
  return type === "plain_text" ? plainText(value) : mrkdwn(value);
}

export function option(
  label: string,
  value: string,
  description?: string,
  url?: string,
): OptionObject {
  const obj: OptionObject = { text: plainText(label), value };
  if (description) obj.description = plainText(description);
  if (url) obj.url = url;
  return obj;
}

export function optionGroup(label: string, options: OptionObject[]): OptionGroupObject {
  return { label: plainText(label), options };
}

export function confirm(
  title: string,
  body: string,
  confirmLabel = "Confirm",
  denyLabel = "Cancel",
  style?: "primary" | "danger",
): ConfirmObject {
  const obj: ConfirmObject = {
    title: plainText(title),
    text: mrkdwn(body),
    confirm: plainText(confirmLabel),
    deny: plainText(denyLabel),
  };
  if (style) obj.style = style;
  return obj;
}
