# @playwright-labs/slack-buildkit

Build interactive [Slack Block Kit](https://api.slack.com/block-kit) messages using TypeScript builder functions or React JSX components.

The package is framework-agnostic at its core — React support ships out of the box, with Lit, Vue, and Angular planned.

---

## Installation

```bash
pnpm add @playwright-labs/slack-buildkit
# React support (optional)
pnpm add react
```

---

## Two APIs, one output

### 1. Builder functions (no framework required)

```typescript
import { header, section, divider, actions, button, render, message } from "@playwright-labs/slack-buildkit";

const blocks = render([
  header("🚀 Deployment Complete"),
  section("*Environment:* Production\n*Version:* v1.4.2"),
  divider(),
  actions([
    button("View Logs", { action_id: "view_logs", style: "primary", url: "https://logs.example.com" }),
    button("Rollback", { action_id: "rollback", style: "danger" }),
  ]),
]);

// `blocks` is a flat SlackBlock[] ready to POST
const payload = message(blocks, { text: "Deployment complete" });
```

### 2. React JSX (custom JSX runtime — no React DOM, no virtual DOM)

Configure `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@playwright-labs/slack-buildkit/react"
  }
}
```

Or use the pragma comment per file:

```tsx
/** @jsxImportSource @playwright-labs/slack-buildkit/react */
import {
  Blocks, Header, Section, Divider, Actions, Button, Context,
} from "@playwright-labs/slack-buildkit/react";
import { render } from "@playwright-labs/slack-buildkit";

function DeployReport({ env, version }: { env: string; version: string }) {
  return (
    <Blocks>
      <Header>🚀 Deployment Complete</Header>
      <Section>{`*Environment:* ${env}\n*Version:* ${version}`}</Section>
      <Divider />
      <Actions>
        <Button action_id="view_logs" style="primary" url="https://logs.example.com">
          View Logs
        </Button>
        <Button action_id="rollback" style="danger">
          Rollback
        </Button>
      </Actions>
      <Context>Deployed by CI • {new Date().toUTCString()}</Context>
    </Blocks>
  );
}

const blocks = render(<DeployReport env="production" version="v1.4.2" />);
```

> The JSX compiles to plain function calls — there is no React reconciler, no virtual DOM, no `react-dom`. Components are called synchronously and return Block Kit JSON objects directly.

---

## Sending the message

`slack-buildkit` is transport-agnostic — it only builds the payload. Use [`@playwright-labs/reporter-slack`](../reporter-slack) for Playwright test reports, or send manually:

**Incoming Webhook:**
```typescript
await fetch(process.env.SLACK_WEBHOOK_URL!, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
```

**Slack Web API:**
```typescript
await fetch("https://slack.com/api/chat.postMessage", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
  },
  body: JSON.stringify({ ...payload, channel: "C12345" }),
});
```

---

## API Reference

### Blocks

| Function | Description |
|----------|-------------|
| `section(text, options?)` | Text section, optional `fields` and `accessory` |
| `fields(items, block_id?)` | Section with only fields (no main text) |
| `header(text, block_id?)` | Large bold header text |
| `divider(block_id?)` | Horizontal rule |
| `image(url, alt, options?)` | Image block |
| `actions(elements, block_id?)` | Container for interactive elements |
| `context(elements, block_id?)` | Small contextual text or images |
| `input(label, element, options?)` | User input block |
| `richText(elements, block_id?)` | Rich text formatting |
| `video(title, url, thumb, alt, options?)` | Embedded video |

### Interactive elements

| Function | Description |
|----------|-------------|
| `button(text, options?)` | Clickable button (`style: "primary" \| "danger"`) |
| `staticSelect(placeholder, options, options?)` | Single-item dropdown |
| `multiStaticSelect(placeholder, options, options?)` | Multi-item dropdown |
| `overflow(options, action_id?, confirm?)` | Overflow menu |
| `datepicker(options?)` | Date picker |
| `timepicker(options?)` | Time picker |
| `radioButtons(options, options?)` | Radio button group |
| `checkboxes(options, options?)` | Checkbox group |
| `plainTextInput(options?)` | Single/multi-line text field |
| `imageElement(url, alt)` | Inline image element |

### Composition objects

| Function | Description |
|----------|-------------|
| `plainText(text, emoji?)` | `plain_text` object |
| `mrkdwn(text, verbatim?)` | `mrkdwn` object |
| `text(value, type?)` | Either type, defaults to `mrkdwn` |
| `option(label, value, desc?, url?)` | Select/radio/checkbox option |
| `optionGroup(label, options)` | Group of options |
| `confirm(title, text, confirm?, deny?, style?)` | Confirmation dialog |

### Render utilities

| Function | Description |
|----------|-------------|
| `render(value)` | Flatten `SlackBlock \| SlackBlock[] \| null` → `SlackBlock[]` |
| `message(blocks, options?)` | Wrap blocks into a `SlackMessage` payload object |

### React components

All block builders have a matching JSX component. Import from `@playwright-labs/slack-buildkit/react`:

`<Blocks>`, `<Header>`, `<Section>`, `<Divider>`, `<Image>`, `<Actions>`, `<Context>`, `<Input>`, `<Button>`, `<StaticSelect>`, `<MultiStaticSelect>`, `<Overflow>`, `<Datepicker>`, `<Timepicker>`, `<RadioButtons>`, `<Checkboxes>`, `<PlainTextInput>`, `<ImageEl>`, `<Mrkdwn>`, `<PlainText>`

---

## Future framework support

The core builders (`src/blocks.ts`, `src/elements.ts`, etc.) are framework-agnostic. Framework-specific layers live under sub-paths:

| Sub-path | Status |
|----------|--------|
| `@playwright-labs/slack-buildkit/react` | ✅ Available |
| `@playwright-labs/slack-buildkit/lit` | Planned |
| `@playwright-labs/slack-buildkit/vue` | Planned |
| `@playwright-labs/slack-buildkit/angular` | Planned |

---

## License

MIT
