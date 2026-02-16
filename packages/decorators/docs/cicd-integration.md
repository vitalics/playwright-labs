# CI/CD Integration

Run decorator-based Playwright tests in CI/CD pipelines. This guide covers GitHub Actions, GitLab CI, and general CI best practices.

## Table of Contents

- [Overview](#overview)
- [GitHub Actions](#github-actions)
- [GitLab CI](#gitlab-ci)
- [General CI Configuration](#general-ci-configuration)
- [Parallel Execution](#parallel-execution)
- [Sharding](#sharding)
- [Retries](#retries)
- [Reporting](#reporting)
- [Artifacts and Screenshots](#artifacts-and-screenshots)
- [Environment Configuration](#environment-configuration)
- [Docker](#docker)
- [Best Practices](#best-practices)

---

## Overview

Decorator-based tests run with the standard Playwright test runner. No special CI configuration is needed beyond what Playwright requires. The `npx playwright test` command works identically whether tests use decorators or traditional syntax.

```bash
# Runs all tests (both decorator-based and traditional)
npx playwright test
```

---

## GitHub Actions

### Basic Setup

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run tests
        run: npx playwright test

      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### With Sharding

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run tests (shard ${{ matrix.shard }})
        run: npx playwright test --shard=${{ matrix.shard }}

      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: blob-report-${{ strategy.job-index }}
          path: blob-report/

  merge-reports:
    needs: test
    runs-on: ubuntu-latest
    if: ${{ !cancelled() }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci

      - uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true

      - name: Merge reports
        run: npx playwright merge-reports --reporter html ./all-blob-reports

      - uses: actions/upload-artifact@v4
        with:
          name: html-report
          path: playwright-report/
```

---

## GitLab CI

### Basic Setup

```yaml
# .gitlab-ci.yml
stages:
  - test

playwright-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.57.0-jammy
  script:
    - npm ci
    - npx playwright test
  artifacts:
    when: always
    paths:
      - playwright-report/
    expire_in: 7 days
```

### With Sharding

```yaml
playwright-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.57.0-jammy
  parallel: 4
  script:
    - npm ci
    - npx playwright test --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
  artifacts:
    when: always
    paths:
      - blob-report/
    expire_in: 1 day
```

---

## General CI Configuration

### Playwright Configuration for CI

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,

  // CI-specific settings
  forbidOnly: !!process.env.CI,        // Fail if .only() left in
  retries: process.env.CI ? 2 : 0,     // Retry in CI
  workers: process.env.CI ? 1 : undefined, // Control parallelism

  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : 'list',

  use: {
    trace: 'on-first-retry',           // Capture trace on retry
    screenshot: 'only-on-failure',     // Screenshots on failure
    video: 'retain-on-failure',        // Video on failure
  },
});
```

### Environment-Aware Tests

```typescript
@describe('Environment-Aware Tests')
@timeout(process.env.CI ? 60000 : 30000)  // More time in CI
class EnvironmentTests {
  @test('should work')
  @slow(
    () => !!process.env.CI,
    'CI environments are slower'
  )
  async test() {
    await this.page.goto('/');
    await expect(this.page.locator('h1')).toBeVisible();
  }
}
```

---

## Parallel Execution

### Full Parallelism

```typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,  // All tests in all files run in parallel
});
```

### Per-Suite Parallelism

```typescript
@describe('Parallel Tests', { mode: 'parallel' })
class ParallelTests {
  @test('test A') async testA() {}
  @test('test B') async testB() {}
  @test('test C') async testC() {}
}
```

### Serial Execution

For tests that must run in order:

```typescript
@describe('Serial Tests', { mode: 'serial' })
class SerialTests {
  @test('step 1: create')
  async testCreate() {}

  @test('step 2: verify')
  async testVerify() {}

  @test('step 3: cleanup')
  async testCleanup() {}
}
```

### Worker Control

```bash
# Limit workers in CI
npx playwright test --workers=2

# Single worker for debugging
npx playwright test --workers=1
```

---

## Sharding

Sharding distributes tests across multiple CI jobs.

### Configuration

```bash
# Run shard 1 of 4
npx playwright test --shard=1/4

# Run shard 2 of 4
npx playwright test --shard=2/4
```

### In playwright.config.ts

```typescript
export default defineConfig({
  shard: process.env.SHARD
    ? { current: parseInt(process.env.SHARD), total: parseInt(process.env.TOTAL_SHARDS) }
    : undefined,
});
```

### Decorator Tests and Sharding

Decorator-based tests are fully compatible with sharding. Playwright distributes test files across shards regardless of whether they use decorators or traditional syntax.

---

## Retries

### Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
});
```

### Per-Test Retry Control

Use `@tag` to mark flaky tests and configure retries:

```typescript
@describe('Flaky Tests')
class FlakyTests {
  @test('sometimes fails')
  @tag('flaky')
  @annotate('retry-reason', 'Network timing issue')
  async testFlaky() {
    await this.page.goto('/');
    await expect(this.page.locator('.dynamic')).toBeVisible();
  }
}
```

### Trace on Retry

```typescript
export default defineConfig({
  use: {
    trace: 'on-first-retry',  // Only capture trace when retrying
  },
});
```

---

## Reporting

### HTML Report

```typescript
export default defineConfig({
  reporter: [['html', { open: 'never' }]],
});
```

### Multiple Reporters

```typescript
export default defineConfig({
  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'results.xml' }],
    ['github'],  // GitHub Actions annotations
    ['list'],    // Console output
  ],
});
```

### CI-Specific Reporter Selection

```typescript
export default defineConfig({
  reporter: process.env.CI
    ? [
        ['html', { open: 'never' }],
        ['junit', { outputFile: 'results.xml' }],
        ['github'],
      ]
    : [['list']],
});
```

### Annotations in Reports

Decorators like `@tag`, `@annotate`, `@slow`, and `@fixme` automatically appear in Playwright HTML reports:

```typescript
@test('checkout flow')
@tag('smoke', 'critical')
@annotate('jira', 'PROJ-1234')
@annotate('owner', 'checkout-team')
async testCheckout() {}
```

This test will show in the report with:
- Tags: `@smoke`, `@critical`
- Annotations: `jira: PROJ-1234`, `owner: checkout-team`

---

## Artifacts and Screenshots

### Automatic Screenshots

```typescript
export default defineConfig({
  use: {
    screenshot: 'only-on-failure',  // Capture on failure
  },
});
```

### Programmatic Attachments

```typescript
@describe('Attachment Tests')
class AttachmentTests {
  @test('with screenshot')
  @attachment('page-screenshot', {
    contentType: 'image/png',
  })
  async test() {
    // Static attachment metadata; capture in @after
  }

  @afterEach()
  async captureOnFailure() {
    const info = this.testSelf.info();
    if (info.status !== info.expectedStatus) {
      const screenshot = await this.page.screenshot({ fullPage: true });
      await info.attach('failure-screenshot', {
        body: screenshot,
        contentType: 'image/png',
      });
    }
  }
}
```

### Upload Artifacts in CI

```yaml
# GitHub Actions
- uses: actions/upload-artifact@v4
  if: ${{ !cancelled() }}
  with:
    name: playwright-report
    path: |
      playwright-report/
      test-results/
    retention-days: 14
```

---

## Environment Configuration

### Using Environment Variables

```typescript
@describe('API Tests')
@use({ baseURL: process.env.API_URL || 'http://localhost:3000' })
class ApiTests {
  @test('health check')
  async test() {
    const response = await this.request.get('/health');
    expect(response.ok()).toBeTruthy();
  }
}
```

### Multi-Environment Setup

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'staging',
      use: {
        baseURL: 'https://staging.example.com',
      },
    },
    {
      name: 'production',
      use: {
        baseURL: 'https://www.example.com',
      },
    },
  ],
});
```

```bash
# Run specific project
npx playwright test --project=staging
```

### Secrets Management

```yaml
# GitHub Actions
- name: Run tests
  run: npx playwright test
  env:
    API_KEY: ${{ secrets.API_KEY }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

```typescript
@describe('Auth Tests')
class AuthTests {
  @test('login')
  async test() {
    await this.page.goto('/login');
    await this.page.fill('#password', process.env.TEST_USER_PASSWORD!);
  }
}
```

---

## Docker

### Using Playwright Docker Image

```dockerfile
FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

CMD ["npx", "playwright", "test"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  tests:
    build: .
    environment:
      - CI=true
      - BASE_URL=http://app:3000
    depends_on:
      - app

  app:
    build: ./app
    ports:
      - '3000:3000'
```

---

## Best Practices

### 1. Fail Fast on Stuck Tests

```typescript
export default defineConfig({
  timeout: 30000,             // Global timeout
  expect: { timeout: 5000 },  // Assertion timeout
});
```

### 2. Isolate Test Data

```typescript
@describe('Isolated Tests')
class IsolatedTests {
  @beforeEach()
  async createTestData() {
    // Create unique data per test run
    const uniqueId = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.testUser = await createUser(`${uniqueId}@test.com`);
  }

  @afterEach()
  async cleanupTestData() {
    if (this.testUser) {
      await deleteUser(this.testUser.id);
    }
  }
}
```

### 3. Use Tags for CI Filtering

```typescript
@test('critical path')
@tag('smoke')
async testCritical() {}

@test('edge case')
@tag('extended')
async testEdge() {}
```

```bash
# CI: Only run smoke tests for PRs
npx playwright test --grep @smoke

# Nightly: Run all tests
npx playwright test
```

### 4. Monitor Test Duration

```typescript
@describe('Performance Monitored')
class MonitoredTests {
  @test('should load dashboard under 3s')
  @timeout(5000)
  async testPerformance() {
    const start = Date.now();
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
    const duration = Date.now() - start;

    const info = this.testSelf.info();
    info.annotations.push({
      type: 'duration',
      description: `${duration}ms`,
    });
    expect(duration).toBeLessThan(3000);
  }
}
```

### 5. Cache Dependencies

```yaml
# GitHub Actions
- uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ hashFiles('package-lock.json') }}

- name: Install Playwright (uses cache)
  run: npx playwright install --with-deps
```

### 6. Run Tests in CI with Reduced Noise

```bash
# Quiet output, fail fast, no retries for local debugging
npx playwright test --reporter=dot --workers=1 --retries=0
```

---

**Related:** [Getting Started](./getting-started.md) | [Best Practices](./best-practices.md) | [Troubleshooting](./troubleshooting.md)
