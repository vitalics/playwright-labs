---
title: Enrich Test Reports with fixture-allure
impact: MEDIUM
impactDescription: turns flat pass/fail output into structured Allure reports with steps, attachments, and masked secrets
tags: allure, reporting, fixtures, decorators, masking
---

## Enrich Test Reports with fixture-allure

**Impact: MEDIUM (turns flat pass/fail output into structured Allure reports with steps, attachments, and masked secrets)**

A failing test without structure forces you to open a trace just to learn which of the 30 actions broke. The `@playwright-labs/fixture-allure` package gives you a `useAllure` fixture for test metadata (id, severity, owner, epic/feature/story, tags, issues, links), the full `allure-js-commons` runtime for named steps and attachments, and `functionDecorator`/`methodDecorator` helpers that wrap shared helpers and page-object methods in Allure steps automatically — with `PARAMETER.MASKED` to keep credentials out of the report.

## When to Use

- **Use useAllure when**: A test needs Allure metadata — `id`, `severity`, `owner`, `epic`, `feature`, `story`, `suite`, `component`, `labels`, `parameters`, `tags`, `issues`, `links`
- **Use allure.step / allure.attachment when**: Grouping a multi-action flow into a named step, or attaching screenshots, payloads, and logs to the report
- **Use functionDecorator / methodDecorator when**: A helper or page-object method is called from many tests and every call site should produce the same named step
- **Use PARAMETER.MASKED when**: A credential or token must be visible as a parameter in the report but its value must stay hidden
- **Use DEFAULT_CONFIG / makeReporterDescription when**: Wiring the `allure-playwright` reporter into `playwright.config.ts` with environment info
- **Requires**: `allure-js-commons` (peer dependency) installed, and the `allure-playwright` reporter active — the reporter entry produced by `makeReporterDescription` targets it

## Guidelines

### Do

- Call `useAllure({ ... })` once at the top of the test, before any steps — it returns the `allure-js-commons` runtime you use for `step`, `attachment`, and `parameter`
- Merge the fixture into your project test object with `mergeTests`/`mergeExpects` instead of importing `test` from the package in every spec
- Decorate shared helpers once with `functionDecorator` and page-object methods with `@methodDecorator` — every call site gets an identical, correctly named step
- Mark every secret in decorator `args` as `PARAMETER.MASKED` (shown as masked in the report) or `PARAMETER.HIDDEN` (not shown at all)
- Set `attachResult: false` on helpers that return tokens, sessions, or large objects — the return value is serialized into the report by default
- Spread `ENVIRONMENT_INFO` into a custom `environmentInfo` so `os_platform`, `os_release`, `os_version`, `parallelism`, and `node_version` always reach the report

### Don't

- Don't pass secrets through `allure.parameter` or the `parameters` option without `options: { mode: "masked" }` — the report is an artifact that gets archived and shared in CI
- Don't wrap every call site in manual `allure.step` blocks — names drift, steps get forgotten, and refactors break the report structure; decorate the helper instead
- Don't call a decorated function without `await` — `functionDecorator` always returns a `Promise`, even when the wrapped function is synchronous
- Don't apply `@methodDecorator` to non-async methods or non-method members — it is async-only and throws `AllureStep decorator can only be used on methods` on anything else
- Don't enable `parametrizeArguments: true` on helpers that receive secrets — it serializes the entire arguments array into the report with no masking

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/fixture-allure allure-js-commons allure-playwright`
- **Fixtures**: `useAllure(context)` (preferred) and `allure` (raw runtime) — both from the package's `test` export
- **Runtime API** (returned by `useAllure`): `allure.step(name, body)`, `allure.attachment(name, content, contentType)`, `allure.parameter(name, value, options?)`
- **Decorators**: `functionDecorator(fn, options?)`, `@methodDecorator(options?)` with options `name`, `args`, `attachResult`, `attachError`, `throwError`, `parametrizeArguments`, `parametrizeThis`
- **Parameter modes**: `PARAMETER.DEFAULT`, `PARAMETER.HIDDEN`, `PARAMETER.MASKED`
- **Config helpers**: `DEFAULT_CONFIG`, `REPORTER_DESCRIPTION`, `makeReporterDescription({ outputFolder, resultsDir, detail, environmentInfo })`, `ENVIRONMENT_INFO`

## Edge Cases and Constraints

### Limitations

- `functionDecorator` always returns a `Promise`, even for synchronous functions — this is by design because Allure steps and attachments are async; every caller must `await`
- `@methodDecorator` uses the standard TC39 decorators syntax (TypeScript 5+), not the legacy `experimentalDecorators` transform, and works only on `async` methods
- Steps and attachments need an active Allure runtime — provided by the `allure-playwright` reporter; without it, report data has nowhere to land
- `attachResult` (default `true`) serializes the full return value with `util.inspect` at unlimited depth into a `return` attachment — large objects produce large attachments, and secrets are serialized as-is
- Decorator `args` are **positional**: each `[name, mode]` entry maps to the call argument at the same array index, not to a parameter name

### Edge Cases

1. **Decorated helper receives `page` as its first argument**: The positional `args` mapping shifts — `[["username", PARAMETER.DEFAULT]]` would label the `page` object as "username". Either list every leading argument (`["page", PARAMETER.HIDDEN]`) or close over `page` instead of passing it.
2. **Nested decorated calls**: A decorated helper calling another decorated helper produces a nested step tree in the report — this is desirable; you get the outer flow and inner operations for free.
3. **`throwError: false`**: The error is captured as an `error` attachment and returned instead of thrown — the step stays green. Keep the default `throwError: true` unless you deliberately handle the returned error.

### What Breaks If Ignored

- **Without masking**: Credentials land in the Allure report in plain text — archived in CI artifacts, visible to anyone with report access, a credential leak
- **Without steps and metadata**: A 30-action test renders as one flat row — triage means opening the trace for every failure, and the report can't be filtered by epic, feature, severity, or owner
- **Without decorators**: Manual `allure.step` wrappers at every call site drift apart — three names for the same login flow, missing steps after refactors

**Incorrect (plain-text secret, manual steps at every call site):**

```typescript
import { test } from "@playwright/test";
import * as allure from "allure-js-commons";

test("user can log in", async ({ page }) => {
  // ❌ Secret written into the report in plain text — archived with CI artifacts
  await allure.parameter("password", "SuperSecret123!");

  // ❌ Manual step wrappers at every call site — easy to forget, names drift
  await allure.step("fill username", async () => {
    await page.fill("#username", "qa-user");
  });
  await allure.step("fill password", async () => {
    await page.fill("#password", "SuperSecret123!");
  });
  await allure.step("submit the login form", async () => {
    await page.click("#submit");
  });

  // ❌ No metadata — report can't be filtered by severity, owner, or feature
});
```

**Why this fails:**
- The password value is stored unmasked in the report and in every CI artifact archive
- Step names are duplicated per call site; rename the flow and half the reports still show the old name
- There is no `severity`, `owner`, `epic`, or `feature` — a 500-test run is one unsortable list

**Correct (useAllure metadata + decorated helper with masked password):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import {
  makeReporterDescription,
  ENVIRONMENT_INFO,
} from "@playwright-labs/fixture-allure";

export default defineConfig({
  reporter: [
    ["html"],
    makeReporterDescription({
      outputFolder: "output/allure-results",
      environmentInfo: {
        Environment: "staging",
        ...ENVIRONMENT_INFO, // ✅ os_platform, os_release, os_version, parallelism, node_version
      },
    }),
  ],
});
```

```typescript
// fixtures/index.ts — merge once, import everywhere
import { mergeTests, mergeExpects } from "@playwright/test";
import {
  test as allureTest,
  expect as allureExpect,
} from "@playwright-labs/fixture-allure";

export const test = mergeTests(allureTest);
export const expect = mergeExpects(allureExpect);
```

```typescript
// helpers/login.ts — decorate once, every call site gets the same step
import { functionDecorator, PARAMETER } from "@playwright-labs/fixture-allure";
import type { Page } from "@playwright/test";

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click("#submit");
}

export const loginStep = functionDecorator(login, {
  name: "Login",
  args: [
    ["page", PARAMETER.HIDDEN], // ✅ positional: first entry maps to the first argument
    ["username", PARAMETER.DEFAULT],
    ["password", PARAMETER.MASKED], // ✅ shown masked in the report
  ],
  attachResult: false, // ✅ never serialize session data into the report
});
```

```typescript
// tests/login.spec.ts
import { test, expect } from "../fixtures";
import { loginStep } from "../helpers/login";

test("user can log in", async ({ page, useAllure }) => {
  const allure = useAllure({
    id: 123456,
    layer: "UI",
    severity: "critical",
    owner: "John Doe",
    epic: "User Management",
    feature: "Login",
    story: "User can log in",
    tags: ["ui", "regression"],
    issues: [{ url: "https://example.com/issue1", name: "Issue 1" }],
  });

  // ✅ one named "Login" step, password masked — identical in every test that calls it
  await loginStep(page, "qa-user", process.env.QA_PASSWORD!);

  await allure.step("dashboard loads", async () => {
    await expect(page).toHaveURL(/.*dashboard/);
    // ✅ visual evidence attached to the step
    await allure.attachment("dashboard", await page.screenshot(), "image/png");
  });
});
```

**Why this works:**
- The password never appears in the report — `PARAMETER.MASKED` masks the value while keeping the parameter visible
- The "Login" step is defined once on the helper; renaming it updates every test's report at once
- Metadata makes the report filterable by severity, owner, epic, feature, and tags, and `ENVIRONMENT_INFO` records where the run happened

## Common Mistakes

### Mistake 1: Secrets in the report in plain text

```typescript
test("login", async ({ page, useAllure }) => {
  const allure = useAllure({
    // ❌ record-form parameters have no masking — value stored as-is
    parameters: { username: "qa-user", password: "SuperSecret123!" },
  });

  // ❌ same problem through the runtime API
  await allure.parameter("api_token", process.env.API_TOKEN!);
});
```

**Why this is wrong**: The Allure report is a build artifact — it gets archived, attached to tickets, and shared. Any parameter without `mode: "masked"` is stored in plain text.

**How to fix**:

```typescript
test("login", async ({ page, useAllure }) => {
  const allure = useAllure({
    // ✅ array form accepts per-parameter options
    parameters: [
      { name: "username", value: "qa-user" },
      { name: "password", value: "SuperSecret123!", options: { mode: "masked" } },
    ],
  });

  // ✅ same masking through the runtime API
  await allure.parameter("api_token", process.env.API_TOKEN!, { mode: "masked" });
});
```

### Mistake 2: Misaligned positional args in decorators

```typescript
const loginStep = functionDecorator(login, {
  args: [
    ["username", PARAMETER.DEFAULT],
    ["password", PARAMETER.MASKED],
  ],
});
// login(page, username, password) — ❌ "username" shows the serialized page object,
// ❌ "password" masks the username, and the real password is never recorded or masked
```

**Why this is wrong**: Decorator `args` map to call arguments by array index, not by parameter name. When the helper's first parameter is `page`, every entry shifts by one — and the secret can end up under a `PARAMETER.DEFAULT` entry.

**How to fix**:

```typescript
const loginStep = functionDecorator(login, {
  args: [
    ["page", PARAMETER.HIDDEN], // ✅ account for every leading argument
    ["username", PARAMETER.DEFAULT],
    ["password", PARAMETER.MASKED],
  ],
});
```

### Mistake 3: Forgetting to await a decorated function

```typescript
test("login then checkout", async ({ page }) => {
  loginStep(page, "qa-user", process.env.QA_PASSWORD!); // ❌ missing await
  await page.goto("/checkout"); // runs before the login step finishes
});
```

**Why this is wrong**: `functionDecorator` returns a `Promise` even when the wrapped function is synchronous, because Allure steps and attachments are async. Without `await`, the next action races the decorated call — the test acts on an unauthenticated page and the step may never be recorded.

**How to fix**:

```typescript
test("login then checkout", async ({ page }) => {
  await loginStep(page, "qa-user", process.env.QA_PASSWORD!); // ✅
  await page.goto("/checkout");
});
```

### Mistake 4: Decorating a non-async or non-method member

```typescript
class AuthPage {
  @methodDecorator({ name: "token" })
  get token() {
    // ❌ throws: AllureStep decorator can only be used on methods
    return this._token;
  }

  @methodDecorator()
  syncHelper() {
    // ❌ methodDecorator works only with async methods
    return 42;
  }
}
```

**Why this is wrong**: `@methodDecorator` validates `context.kind` and supports only `async` methods under the standard TC39 decorators syntax (TypeScript 5+).

**How to fix**:

```typescript
class AuthPage {
  @methodDecorator({ name: "Refresh token" })
  async refreshToken() {
    // ✅ async method — wrapped in an Allure step named "Refresh token"
    this._token = await fetchNewToken();
  }
}
```

## Advanced Patterns

Decorate an entire page object so the report mirrors the object's API, and combine it with per-test metadata:

```typescript
// pages/auth-page.ts
import { methodDecorator, PARAMETER } from "@playwright-labs/fixture-allure";
import type { Page } from "@playwright/test";

export class AuthPage {
  constructor(private page: Page) {}

  @methodDecorator({
    name: "Login via UI",
    args: [
      ["username", PARAMETER.DEFAULT],
      ["password", PARAMETER.MASKED],
    ],
  })
  async login(username: string, password: string) {
    await this.page.goto("/login");
    await this.page.fill("#username", username);
    await this.page.fill("#password", password);
    await this.page.click("#submit");
  }

  @methodDecorator() // ✅ step name defaults to the method name
  async logout() {
    await this.page.click("#user-menu");
    await this.page.click("#logout");
  }
}
```

```typescript
// tests/auth.spec.ts
import { test, expect } from "../fixtures";
import { AuthPage } from "../pages/auth-page";

test("login and logout", async ({ page, useAllure }) => {
  useAllure({
    layer: "UI",
    severity: "blocker",
    feature: "Authentication",
    suite: "Auth",
    links: [{ url: "https://example.com/auth-spec", name: "Auth specification" }],
  });

  const auth = new AuthPage(page);
  await auth.login("qa-user", process.env.QA_PASSWORD!); // "Login via UI" step, password masked
  await expect(page).toHaveURL(/.*dashboard/);
  await auth.logout(); // "logout" step
});
```

**When to use this pattern**: Suites with stable page objects shared across many specs — the report structure stays consistent even as tests are added, and every method call is traceable without a single manual `allure.step`.

For zero-config setup, spread `DEFAULT_CONFIG` (its reporter is `REPORTER_DESCRIPTION`, writing to `output/allure-results`) and override only what you need:

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { DEFAULT_CONFIG } from "@playwright-labs/fixture-allure";

export default defineConfig({
  ...DEFAULT_CONFIG, // ✅ allure-playwright reporter with default environment info
  testMatch: "**/*.spec.ts",
  use: { baseURL: "https://example.com" },
});
```

## Integration with Other Best Practices

- **Compose Fixtures with mergeTests and mergeExpects**: The package's `test`/`expect` are designed to be merged into your project's fixture object once — combine them with your own fixtures in a single `mergeTests` call instead of importing per-spec.
- **Use Page Object Model for Reusability and Maintainability**: `@methodDecorator` on page-object methods gives you the POM's reuse benefits plus an automatic report structure that mirrors the object's API.
- **Use test.step for Better Test Readability and Debugging**: Keep `test.step` for Trace Viewer grouping and `allure.step` (or decorators) for the Allure report — they serve different consumers and compose fine in the same test.
- **Send Test Results to Slack / Email reporters**: The generated Allure report is the artifact those notifications should link to — masked parameters keep the linked report safe to share.

Reference: [@playwright-labs/fixture-allure](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-allure)
