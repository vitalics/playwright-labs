---
title: "Types"
description: "Review the most important exported TypeScript types and interfaces across Playwright Labs."
---

Playwright Labs exports many package-local types, but a few groups define the shape of the whole repo: SQL statements and clients, OTel payloads and options, and Slack or email message builders.

## SQL Core Types

Source: [`packages/sql-core/src/types.ts`](/workspace/home/playwright-labs/packages/sql-core/src/types.ts)

```ts
export type QueryResult<T = Row> = {
  rows: T[];
  rowCount: number;
  command?: string;
};

export type SqlStatement<P extends readonly unknown[] = readonly unknown[]> =
  string & { readonly __sqlBrand: P };

export interface SqlClient {
  query<T = Row, P extends readonly [unknown, ...unknown[]] = readonly [unknown, ...unknown[]]>(
    sql: SqlStatement<P>,
    params: readonly [...P]
  ): Promise<QueryResult<T>>;
  execute<P extends readonly [unknown, ...unknown[]] = readonly [unknown, ...unknown[]]>(
    sql: SqlStatement<P>,
    params: readonly [...P]
  ): Promise<void>;
  close(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}
```

Use these when you want the compiler to distinguish a validated SQL statement from an ordinary string. `SqlStatement<P>` is the important piece: it brands the string with the expected parameter tuple so `SqlClient` overloads can enforce the right parameter count.

## SQL Type-Level Validation

Source: [`packages/sql-core/src/SQLType.ts`](/workspace/home/playwright-labs/packages/sql-core/src/SQLType.ts)

```ts
export type SQLParams<S extends string> = ...;
export type ValidSQL<S extends string> = ...;
export type InferSQLParams<S extends string> = SQLParams<S>;
```

These are compile-time helpers, not runtime values. `SQLParams<"...">` resolves to a tuple of `unknown` values whose length matches the placeholders in the statement, while `ValidSQL<"...">` collapses to `never` when the type-level finite-state-machine rejects the structure.

## OTel Payload Types

Source: [`packages/otel-core/src/events.ts`](/workspace/home/playwright-labs/packages/otel-core/src/events.ts)

```ts
export type MetricPayload = {
  kind: "metric";
  type: MetricType;
  name: string;
  description?: string;
  unit?: string;
  dataPoints: DataPoint[];
};

export type SpanPayload = {
  kind: "span";
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime: number;
  attributes?: Record<string, string | number | boolean>;
  status?: "ok" | "error";
  statusMessage?: string;
};
```

These types define the worker-to-reporter contract for the observability packages. They matter if you extend the bridge or build custom tooling around stdout parsing.

## Reporter and Builder Types

Source: [`packages/reporter-slack/src/types.ts`](/workspace/home/playwright-labs/packages/reporter-slack/src/types.ts)

```ts
export type SlackReporterOptions = {
  send?: "always" | "never" | "on-failure";
  blocks: BlocksResolver;
  text?: string | ((result: FullResult, testCases: SlackTestCases) => string);
  onSend?: (response: SlackSendResponse) => void | Promise<void>;
} & (WebhookTransport | BotTransport);
```

Source: [`packages/slack-buildkit/src/types.ts`](/workspace/home/playwright-labs/packages/slack-buildkit/src/types.ts)

```ts
export type SlackMessage = {
  text?: string;
  blocks: SlackBlock[];
  attachments?: SlackAttachment[];
};
```

Source: [`packages/reporter-email/src/reporter.ts`](/workspace/home/playwright-labs/packages/reporter-email/src/reporter.ts)

```ts
export type NodemailerReporterOptions = {
  send?: "always" | "never" | "on-failure";
  to: string | string[];
  from: string;
  subject: string | ((result: FullResult) => string);
  onEmailSend?: (info: SMTPTransport.SentMessageInfo) => void | Promise<void>;
} & ({ text: ... } | { html: ... });
```

These option types show the design split clearly: `slack-buildkit` only models payloads, while `reporter-slack` and `reporter-email` model transport and delivery.
