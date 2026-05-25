---
title: "TS Plugin SQL"
description: "API reference for @playwright-labs/ts-plugin-sql."
---

Source files: [`packages/ts-plugin-sql/src/index.ts`](/workspace/home/playwright-labs/packages/ts-plugin-sql/src/index.ts), [`packages/ts-plugin-sql/src/plugin.ts`](/workspace/home/playwright-labs/packages/ts-plugin-sql/src/plugin.ts), [`packages/ts-plugin-sql/src/schema/types.ts`](/workspace/home/playwright-labs/packages/ts-plugin-sql/src/schema/types.ts).

## Imports

```ts
import {
  sql,
  type SqlStatement,
  type SQLParams,
  type PluginConfig,
  type SchemaTable,
  type SchemaColumn,
} from "@playwright-labs/ts-plugin-sql";
```

## Public Runtime API

```ts
export { sql } from "@playwright-labs/sql-core";
export type { SqlStatement, SQLParams } from "@playwright-labs/sql-core";
```

The runtime surface is intentionally tiny because the real feature is the TypeScript language service plugin loaded through the package `main` entry.

## Plugin Types

```ts
export interface SchemaColumn {
  name: string;
  type: string;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
}

export interface PluginConfig {
  tag?: string;
  schemaFile?: string;
  schema?: Record<string, Record<string, string>>;
}
```

## Language Service Integration

`packages/ts-plugin-sql/src/plugin.ts` decorates three TypeScript language-service hooks:

- `getCompletionsAtPosition`
- `getSemanticDiagnostics`
- `getQuickInfoAtPosition`

The plugin resolves schema data first, then augments the existing language service rather than replacing it.

## Example `tsconfig.json`

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@playwright-labs/ts-plugin-sql",
        "tag": "sql",
        "schemaFile": "./src/db-types.ts"
      }
    ]
  }
}
```
