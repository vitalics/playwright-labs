---
title: "Getting Started"
description: "Start using the Playwright Labs monorepo of fixtures, reporters, selector engines, and typed utilities."
---

Playwright Labs is a pnpm monorepo of publishable packages that extend `@playwright/test` with higher-level fixtures, reporters, selector engines, SQL tooling, and notification utilities.

## The Problem

- Playwright’s core APIs are intentionally small, so teams end up rebuilding the same fixture setup, diagnostics, and helper layers in every repo.
- Advanced workflows such as OpenTelemetry export, SQL-backed tests, or framework-aware component selectors usually require custom glue code around workers, reporters, and editor tooling.
- Test infrastructure concerns such as Docker containers, environment management, fake data, timers, and human-like cursor movement tend to become scattered utilities with inconsistent ergonomics.
- Rich notifications for Slack, email, Allure, and other delivery channels often live outside the test runner, which makes them hard to reuse and harder to type-check.

## The Solution

Playwright Labs standardizes those patterns as focused packages that all follow the same Playwright-first shape: import a `test`, optionally merge it with your own fixtures, and then use one well-scoped capability.

```ts
import { mergeExpects, mergeTests } from "@playwright/test";
import {
  test as otelTest,
  expect as otelExpect,
} from "@playwright-labs/fixture-otel";
import {
  test as sqlTest,
  expect as sqlExpect,
} from "@playwright-labs/fixture-sql";
import { sqliteAdapter } from "@playwright-labs/fixture-sql/sqlite";

export const test = mergeTests(otelTest, sqlTest);
export const expect = mergeExpects(otelExpect, sqlExpect);

test.use({ sqlAdapter: sqliteAdapter(":memory:") });

test("records telemetry for a SQL-backed test", async ({ sql, useCounter }) => {
  const queries = useCounter("example_queries");
  await sql.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");
  await sql.execute("INSERT INTO users VALUES (?, ?)", [1, "Ada"]);
  queries.add(2);
});
```

## Installation

<Tabs items={["npm", "pnpm", "yarn", "bun"]}>
<Tab value="npm">

```bash
npm install @playwright/test @playwright-labs/fixture-otel @playwright-labs/fixture-sql
```

</Tab>
<Tab value="pnpm">

```bash
pnpm add @playwright/test @playwright-labs/fixture-otel @playwright-labs/fixture-sql
```

</Tab>
<Tab value="yarn">

```bash
yarn add @playwright/test @playwright-labs/fixture-otel @playwright-labs/fixture-sql
```

</Tab>
<Tab value="bun">

```bash
bun add @playwright/test @playwright-labs/fixture-otel @playwright-labs/fixture-sql
```

</Tab>
</Tabs>

## Quick Start

The minimum viable pattern is to adopt one fixture package directly:

```ts
import { test, expect } from "@playwright-labs/fixture-timers";

test("uses promise-based Node timers", async ({ setTimeout }) => {
  const value = await setTimeout(25, "ready");
  await expect(Promise.resolve(value)).toResolveWith("ready");
});
```

Expected result:

```text
1 passed
```

## Key Features

- Fixture packages expose a consistent `test` and `expect` surface, so they compose with `mergeTests` and `mergeExpects`.
- Reporter packages integrate with Playwright lifecycle hooks instead of requiring a separate orchestration service.
- Framework selector packages expose runtime-aware locators for React, Vue 3, and Angular dev builds.
- SQL packages split responsibilities cleanly across compile-time typing, editor tooling, and test-time connections.
- Notification packages include reusable rendering layers, not just transport wrappers.

<Cards>
  <Card title="Architecture" href="/docs/architecture">See how package families interact across workers, reporters, and editor tooling.</Card>
  <Card title="Core Concepts" href="/docs/fixture-composition">Learn the shared patterns behind fixtures, serialization, and package layering.</Card>
  <Card title="API Reference" href="/docs/api-reference/decorators">Browse package-by-package exports, signatures, options, and source locations.</Card>
</Cards>
