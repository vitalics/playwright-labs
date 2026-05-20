---
title: "Fixture Env"
description: "API reference for @playwright-labs/fixture-env and its ajv-ts and zod schema helpers."
---

Source files: [`packages/fixture-env/src/index.ts`](/workspace/home/playwright-labs/packages/fixture-env/src/index.ts), [`packages/fixture-env/src/fixture.ts`](/workspace/home/playwright-labs/packages/fixture-env/src/fixture.ts), [`packages/fixture-env/src/ajv-ts.ts`](/workspace/home/playwright-labs/packages/fixture-env/src/ajv-ts.ts), [`packages/fixture-env/src/zod.ts`](/workspace/home/playwright-labs/packages/fixture-env/src/zod.ts).

## Import Paths

```ts
import { test, expect } from "@playwright-labs/fixture-env";
import { createEnv, github } from "@playwright-labs/fixture-env/ajv-ts";
import { createEnv as createZodEnv, github as githubZod } from "@playwright-labs/fixture-env/zod";
```

## Fixture API

```ts
export type Fixture = {
  useEnv: <E extends Record<string, string>>(env: E) => E & typeof process.env;
  setEnv: <E extends Record<string, string | undefined>>(env: E) => void;
  getEnvValue: <E extends Record<string, string | undefined>, K extends keyof E = keyof E>(
    key: K,
    env?: E,
  ) => E[K] | undefined;
  getEnvValueOrThrow: <E extends Record<string, string>, K extends keyof E = keyof E>(
    key: K,
    env?: E,
  ) => E[K];
  hasEnvKey: <E extends Record<string, any>>(key: string, env?: E) => boolean;
  getEnvKeysWithPrefix: <E extends Record<string, any>>(prefix: string, env?: E) => string[];
  getEnvEntriesWithPrefix: <E extends Record<string, any>>(prefix: string, env?: E) => Record<string, E[keyof E]>;
  stripEnvPrefix: <E extends Record<string, string>>(prefix: string, env?: E) => Record<string, E[keyof E]>;
  clearEnvKeys: (keys: string[]) => void;
  getEnvKeys: <E extends Record<string, string>>(env?: E) => string[];
  snapshotEnv: <E extends Record<string, string>>(env?: E) => Record<string, string | undefined>;
  restoreEnv: (snapshot: Record<string, string | undefined>) => void;
};
```

The fixture implementation restores `process.env` after the test, which is the key guarantee behind this package.

## Schema Helpers

Both subpaths export the same public shape:

```ts
export function createEnv(options?: {
  prefix?: string;
  schema?: Record<string, ...>;
  env?: Record<string, string | undefined>;
  onValidationError?: (error: Error) => void;
  extends?: Record<string, unknown>[];
  readonlyKeys?: boolean;
}): Record<string, unknown>;

export const github: () => Record<string, unknown>;
```

`createEnv()` validates env values against either `ajv-ts` or `zod` schemas and can merge previously built env objects through the `extends` option.

| Option | Type | Default | Description |
|---|---|---|---|
| `prefix` | `string` | `""` | Prepends a prefix like `PW_` to every schema key lookup. |
| `schema` | `Record<string, schema>` | `{}` | Validation schema map. |
| `env` | `Record<string, string \| undefined>` | `{}` | Source env object, often `process.env`. |
| `onValidationError` | `(error: Error) => void` | — | Receives schema parse failures. |
| `extends` | `Record<string, unknown>[]` | `[]` | Merges pre-built env objects first. |
| `readonlyKeys` | `boolean` | `false` | Defines returned keys as read-only properties. |

## Example

```ts
import { createEnv } from "@playwright-labs/fixture-env/zod";
import { z } from "zod";

const env = createEnv({
  prefix: "PW_",
  schema: {
    DATABASE_URL: z.string().url(),
  },
  env: process.env,
});
```
