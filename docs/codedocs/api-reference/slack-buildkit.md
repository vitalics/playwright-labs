---
title: "Slack Buildkit"
description: "API reference for @playwright-labs/slack-buildkit and its React JSX runtime."
---

Source files: [`packages/slack-buildkit/src/index.ts`](/workspace/home/playwright-labs/packages/slack-buildkit/src/index.ts), [`packages/slack-buildkit/src/blocks.ts`](/workspace/home/playwright-labs/packages/slack-buildkit/src/blocks.ts), [`packages/slack-buildkit/src/elements.ts`](/workspace/home/playwright-labs/packages/slack-buildkit/src/elements.ts), [`packages/slack-buildkit/src/objects.ts`](/workspace/home/playwright-labs/packages/slack-buildkit/src/objects.ts), [`packages/slack-buildkit/src/render.ts`](/workspace/home/playwright-labs/packages/slack-buildkit/src/render.ts), [`packages/slack-buildkit/src/react/index.ts`](/workspace/home/playwright-labs/packages/slack-buildkit/src/react/index.ts).

## Import Paths

```ts
import {
  section,
  fields,
  divider,
  header,
  image,
  actions,
  context,
  input,
  markdownBlock,
  richText,
  video,
  button,
  staticSelect,
  multiStaticSelect,
  overflow,
  datepicker,
  timepicker,
  radioButtons,
  checkboxes,
  plainTextInput,
  imageElement,
  plainText,
  mrkdwn,
  text,
  option,
  optionGroup,
  confirm,
  render,
  message,
} from "@playwright-labs/slack-buildkit";

import * as SlackJsx from "@playwright-labs/slack-buildkit/react";
```

## Block Builders

```ts
section(text: string | TextObject, options?: SectionOptions): SectionBlock
fields(items: (string | TextObject)[], block_id?: string): SectionBlock
divider(block_id?: string): DividerBlock
header(text: string, block_id?: string): HeaderBlock
image(imageUrl: string, altText: string, options?: ImageBlockOptions): ImageBlock
actions(elements: BlockElement[], block_id?: string): ActionsBlock
context(elements: (string | ImageElement | TextObject)[], block_id?: string): ContextBlock
input(label: string, element: ..., options?: InputOptions): InputBlock
markdownBlock(text: string, block_id?: string): MarkdownBlock
richText(elements: ..., block_id?: string): RichTextBlock
video(title: string, videoUrl: string, thumbnailUrl: string, altText: string, options?: VideoOptions): VideoBlock
```

## Element and Object Builders

```ts
button(text: string, options?: ButtonOptions): ButtonElement
staticSelect(placeholder: string, options: OptionObject[], selectOptions?: SelectOptions): StaticSelectElement
multiStaticSelect(placeholder: string, options: OptionObject[], selectOptions?: MultiSelectOptions): MultiStaticSelectElement
overflow(options: OptionObject[], action_id?: string, confirm?: ConfirmObject): OverflowElement
datepicker(options?: DatepickerOptions): DatepickerElement
timepicker(options?: TimepickerOptions): TimepickerElement
radioButtons(options: OptionObject[], radioOptions?: RadioOptions): RadioButtonsElement
checkboxes(options: OptionObject[], checkboxOptions?: CheckboxOptions): CheckboxesElement
plainTextInput(options?: TextInputOptions): PlainTextInputElement
imageElement(imageUrl: string, altText: string): ImageElement
plainText(text: string, emoji?: boolean): PlainTextObject
mrkdwn(text: string, verbatim?: boolean): MrkdwnObject
text(value: string, type?: "plain_text" | "mrkdwn"): TextObject
option(label: string, value: string, description?: string, url?: string): OptionObject
optionGroup(label: string, options: OptionObject[]): OptionGroupObject
confirm(title: string, body: string, confirmLabel?: string, denyLabel?: string, style?: "primary" | "danger"): ConfirmObject
```

## Render Helpers and JSX Runtime

```ts
render(value: SlackBlock | SlackBlock[] | null | undefined | false): SlackBlock[]
message(blocks: Renderable, options?: Omit<SlackMessage, "blocks">): SlackMessage
```

The React subpath re-exports JSX helpers and typed components such as `Blocks`, `Section`, `Header`, `Divider`, `Actions`, `Button`, `Table`, `Tr`, `Th`, and `Td`.

## Example

```tsx
/** @jsxImportSource @playwright-labs/slack-buildkit/react */
import { Blocks, Header, Section } from "@playwright-labs/slack-buildkit/react";
import { render } from "@playwright-labs/slack-buildkit";

const blocks = render(
  <Blocks>
    <Header>Deploy complete</Header>
    <Section>*Environment:* production</Section>
  </Blocks>,
);
```
