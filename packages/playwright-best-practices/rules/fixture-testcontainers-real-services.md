---
title: Test Against Real Services with fixture-testcontainers
impact: MEDIUM
impactDescription: catches SQL, migration, and connection bugs that mocks hide, with automatic container cleanup after every test
tags: testcontainers, docker, integration, database, fixtures
---

## Test Against Real Services with fixture-testcontainers

**Impact: MEDIUM (catches SQL, migration, and connection bugs that mocks hide, with automatic container cleanup after every test)**

Mocks drift from reality: a stubbed database accepts any query, a fake cache ignores TTL semantics, and neither will ever tell you that your migration is broken or your connection string is wrong. The `@playwright-labs/fixture-testcontainers` package wraps [Testcontainers](https://testcontainers.com/) in Playwright fixtures — `useContainer` starts a real Docker container (PostgreSQL, MySQL, Redis, or any image) per test and **stops it automatically, even if the test fails**. `useContainerFromDockerFile` builds and starts a custom image from a local Dockerfile. The package's `expect` adds 13 custom matchers for asserting container state — health, ports, logs, labels, networks — without writing polling loops.

## When to Use

- **Use useContainer when**: Integration tests need a real database, cache, or broker — validating SQL queries, running migrations, testing cache invalidation against actual Redis
- **Use useContainerFromDockerFile when**: The service under test has its own Dockerfile and you want to test the exact image you deploy
- **Use the custom matchers when**: Asserting container readiness and state (`toBeContainerHealthy`, `toBeContainerPort`) instead of guessing with sleeps
- **Consider alternatives when**: Pure unit tests with no I/O, or CI agents without a Docker daemon — mock at the API boundary there instead
- **Required for**: Tests that would otherwise mock the persistence layer — schema changes, query rewrites, and connection handling are exactly what mocks cannot verify

## Guidelines

### Do

- Import `test` and `expect` from `@playwright-labs/fixture-testcontainers` instead of `@playwright/test` — the fixtures and matchers are pre-wired
- Always set an explicit `waitStrategy` (`Wait.forLogMessage`, `Wait.forHttp`, `Wait.forHealthCheck`) so the fixture resolves only when the service is actually ready
- Pair `healthCheck` with `Wait.forHealthCheck()` for databases, then assert `toBeContainerHealthy()` — a listening port is not proof of an initialized database
- Read the real endpoint via `container.getHost()` and `container.getMappedPort(5432)` — Docker assigns a free host port, which keeps parallel workers collision-free
- Wrap containers in typed fixtures with `base.extend` (e.g., a `redisUrl` fixture) so tests declare intent instead of repeating container setup
- Assert container configuration with the package matchers — ports, labels, name, network, user, log output — rather than re-inspecting via CLI

### Don't

- Don't mock the database in integration tests — a mock that always returns rows proves nothing about your SQL, schema, or migration scripts
- Don't start containers with a bare `new GenericContainer(...).start()` in a test body and no cleanup — the container keeps running after the test ends
- Don't pin host ports (`{ container: 5432, host: 5432 }`) — two parallel workers cannot bind the same host port; let Docker map ephemeral ports
- Don't call the async matchers without `await` (`toBeContainerHealthy()`, `toMatchContainerLogMessage(...)`) — an un-awaited assertion promise lets a failing check pass silently
- Don't assume `useContainer` resolution means "ready for queries" without a `waitStrategy` — the default wait sees the port open before PostgreSQL finishes initializing
- Don't run container tests where no Docker daemon is available — there is no automatic fallback; gate them by project or environment instead

### Tool Usage Patterns

- **Install**: `npm install -D @playwright-labs/fixture-testcontainers testcontainers`
- **Fixtures**: `useContainer(imageOrContainer, opts?)`, `useContainerFromDockerFile(context, dockerfilePath?, opts?)` — both return `Promise<StartedTestContainer>`
- **Options**: every `ContainerOpts` key maps 1:1 to a `GenericContainer.with*` method — `ports` → `withExposedPorts`, `environment` → `withEnvironment`, `healthCheck` → `withHealthCheck`, `waitStrategy` → `withWaitStrategy`, `startupTimeout` → `withStartupTimeout`, plus `command`, `name`, `labels`, `network`, `networkAliases`, `bindMounts`, `tmpFs`, `copyFiles`, `reuse`, `pullPolicy`, and more
- **Wait strategies**: `Wait.forLogMessage(...)`, `Wait.forHttp(path, port)`, `Wait.forHealthCheck()` — imported from `testcontainers`
- **Requirements**: `@playwright/test` >= 1.57.0, `testcontainers` >= 10.0.0, Docker running locally
- **The 13 custom matchers** (import `expect` from the package):

| Matcher | Async | Asserts |
| ------- | ----- | ------- |
| `toBeContainerRunning()` | yes | Container state is `running` |
| `toBeContainerStarted()` | yes | Container status is `running` |
| `toBeContainerStopped()` | yes | Container status is `exited` |
| `toBeContainerHealthy()` | yes | Docker HEALTHCHECK status is `healthy` |
| `toMatchContainerLogMessage(string \| RegExp, collator?)` | yes | Logs contain substring / match regex |
| `toHaveContainerUser(user?, collator?)` | yes | Container runs as the given user |
| `toMatchContainerUser(string \| RegExp, collator?)` | yes | Container user matches pattern |
| `toHaveContainerLabel(key, value?, collator?)` | no | Label present (optional exact value) |
| `toBeContainerPort(port)` | no | Port is mapped to a host port |
| `toMatchContainerPortInRange(port, range?)` | no | Mapped host port within `{ min, max }` bounds |
| `toHaveContainerName(string, collator?)` | no | Exact container name |
| `toMatchContainerName(string \| RegExp, collator?)` | no | Container name matches pattern |
| `toHaveContainerNetwork(networkName, collator?)` | no | Connected to the given network |

All matchers support `.not`; string matchers accept an optional `Intl.Collator` for locale-aware matching (ignored when a `RegExp` is passed — use regex flags instead).

## Edge Cases and Constraints

### Limitations

- Requires a running Docker daemon on the machine executing the tests — developers and CI agents without Docker cannot run these tests at all
- Container startup adds seconds per test, and the first run pulls images from the registry — pre-pull images in CI or control pulling via `pullPolicy`
- All containers started in one test are stopped in parallel after it — teardown time grows with container count per test
- `await using` cleanup syntax requires TypeScript ≥ 5.2 and `"lib": ["ES2022", "esnext.disposable"]` in `tsconfig.json`

### Edge Cases

1. **Port open, database not initialized**: The default wait strategy resolves when the port listens, but PostgreSQL logs `ready to accept connections` only after init — early queries fail intermittently. Use `Wait.forLogMessage("ready to accept connections")` or a `healthCheck` + `Wait.forHealthCheck()`.
2. **Parallel workers and fixed host ports**: Two workers binding host port 5432 collide on startup. Pass `ports: 5432` (container port only) and resolve the endpoint with `getMappedPort(5432)`.
3. **Containers outside a test body**: `useContainer` is test-scoped. In a custom fixture, `test.beforeAll`, or a global setup script use `await using` — `StartedTestContainer` implements `Symbol.asyncDispose`, so the container stops when the scope exits, with no `try/finally`.
4. **Non-English logs and names**: String matchers accept an `Intl.Collator` (e.g., `new Intl.Collator("fr", { sensitivity: "base" })`) for locale- and case-insensitive matching.

### What Breaks If Ignored

- **Without a wait strategy or healthcheck**: Tests race container startup — flaky `ECONNREFUSED` and "database system is starting up" errors that pass on retry and erode trust in the suite
- **Without fixture cleanup**: Leaked containers accumulate on developer machines and CI agents — stale `postgres`/`redis` containers exhaust ports and disk until `docker system prune`
- **Without real services**: Mocks drift from real SQL and cache semantics — the suite stays green while production breaks on the first real query

**Incorrect (mocked database — green tests, unverified SQL):**

```typescript
import { test, expect } from "@playwright/test";

// ❌ A hand-rolled stub that accepts any query and always returns rows
const db = {
  query: async (_sql: string) => [{ id: 1, email: "user@example.com" }],
};

test("user email shown on profile", async ({ page }) => {
  const rows = await db.query("SELEC * FORM users"); // ❌ typo'd SQL passes too
  await page.goto(`/profile/${rows[0].id}`);
  await expect(page.getByTestId("email")).toHaveText("user@example.com");
  // ❌ Nothing here touches PostgreSQL — schema, migrations, and queries unverified
});
```

**Why this fails:**
- The stub cannot reject invalid SQL, missing columns, or a failed migration — the test passes no matter how broken the data layer is
- Mock return shapes drift from the real schema over time; tests keep passing against a shape production no longer returns
- Connection handling, authentication, and startup ordering are never exercised

**Correct (real PostgreSQL container, readiness wait, auto-cleanup):**

```typescript
import { test, expect } from "@playwright-labs/fixture-testcontainers";
import { Wait } from "testcontainers";

test("user email shown on profile", async ({ useContainer, page }) => {
  const postgres = await useContainer("postgres:16", {
    ports: 5432, // ✅ container port only — Docker maps a free host port
    environment: {
      POSTGRES_USER: "test",
      POSTGRES_PASSWORD: "secret",
      POSTGRES_DB: "shop",
    },
    // ✅ Docker-level healthcheck: pg_isready every 1s, up to 5 retries
    healthCheck: {
      test: ["CMD-SHELL", "pg_isready -U test"],
      interval: 1_000,
      retries: 5,
    },
    waitStrategy: Wait.forHealthCheck(), // ✅ resolves only when healthy
    startupTimeout: 30_000,
  });

  // ✅ Assert infrastructure state with the package matchers
  await expect(postgres).toBeContainerRunning();
  await expect(postgres).toBeContainerHealthy();
  expect(postgres).toBeContainerPort(5432);

  const url = `postgres://test:secret@${postgres.getHost()}:${postgres.getMappedPort(5432)}/shop`;
  await runMigrations(url); // ✅ real migrations against a real database
  await seedUser(url, { id: 1, email: "user@example.com" });

  await page.goto("/profile/1");
  await expect(page.getByTestId("email")).toHaveText("user@example.com");
  // ✅ container stops automatically here — even if an assertion above threw
});
```

**Why this works:**
- The test fails if the SQL, schema, or migration is wrong — exactly the bugs mocks hide
- `waitStrategy: Wait.forHealthCheck()` guarantees the fixture resolves after PostgreSQL is ready, eliminating startup races
- Ephemeral port mapping via `getMappedPort` keeps parallel workers collision-free, and fixture teardown stops the container on every outcome

## Common Mistakes

### Mistake 1: No Readiness Wait — Test Races Container Startup

```typescript
import { test } from "@playwright-labs/fixture-testcontainers";

test("races startup", async ({ useContainer }) => {
  const postgres = await useContainer("postgres:16", {
    ports: 5432,
    environment: { POSTGRES_PASSWORD: "secret" },
  });
  // ❌ default wait sees a listening port, but PostgreSQL is still initializing
  await seedDatabase(postgres.getMappedPort(5432)); // flaky ECONNREFUSED
});
```

**Why this is wrong**: A listening port only proves the process bound a socket, not that the database finished initializing and accepts authenticated connections. The test passes or fails depending on machine speed — classic timing flakiness.

**How to fix**:

```typescript
import { test, expect } from "@playwright-labs/fixture-testcontainers";
import { Wait } from "testcontainers";

test("waits for readiness", async ({ useContainer }) => {
  const postgres = await useContainer("postgres:16", {
    ports: 5432,
    environment: { POSTGRES_PASSWORD: "secret" },
    // ✅ explicit readiness contract
    waitStrategy: Wait.forLogMessage("ready to accept connections"),
    startupTimeout: 30_000,
  });
  await expect(postgres).toMatchContainerLogMessage("ready to accept connections");
  await seedDatabase(postgres.getMappedPort(5432)); // deterministic
});
```

### Mistake 2: Leaking Containers with Manual start()

```typescript
import { test } from "@playwright/test";
import { GenericContainer } from "testcontainers";

test("manual container", async () => {
  const container = await new GenericContainer("redis:8")
    .withExposedPorts(6379)
    .start();
  const port = container.getMappedPort(6379);
  // ❌ test ends, container keeps running — 100 tests leave 100 stale containers
});
```

**Why this is wrong**: Nothing stops the container. Leaked containers pile up on laptops and CI agents, holding ports and disk until someone runs `docker system prune` — and subsequent runs start failing on environment state rather than code.

**How to fix**: use the fixture (automatic stop, even on failure), or `await using` when no fixture is available:

```typescript
import { test } from "@playwright-labs/fixture-testcontainers";

test("fixture cleanup", async ({ useContainer }) => {
  const redis = await useContainer("redis:8", { ports: 6379 });
  // ✅ stopped automatically after the test, pass or fail
});
```

```typescript
import { test } from "@playwright/test";
import { GenericContainer } from "testcontainers";

test("explicit scope cleanup", async () => {
  await using redis = await new GenericContainer("redis:8")
    .withExposedPorts(6379)
    .start();
  // ✅ Symbol.asyncDispose stops the container when the scope exits — no try/finally
});
```

### Mistake 3: Pinning Host Ports

```typescript
test("fixed host port", async ({ useContainer }) => {
  const postgres = await useContainer("postgres:16", {
    // ❌ every worker tries to bind host port 5432 — second worker fails to start
    ports: [{ container: 5432, host: 5432 }],
    environment: { POSTGRES_PASSWORD: "secret" },
  });
});
```

**Why this is wrong**: Fixed host ports serialize what should be parallel and break the moment two tests (or two CI jobs on one agent) use the same database image.

**How to fix**: expose the container port only and resolve the assigned host port:

```typescript
test("ephemeral host port", async ({ useContainer }) => {
  const postgres = await useContainer("postgres:16", {
    ports: 5432, // ✅ Docker assigns a free host port
    environment: { POSTGRES_PASSWORD: "secret" },
  });
  expect(postgres).toMatchContainerPortInRange(5432, { min: 1024, max: 65535 });
  const url = `postgres://postgres:secret@${postgres.getHost()}:${postgres.getMappedPort(5432)}`;
});
```

### Mistake 4: Forgetting await on Async Matchers

```typescript
test("un-awaited assertion", async ({ useContainer }) => {
  const container = await useContainer("postgres:16", {
    ports: 5432,
    environment: { POSTGRES_PASSWORD: "secret" },
  });
  // ❌ returns a Promise — the test can pass before the assertion resolves
  expect(container).toBeContainerHealthy();
});
```

**Why this is wrong**: The health assertion becomes an unhandled floating promise; a failing check may surface after the test already reported success — or crash the worker as an unhandled rejection.

**How to fix**:

```typescript
test("awaited assertion", async ({ useContainer }) => {
  const container = await useContainer("postgres:16", {
    ports: 5432,
    environment: { POSTGRES_PASSWORD: "secret" },
  });
  await expect(container).toBeContainerHealthy(); // ✅ assertion gates the test
  expect(container).toBeContainerPort(5432); // port matchers are sync — no await
});
```

## Advanced Patterns

Compose containers into typed fixtures so tests declare dependencies, not setup code:

```typescript
// fixtures/index.ts — a redisUrl fixture any test can request
import { test as base, expect } from "@playwright-labs/fixture-testcontainers";

export const test = base.extend<{ redisUrl: string }>({
  redisUrl: async ({ useContainer }, use) => {
    const container = await useContainer("redis:8", { ports: 6379 });
    await use(
      `redis://${container.getHost()}:${container.getMappedPort(6379)}`,
    );
    // ✅ container stops when the fixture tears down
  },
});
export { expect };
```

Build and run a custom image with `useContainerFromDockerFile`, waiting on an HTTP health endpoint:

```typescript
import { test, expect } from "@playwright-labs/fixture-testcontainers";
import { Wait } from "testcontainers";

test("app image from Dockerfile", async ({ useContainerFromDockerFile }) => {
  const app = await useContainerFromDockerFile("./docker", "Dockerfile.test", {
    ports: 8080,
    waitStrategy: Wait.forHttp("/health", 8080), // ✅ poll until HTTP 200
  });

  await expect(app).toBeContainerRunning();
  expect(app).toMatchContainerPortInRange(8080, { min: 1024 }); // no upper bound
});
```

Start a full stack in one test — all containers stop in parallel afterwards:

```typescript
test("cache + database stack", async ({ useContainer }) => {
  const redis = await useContainer("redis:8", { ports: 6379 });
  const postgres = await useContainer("postgres:16", {
    ports: 5432,
    environment: { POSTGRES_PASSWORD: "secret" },
    waitStrategy: Wait.forLogMessage("ready to accept connections"),
  });

  await expect(redis).toMatchContainerLogMessage("Ready to accept connections");
  await expect(postgres).toBeContainerRunning();
  // ✅ both containers are stopped in parallel after the test
});
```

**When to use this pattern**: Typed container fixtures pay off once more than a couple of tests share the same service; Dockerfile builds belong in tests that validate the deployable artifact itself; multi-container stacks are for true end-to-end flows — keep per-test container count low, since startup time is additive.

## Integration with Other Best Practices

- **Compose Fixtures with mergeTests and mergeExpects**: Merge `test` and `expect` from `fixture-testcontainers` with other `@playwright-labs/*` fixture packages so one suite combines containers, custom matchers, and other fixtures without import conflicts
- **Ensure Test Isolation for Parallel Execution**: Ephemeral port mapping makes per-test containers parallel-safe by construction — combine with test-scoped data (unique databases/schemas per test) so parallel workers never share mutable state
- **Use Auto-Waiting Instead of Manual Waits**: `waitStrategy` is the container-side equivalent of web-first assertions — declare readiness conditions (`Wait.forLogMessage`, `Wait.forHealthCheck`) instead of `setTimeout` sleeps
- **Export Test Traces and Metrics to OpenTelemetry Backends with reporter-otel**: Real containers make tests slower by design — track duration p95 trends to keep the integration suite's cost visible and catch image-pull regressions in CI
- **Scale considerations**: At 100+ container-backed tests, image pulls and startup dominate runtime — pre-pull images on CI agents, control pulling via `pullPolicy`, and reserve real containers for tests whose assertions actually need them

Reference: [@playwright-labs/fixture-testcontainers](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-testcontainers)
