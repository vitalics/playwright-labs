import { plainText } from "./objects.js";
import type {
  ButtonElement,
  CheckboxesElement,
  ConfirmObject,
  DatepickerElement,
  ImageElement,
  MultiStaticSelectElement,
  OptionObject,
  OverflowElement,
  PlainTextInputElement,
  RadioButtonsElement,
  StaticSelectElement,
  TimepickerElement,
} from "./types.js";

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

export type ButtonOptions = {
  action_id?: string;
  value?: string;
  url?: string;
  style?: "primary" | "danger";
  confirm?: ConfirmObject;
  accessibility_label?: string;
};

export function button(text: string, options: ButtonOptions = {}): ButtonElement {
  const el: ButtonElement = { type: "button", text: plainText(text) };
  if (options.action_id) el.action_id = options.action_id;
  if (options.value) el.value = options.value;
  if (options.url) el.url = options.url;
  if (options.style) el.style = options.style;
  if (options.confirm) el.confirm = options.confirm;
  if (options.accessibility_label) el.accessibility_label = options.accessibility_label;
  return el;
}

// ---------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------

export type SelectOptions = {
  action_id?: string;
  initial_option?: OptionObject;
  confirm?: ConfirmObject;
  focus_on_load?: boolean;
};

export function staticSelect(
  placeholder: string,
  options: OptionObject[],
  selectOptions: SelectOptions = {},
): StaticSelectElement {
  const el: StaticSelectElement = {
    type: "static_select",
    placeholder: plainText(placeholder),
    options,
  };
  if (selectOptions.action_id) el.action_id = selectOptions.action_id;
  if (selectOptions.initial_option) el.initial_option = selectOptions.initial_option;
  if (selectOptions.confirm) el.confirm = selectOptions.confirm;
  if (selectOptions.focus_on_load !== undefined) el.focus_on_load = selectOptions.focus_on_load;
  return el;
}

export type MultiSelectOptions = {
  action_id?: string;
  initial_options?: OptionObject[];
  confirm?: ConfirmObject;
  max_selected_items?: number;
  focus_on_load?: boolean;
};

export function multiStaticSelect(
  placeholder: string,
  options: OptionObject[],
  selectOptions: MultiSelectOptions = {},
): MultiStaticSelectElement {
  const el: MultiStaticSelectElement = {
    type: "multi_static_select",
    placeholder: plainText(placeholder),
    options,
  };
  if (selectOptions.action_id) el.action_id = selectOptions.action_id;
  if (selectOptions.initial_options) el.initial_options = selectOptions.initial_options;
  if (selectOptions.confirm) el.confirm = selectOptions.confirm;
  if (selectOptions.max_selected_items !== undefined)
    el.max_selected_items = selectOptions.max_selected_items;
  if (selectOptions.focus_on_load !== undefined) el.focus_on_load = selectOptions.focus_on_load;
  return el;
}

// ---------------------------------------------------------------------------
// Overflow
// ---------------------------------------------------------------------------

export function overflow(
  options: OptionObject[],
  action_id?: string,
  confirm?: ConfirmObject,
): OverflowElement {
  const el: OverflowElement = { type: "overflow", options };
  if (action_id) el.action_id = action_id;
  if (confirm) el.confirm = confirm;
  return el;
}

// ---------------------------------------------------------------------------
// Datepicker / Timepicker
// ---------------------------------------------------------------------------

export type DatepickerOptions = {
  action_id?: string;
  placeholder?: string;
  initial_date?: string;
  confirm?: ConfirmObject;
  focus_on_load?: boolean;
};

export function datepicker(options: DatepickerOptions = {}): DatepickerElement {
  const el: DatepickerElement = { type: "datepicker" };
  if (options.action_id) el.action_id = options.action_id;
  if (options.placeholder) el.placeholder = plainText(options.placeholder);
  if (options.initial_date) el.initial_date = options.initial_date;
  if (options.confirm) el.confirm = options.confirm;
  if (options.focus_on_load !== undefined) el.focus_on_load = options.focus_on_load;
  return el;
}

export type TimepickerOptions = {
  action_id?: string;
  placeholder?: string;
  initial_time?: string;
  confirm?: ConfirmObject;
  focus_on_load?: boolean;
  timezone?: string;
};

export function timepicker(options: TimepickerOptions = {}): TimepickerElement {
  const el: TimepickerElement = { type: "timepicker" };
  if (options.action_id) el.action_id = options.action_id;
  if (options.placeholder) el.placeholder = plainText(options.placeholder);
  if (options.initial_time) el.initial_time = options.initial_time;
  if (options.confirm) el.confirm = options.confirm;
  if (options.focus_on_load !== undefined) el.focus_on_load = options.focus_on_load;
  if (options.timezone) el.timezone = options.timezone;
  return el;
}

// ---------------------------------------------------------------------------
// Radio buttons / Checkboxes
// ---------------------------------------------------------------------------

export type RadioOptions = {
  action_id?: string;
  initial_option?: OptionObject;
  confirm?: ConfirmObject;
  focus_on_load?: boolean;
};

export function radioButtons(
  options: OptionObject[],
  radioOptions: RadioOptions = {},
): RadioButtonsElement {
  const el: RadioButtonsElement = { type: "radio_buttons", options };
  if (radioOptions.action_id) el.action_id = radioOptions.action_id;
  if (radioOptions.initial_option) el.initial_option = radioOptions.initial_option;
  if (radioOptions.confirm) el.confirm = radioOptions.confirm;
  if (radioOptions.focus_on_load !== undefined) el.focus_on_load = radioOptions.focus_on_load;
  return el;
}

export type CheckboxOptions = {
  action_id?: string;
  initial_options?: OptionObject[];
  confirm?: ConfirmObject;
  focus_on_load?: boolean;
};

export function checkboxes(
  options: OptionObject[],
  checkboxOptions: CheckboxOptions = {},
): CheckboxesElement {
  const el: CheckboxesElement = { type: "checkboxes", options };
  if (checkboxOptions.action_id) el.action_id = checkboxOptions.action_id;
  if (checkboxOptions.initial_options) el.initial_options = checkboxOptions.initial_options;
  if (checkboxOptions.confirm) el.confirm = checkboxOptions.confirm;
  if (checkboxOptions.focus_on_load !== undefined)
    el.focus_on_load = checkboxOptions.focus_on_load;
  return el;
}

// ---------------------------------------------------------------------------
// Plain text input
// ---------------------------------------------------------------------------

export type TextInputOptions = {
  action_id?: string;
  placeholder?: string;
  initial_value?: string;
  multiline?: boolean;
  min_length?: number;
  max_length?: number;
  focus_on_load?: boolean;
};

export function plainTextInput(options: TextInputOptions = {}): PlainTextInputElement {
  const el: PlainTextInputElement = { type: "plain_text_input" };
  if (options.action_id) el.action_id = options.action_id;
  if (options.placeholder) el.placeholder = plainText(options.placeholder);
  if (options.initial_value) el.initial_value = options.initial_value;
  if (options.multiline !== undefined) el.multiline = options.multiline;
  if (options.min_length !== undefined) el.min_length = options.min_length;
  if (options.max_length !== undefined) el.max_length = options.max_length;
  if (options.focus_on_load !== undefined) el.focus_on_load = options.focus_on_load;
  return el;
}

// ---------------------------------------------------------------------------
// Image element
// ---------------------------------------------------------------------------

export function imageElement(imageUrl: string, altText: string): ImageElement {
  return { type: "image", image_url: imageUrl, alt_text: altText };
}
