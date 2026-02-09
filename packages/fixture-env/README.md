# Playwright Environment support

## Installation

```sh
npm install @playwright/test @playwright-labs/fixture-env # npm
pnpm add @playwright/test @playwright-labs/fixture-env # pnpm
yarn add @playwright/test @playwright-labs/fixture-env # yarn
```

## Define your schema (ajv-ts)

Install if needed

```sh
npm install ajv-ts # npm
pnpm add ajv-ts # pnpm
yarn add ajv-ts # yarn
```

```ts
// filename: env.ts
import { s } from "ajv-ts";

export const env = createEnv({
  prefix: "PW_",
  schema: {
    DATABASE_URL: s.string().format("uri"), // expect PW_DATABASE_URL
    OPEN_AI_API_KEY: s.string().min(1), // expect PW_OPEN_AI_API_KEY
  },
  env: process.env,
  onValidationError: (error) => {
    console.error("Validation error:", errors);
    process.exit(1);
  },
  extends: [],
});
```

## Define your schema (zod)

Install if needed

```sh
npm install zod # npm
pnpm add zod # pnpm
yarn add zod # yarn
```

```ts
// filename: env.ts
import z from "zod";

export const env = createEnv({
  prefix: "PW_",
  schema: {
    DATABASE_URL: s.url(), // expect PW_DATABASE_URL
    OPEN_AI_API_KEY: s.string(), // expect PW_OPEN_AI_API_KEY
  },
  env: process.env,
  onValidationError: (error) => {
    console.error("Validation error:", errors);
    process.exit(1);
  },
  extends: [],
});
```

## Usage

```ts
// filename: playwright.config.ts
import { env } from "./env";

export default defineConfig({
  use: {
    env: env,
  },
});
```

## merging schemas

In case of merging different schemas, you can use `extends` option.

Example:

```ts
import { createEnv } from "@playwright-labs/fixture-env/ajv-ts";
const myBaseEnv = createEnv({
  env: {
    NODE_ENV: process.env.NODE_ENV,
  },
});

const extended = createEnv({
  extends: [myBaseEnv],
  env: {
    another: "qwerty",
  },
});

console.log("extended:", extended); // { NODE_ENV: 'development', another: 'qwerty' }
```

## Predefined env variables for different runners

Each (ajv-ts and zod) schemas you can find predefined env.variables for different execution runtime.

| name   | description                      |
| ------ | -------------------------------- |
| github | Github actions env variables [1] |
| gitlab | Gitlab runner env variables [2]  |

[1]: https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
[2]: https://docs.gitlab.com/ci/variables/predefined_variables

## Fixture

Here is a list of fixtures that `fixture-env` exports for you

- `useEnv(newEnv: Record<string, string>)` - returns an object with all env variables. newEnv by default is `process.env`
- `setEnv(env: Record<string, string>)` - Sets environment variables for the current test and restores them after the test.
- `getEnvValue(key: string, env?: Record<string, string>)` - Gets a value from the environment. Default for `env` is `process.env`
- `getEnvValueOrThrow`- Gets a value from the environment, throwing if it doesn't exist.
- `hasEnvKey(key: string)` - Checks if the environment variable exists.
- `getEnvKeysWithPrefix(prefix: string, env?: Record<string, string>)` - Gets all keys from the environment that start with the given prefix.
- `getEnvEntriesWithPrefix(prefix: string, env?: Record<string, string>)` - Gets all environment entries (key-value pairs) that match a prefix.
- `stripEnvPrefix(prefix: string, env?: Record<string, string>)` - Removes the prefix from all keys in the environment.
- `clearEnvKeys(keys: string[])` - Clears specific environment variables for the test.
- `getEnvKeys(env?: Record<string, string>)` - Gets all keys from the environment.
- `snapshotEnv(env?: Record<string, string>)` - Creates a snapshot of the environment variables for the current test.

## Expectations

Here is a list of expectations that `fixture-env` exports for you

- `expect(value: string).toBeInEnv()` - expects that value is in process.env
- `expect(value: string).toBeInEnvWithValue(value: string)` - Asserts that the key exists in `process.env` with the specified value.
- `expect(value: string).toHaveEnvKeysWithPrefix(prefix: string)` - Asserts that the key exists in `process.env` with the specified prefix.
- `expect(value: string).toMatchEnvPattern(pattern: RegExp)` - Asserts that the key exists in `process.env` with a value that matches the given pattern.
- `expect(value: string).toBeEnvUrl()` - Asserts that the key exists in `process.env` with a value that is a valid URL.
