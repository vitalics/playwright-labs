---
title: Manage Environment Variables with Type-Safe Validated Configuration
impact: MEDIUM
impactDescription: prevents test failures caused by missing or misconfigured environment variables
tags: environment-variables, configuration, type-safe, validation, fixture-env, ajv-ts, zod
---

## Manage Environment Variables with Type-Safe Validated Configuration

**Impact: MEDIUM (prevents test failures caused by missing or misconfigured environment variables)**

Accessing `process.env.SOME_VAR` directly in tests is untyped, lacks validation, and causes obscure failures when variables are missing. The `@playwright-labs/fixture-env` package provides a `createEnv()` factory (with ajv-ts or zod schemas), fixtures for safe access (`getEnvValueOrThrow`, `setEnv`, `snapshotEnv`), and custom matchers for asserting env state. Type errors are caught at startup, not mid-test.

## When to Use

- **Use createEnv when**: You have more than 2 required environment variables — validate all at startup with a schema
- **Use setEnv fixture when**: A test needs to override an env variable and restore it afterwards without manual cleanup
- **Use getEnvValueOrThrow when**: A test requires a variable that must exist (auth tokens, API keys, base URLs)
- **Use env matchers when**: Testing configuration loading or environment-conditional behavior

## Guidelines

### Do

- Define a typed `createEnv()` schema at the project root (`env.ts`) and import from it in tests
- Use `prefix` option when all test-specific vars share a common prefix (e.g. `PW_`)
- Use `onValidationError` to fail fast with a clear message before any test runs
- Use `setEnv` fixture in tests rather than mutating `process.env` directly
- Use `snapshotEnv`/`restoreEnv` when a test needs full env isolation
- Combine with `extends` to share common env definitions across environments

### Don't

- Don't access `process.env.X` directly in test code — it's untyped and unvalidated
- Don't modify `process.env` directly in tests without restoring — it bleeds into other tests in the same worker
- Don't skip `onValidationError` — validation errors need to abort the run, not silently default
- Don't define `createEnv` inside test files — it runs at startup, define it once and import

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/fixture-env`
- **Install schema**: `npm install ajv-ts` (or `zod`)
- **Exports**: `createEnv` from `@playwright-labs/fixture-env/ajv-ts` or `/zod`
- **Fixtures**: `useEnv`, `setEnv`, `getEnvValue`, `getEnvValueOrThrow`, `hasEnvKey`, `snapshotEnv`, `restoreEnv`, `clearEnvKeys`, `getEnvKeysWithPrefix`, `stripEnvPrefix`
- **Matchers**: `toBeInEnv()`, `toBeInEnvWithValue(value)`, `toMatchEnvPattern(regex)`, `toBeEnvUrl()`, `toBeEnvNumber()`, `toBeEnvBoolean()`, `toBeEnvOneOf(values)`

## Edge Cases and Constraints

### Limitations

- `createEnv` validates at import time — errors surface before `test.beforeAll` runs
- `setEnv` restoration only works for keys set within the fixture scope — pre-existing keys are preserved
- `extends` merges env objects shallowly — duplicate keys in extended envs are overridden by the outer `createEnv`

### Edge Cases

1. **CI vs local**: Use `extends` with a `github` or `gitlab` predefined preset to map CI-injected variables to consistent names.
2. **Secret masking**: Wrap sensitive values in `{ value, masked: true }` if your reporting integration supports it; `createEnv` itself does not mask.
3. **Multiple test projects**: Each project can have its own `createEnv` with different prefixes and schemas — merge them via `extends`.

### What Breaks If Ignored

- **Without validation**: Missing `DATABASE_URL` causes a cryptic `TypeError: Cannot read properties of undefined` 50 tests in
- **Without setEnv cleanup**: A test sets `NODE_ENV=production`, the next test in the same worker sees it, tests become order-dependent
- **Without typed env**: `process.env.PORT` is always `string | undefined` — passing it to `parseInt` without a check silently produces `NaN`

**Incorrect (direct process.env access, no typing, no validation):**

```typescript
import { test, expect } from '@playwright/test';

test('connects to database', async () => {
  // ❌ No validation — undefined if variable not set
  const url = process.env.DATABASE_URL;
  const db = await connect(url as string); // ❌ unsafe cast
  expect(await db.ping()).toBe(true);
});

test('API base URL is set', async ({ request }) => {
  // ❌ Direct env access, test fails with unhelpful error if missing
  const base = process.env.API_BASE_URL!;
  const res = await request.get(`${base}/health`);
  expect(res.ok()).toBe(true);
});
```

**Correct (createEnv with schema validation + env fixtures):**

```typescript
// env.ts — validated at startup, imported by playwright.config.ts and tests
import { createEnv } from '@playwright-labs/fixture-env/ajv-ts';
import { s } from 'ajv-ts';

export const env = createEnv({
  prefix: 'PW_',
  schema: {
    DATABASE_URL: s.string().format('uri'),   // PW_DATABASE_URL
    API_BASE_URL: s.string().format('uri'),   // PW_API_BASE_URL
    AUTH_TOKEN: s.string().min(1),            // PW_AUTH_TOKEN
    LOG_LEVEL: s.enum('debug', 'info', 'warn', 'error').optional(),
  },
  env: process.env,
  onValidationError: (error) => {
    console.error('❌ Invalid test environment:', error);
    process.exit(1); // fail fast before tests start
  },
});
// env.DATABASE_URL, env.API_BASE_URL, etc. are typed as string
```

```typescript
// fixtures/index.ts
import { mergeTests, mergeExpects } from '@playwright/test';
import { test as envTest, expect as envExpect } from '@playwright-labs/fixture-env';

export const test = mergeTests(envTest);
export const expect = mergeExpects(envExpect);
```

```typescript
// tests/config.spec.ts
import { test, expect } from '../fixtures';
import { env } from '../env';

// ✅ Typed access — TypeScript knows env.API_BASE_URL is string
test('health endpoint is reachable', async ({ request }) => {
  const res = await request.get(`${env.API_BASE_URL}/health`);
  await expect(res).toBeOK();
});

// ✅ Override env in test scope, auto-restored after
test('feature is disabled in staging', async ({ setEnv }) => {
  setEnv({ FEATURE_FLAG: 'false' });

  const res = await fetch(`${env.API_BASE_URL}/feature`);
  const body = await res.json();
  expect(body.enabled).toBe(false);
  // process.env.FEATURE_FLAG is restored automatically
});

// ✅ Assert env variable exists and has expected format
test('DATABASE_URL is a valid URI', async () => {
  expect('PW_DATABASE_URL').toBeInEnv();
  expect('PW_DATABASE_URL').toBeEnvUrl();
});

// ✅ Get required value or throw with clear error
test('authenticated API call', async ({ getEnvValueOrThrow, request }) => {
  const token = getEnvValueOrThrow('PW_AUTH_TOKEN');
  const res = await request.get('/api/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  await expect(res).toBeOK();
});
```

```typescript
// Using extends to share common variables
import { createEnv } from '@playwright-labs/fixture-env/ajv-ts';

const baseEnv = createEnv({
  env: { NODE_ENV: process.env.NODE_ENV },
});

export const env = createEnv({
  extends: [baseEnv],
  prefix: 'PW_',
  schema: {
    API_BASE_URL: s.string().format('uri'),
  },
  env: process.env,
});
// env.NODE_ENV inherited from baseEnv
```

Reference: [@playwright-labs/fixture-env](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-env)
