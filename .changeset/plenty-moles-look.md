---
"@playwright-labs/slack-buildkit": major
---

First release of `@playwright-labs/slack-buildkit`.

A framework-agnostic Slack Block Kit builder with a custom React JSX runtime. Write Slack messages as JSX components — no virtual DOM, no browser, just Block Kit JSON.

**Core builders** (`import ... from "@playwright-labs/slack-buildkit"`):
- Full TypeScript types for every Block Kit block, element, and composition object (`SectionBlock`, `ActionsBlock`, `MarkdownBlock`, `ButtonElement`, `StaticSelectElement`, and more)
- Builder functions: `section()`, `header()`, `divider()`, `actions()`, `context()`, `input()`, `markdownBlock()`, `richText()`, `video()`, and all element/object helpers
- `render(blocks)` — normalises a JSX tree or raw block array into a flat `SlackBlock[]`
- `message(blocks, options)` — wraps blocks in a `SlackMessage` payload ready to POST

**React JSX runtime** (`import ... from "@playwright-labs/slack-buildkit/react"`):
- `jsxImportSource` pragma support — set `"jsxImportSource": "@playwright-labs/slack-buildkit/react"` in `tsconfig.json` and write Block Kit as TSX
- Components: `<Blocks>`, `<Header>`, `<Section>`, `<Divider>`, `<Actions>`, `<Context>`, `<Input>`, `<Button>`, `<StaticSelect>`, `<MultiStaticSelect>`, `<RadioButtons>`, `<Checkboxes>`, `<PlainTextInput>`, `<Datepicker>`, `<Timepicker>`, `<Overflow>`, `<Image>`, `<Markdown>`
- **`<Table>` / `<Tr>` / `<Th>` / `<Td>`** — HTML-like table API that renders to a `{ type: "markdown" }` block with a GFM markdown table; intermediate cell/row nodes never appear in the output
- `option()` helper for building `OptionObject` values used in selects and radio buttons
