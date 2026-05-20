---
title: Validate API Response JSON Schemas with toMatchSchema Custom Matcher
impact: MEDIUM
impactDescription: catches contract regressions instantly without writing per-field assertions
tags: schema, validation, api-testing, json-schema, ajv-ts, toMatchSchema, fixtures
---

## Validate API Response JSON Schemas with toMatchSchema Custom Matcher

**Impact: MEDIUM (catches contract regressions instantly without writing per-field assertions)**

Manually asserting every field of an API response is tedious and misses unexpected fields or type changes. The `@playwright-labs/fixture-ajv-ts` package provides a `schema` fixture (powered by [ajv-ts](https://npmjs.com/package/ajv-ts)) and a `toMatchSchema` custom matcher that validates any value against a JSON schema in one assertion. Schema definitions live outside tests, can be shared across suites, and produce structured error messages on failure.

## When to Use

- **Use toMatchSchema when**: Validating API response bodies, webhook payloads, form submissions, or any structured JSON
- **Define schemas separately when**: Multiple tests share the same endpoint contract — define once, import everywhere
- **Use inline schema (via `schema` fixture) when**: Schema is test-specific and small
- **Required for**: API contract testing, preventing silent response structure changes in CI

## Guidelines

### Do

- Define schemas in `schemas/` files colocated with the feature they describe
- Use `s.object()` with explicit required fields — do not rely on loose matching
- Use `s.string().format('email')`, `s.string().format('uri')` for semantic validation
- Use `.optional()` on nullable/optional fields rather than `s.union(s.string(), s.undefined())`
- Combine `toBeOK()` (HTTP status) with `toMatchSchema()` (body shape) for full coverage
- Add the fixture to your `mergeTests`/`mergeExpects` composite — see `fixture-merge-tests-expects` rule

### Don't

- Don't use `toMatchSchema` for non-JSON values like HTML strings or binary buffers
- Don't define schemas inline with `schema` fixture for schemas shared across test files
- Don't ignore the `Errors:` section in failed assertions — it pinpoints the exact failing field
- Don't use `s.any()` to silence schema errors — fix the schema or the API

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/fixture-ajv-ts ajv-ts`
- **Fixture**: `schema` — alias for `s` (ajv-ts schema builder) usable inside tests
- **Matcher**: `expect(value).toMatchSchema(schema, options?)` — works on any value, not just locators
- **Schema builders**: `s.object()`, `s.array()`, `s.string()`, `s.number()`, `s.boolean()`, `s.enum()`, `.optional()`, `.nullable()`, `.format()`

## Edge Cases and Constraints

### Limitations

- `toMatchSchema` uses strict mode by default — extra fields not defined in the schema will fail validation unless explicitly allowed with `s.object().additionalProperties(true)`
- Nested object schemas are validated recursively; deeply nested errors report the full JSON path
- Schema builder API follows [ajv-ts](https://npmjs.com/package/ajv-ts) — refer to its docs for advanced formats

### Edge Cases

1. **Paginated list responses**: Wrap per-item schema in `s.array(ItemSchema)` and assert on the array root.
2. **Polymorphic responses** (`data` is string or number): Use `s.string().or(s.number())`.
3. **Optional nested object**: Use `AddressSchema.optional()` — if the field is present it must match the schema, if absent it's valid.

### What Breaks If Ignored

- **Without schema validation**: API silently changes `email` to `emailAddress` — all tests pass, feature breaks in production
- **Without `toBeOK()` check first**: `toMatchSchema` runs against the error body (4xx/5xx), producing confusing schema errors
- **Without shared schemas**: Same schema defined in 5 test files — one endpoint changes, 4 tests fail, 1 is forgotten

**Incorrect (manual per-field assertions, no schema):**

```typescript
import { test, expect } from '@playwright/test';

test('GET /users/1 returns user', async ({ request }) => {
  const res = await request.get('/api/users/1');
  const body = await res.json();

  // ❌ Manual field checks — misses type errors and extra/missing fields
  expect(body.id).toBeDefined();
  expect(typeof body.name).toBe('string');
  expect(typeof body.email).toBe('string');
  // ❌ Never checks that `createdAt` is a date string, `role` is an enum, etc.
  // ❌ If the API adds a `password` field by mistake, this test still passes
});
```

**Correct (schema fixture + toMatchSchema):**

```typescript
// fixtures/index.ts
import { mergeTests, mergeExpects } from '@playwright/test';
import {
  test as ajvTest,
  expect as ajvExpect,
} from '@playwright-labs/fixture-ajv-ts';

export const test = mergeTests(ajvTest);
export const expect = mergeExpects(ajvExpect);
```

```typescript
// schemas/user.ts — shared schema, import everywhere
import { s } from 'ajv-ts';

export const UserSchema = s.object({
  id: s.number(),
  name: s.string().min(1),
  email: s.string().format('email'),
  role: s.enum('admin', 'user', 'guest'),
  createdAt: s.string().format('date-time'),
  address: s.object({
    street: s.string(),
    city: s.string(),
    country: s.string(),
  }).optional(),
});

export const UsersListSchema = s.array(UserSchema);
```

```typescript
// tests/users.spec.ts
import { test, expect } from '../fixtures';
import { UserSchema, UsersListSchema } from '../schemas/user';

// ✅ Single assertion covers all fields, types, and formats
test('GET /users/1 returns valid user', async ({ request }) => {
  const res = await request.get('/api/users/1');
  await expect(res).toBeOK();
  expect(await res.json()).toMatchSchema(UserSchema);
});

// ✅ Array response validation
test('GET /users returns array of valid users', async ({ request }) => {
  const res = await request.get('/api/users');
  await expect(res).toBeOK();
  const body = await res.json();
  expect(body).toMatchSchema(UsersListSchema);
  expect(body.length).toBeGreaterThan(0);
});

// ✅ Inline schema with `schema` fixture for one-off tests
test('POST /auth/token returns token shape', async ({ request, schema }) => {
  const TokenSchema = schema.object({
    accessToken: schema.string().min(10),
    expiresIn: schema.number().min(0),
    tokenType: schema.enum('Bearer'),
  });

  const res = await request.post('/api/auth/token', {
    data: { username: 'user', password: 'pass' },
  });
  await expect(res).toBeOK();
  expect(await res.json()).toMatchSchema(TokenSchema);
});

// ✅ Negative test — verify error response shape
test('GET /users/999 returns error schema', async ({ request, schema }) => {
  const ErrorSchema = schema.object({
    error: schema.string(),
    code: schema.number(),
  });

  const res = await request.get('/api/users/999');
  expect(res.status()).toBe(404);
  expect(await res.json()).toMatchSchema(ErrorSchema);
});
```

Reference: [@playwright-labs/fixture-ajv-ts](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-ajv-ts)
