# @playwright-labs/fixture-testcontainers

Playwright fixture for [Testcontainers](https://testcontainers.com/) — start real Docker containers in your tests with automatic cleanup.

## Installation

```bash
npm install -D @playwright-labs/fixture-testcontainers testcontainers
```

## Usage

Import `test` from this package instead of `@playwright/test`:

```typescript
import { test } from "@playwright-labs/fixture-testcontainers";
import { Wait } from "testcontainers";

test("postgres", async ({ useContainer }) => {
  const container = await useContainer("postgres:16", {
    ports: 5432,
    environment: { POSTGRES_PASSWORD: "secret" },
    waitStrategy: Wait.forLogMessage("ready to accept connections"),
    startupTimeout: 30_000,
  });

  const port = container.getMappedPort(5432);
  // container is automatically stopped after the test
});
```

### Extending your own fixtures

```typescript
import { test as base } from "@playwright-labs/fixture-testcontainers";

export const test = base.extend<{ redisUrl: string }>({
  redisUrl: async ({ useContainer }, use) => {
    const container = await useContainer("redis:8", { ports: 6379 });
    await use(
      `redis://${container.getHost()}:${container.getMappedPort(6379)}`,
    );
  },
});
```

## Fixtures

### `useContainer(imageOrContainer, opts?)`

Starts a container from an image name or a pre-configured `GenericContainer`. The container is **automatically stopped** after the test, even if the test fails.

Each option in `opts` maps directly to a `GenericContainer.with*` method.

```typescript
// from image name with options
const container = await useContainer("postgres:16", {
  ports: 5432,
  environment: { POSTGRES_PASSWORD: "secret" },
  waitStrategy: Wait.forLogMessage("ready to accept connections"),
});

// from pre-configured GenericContainer
import { GenericContainer } from "testcontainers";
const container = await useContainer(
  new GenericContainer("postgres:16")
    .withEnvironment({ POSTGRES_PASSWORD: "secret" })
    .withExposedPorts(5432),
);
```

**Returns:** `Promise<StartedTestContainer>`

### Options (`ContainerOpts`)

| Option                   | `GenericContainer` method        | Type                                                   |
| ------------------------ | -------------------------------- | ------------------------------------------------------ |
| `ports`                  | `withExposedPorts`               | `PortWithOptionalBinding \| PortWithOptionalBinding[]` |
| `environment`            | `withEnvironment`                | `Record<string, string>`                               |
| `command`                | `withCommand`                    | `string[]`                                             |
| `entrypoint`             | `withEntrypoint`                 | `string[]`                                             |
| `name`                   | `withName`                       | `string`                                               |
| `labels`                 | `withLabels`                     | `Record<string, string>`                               |
| `platform`               | `withPlatform`                   | `string`                                               |
| `user`                   | `withUser`                       | `string`                                               |
| `hostname`               | `withHostname`                   | `string`                                               |
| `workingDir`             | `withWorkingDir`                 | `string`                                               |
| `privileged`             | `withPrivilegedMode`             | `boolean`                                              |
| `defaultLogDriver`       | `withDefaultLogDriver`           | `boolean`                                              |
| `reuse`                  | `withReuse`                      | `boolean`                                              |
| `autoRemove`             | `withAutoRemove`                 | `boolean`                                              |
| `network`                | `withNetwork`                    | `StartedNetwork`                                       |
| `networkMode`            | `withNetworkMode`                | `string`                                               |
| `networkAliases`         | `withNetworkAliases`             | `string[]`                                             |
| `extraHosts`             | `withExtraHosts`                 | `ExtraHost[]`                                          |
| `bindMounts`             | `withBindMounts`                 | `BindMount[]`                                          |
| `tmpFs`                  | `withTmpFs`                      | `Record<string, string>`                               |
| `ulimits`                | `withUlimits`                    | `Ulimits`                                              |
| `securityOpt`            | `withSecurityOpt`                | `string[]`                                             |
| `addedCapabilities`      | `withAddedCapabilities`          | `string[]`                                             |
| `droppedCapabilities`    | `withDroppedCapabilities`        | `string[]`                                             |
| `ipcMode`                | `withIpcMode`                    | `string`                                               |
| `healthCheck`            | `withHealthCheck`                | `HealthCheck`                                          |
| `waitStrategy`           | `withWaitStrategy`               | `WaitStrategy`                                         |
| `startupTimeout`         | `withStartupTimeout`             | `number` (ms)                                          |
| `pullPolicy`             | `withPullPolicy`                 | `ImagePullPolicy`                                      |
| `resourcesQuota`         | `withResourcesQuota`             | `ResourcesQuota`                                       |
| `sharedMemorySize`       | `withSharedMemorySize`           | `number` (bytes)                                       |
| `logConsumer`            | `withLogConsumer`                | `(stream: Readable) => unknown`                        |
| `copyFiles`              | `withCopyFilesToContainer`       | `FileToCopy[]`                                         |
| `copyDirectories`        | `withCopyDirectoriesToContainer` | `DirectoryToCopy[]`                                    |
| `copyContent`            | `withCopyContentToContainer`     | `ContentToCopy[]`                                      |
| `copyArchives`           | `withCopyArchivesToContainer`    | `ArchiveToCopy[]`                                      |
| `copyToContainerOptions` | `withCopyToContainerOptions`     | `CopyToContainerOptions`                               |

---

### `useContainerFromDockerFile(context, dockerfilePath?, opts?)`

Builds a Docker image from a local Dockerfile, then starts a container from it. Accepts the same `ContainerOpts` as `useContainer`.

```typescript
test("custom image", async ({ useContainerFromDockerFile }) => {
  const container = await useContainerFromDockerFile(
    "./docker",
    "Dockerfile.test",
    {
      ports: 8080,
      waitStrategy: Wait.forHttp("/health", 8080),
    },
  );
});
```

| Parameter        | Type            | Description                                                         |
| ---------------- | --------------- | ------------------------------------------------------------------- |
| `context`        | `string`        | Path to the Docker build context directory                          |
| `dockerfilePath` | `string`        | Path to the Dockerfile within the context (default: `"Dockerfile"`) |
| `opts`           | `ContainerOpts` | Container configuration (same as `useContainer`)                    |

**Returns:** `Promise<StartedTestContainer>`

---

## Multiple containers

All containers started in a test are stopped automatically in parallel after the test:

```typescript
test("multiple containers", async ({ useContainer }) => {
  const redis = await useContainer("redis:8", { ports: 6379 });
  const postgres = await useContainer("postgres:16", {
    ports: 5432,
    environment: { POSTGRES_PASSWORD: "secret" },
  });
});
```

## Explicit Resource Management (`await using`)

`StartedTestContainer` implements `Symbol.asyncDispose`, so you can use the
TC39 [Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management)
syntax to stop a container automatically when it leaves scope — no `try/finally`
or manual `.stop()` call required:

```typescript
import { GenericContainer } from "testcontainers";

test("redis", async () => {
  await using container = await new GenericContainer("redis:8")
    .withExposedPorts(6379)
    .start();

  const port = container.getMappedPort(6379);
  // container.stop() is called automatically here, even if the test throws
});
```

This is equivalent to:

```typescript
const container = await new GenericContainer("redis:8")
  .withExposedPorts(6379)
  .start();
try {
  const port = container.getMappedPort(6379);
} finally {
  await container.stop();
}
```

### When to use `await using` vs the fixture

| Scenario                                     | Recommendation                                  |
| -------------------------------------------- | ----------------------------------------------- |
| Regular test body                            | Use `useContainer` — cleanup is automatic       |
| Custom fixture or `test.beforeAll`           | `await using` gives explicit scoping            |
| Global setup / teardown script               | `await using` — no Playwright fixture available |
| Multiple containers with different lifetimes | `await using` in a block scope per container    |

### TypeScript configuration

`await using` requires TypeScript ≥ 5.2 and the `esnext.disposable` library in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "esnext.disposable"]
  }
}
```

---

## Custom matchers (`expect`)

Import `expect` from this package to get custom matchers for `StartedTestContainer`:

```typescript
import { test, expect } from "@playwright-labs/fixture-testcontainers";
```

| Matcher                                                                   | Description                                                            |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `await expect(c).toMatchContainerLogMessage(string \| RegExp, collator?)` | Logs contain the substring / match the regex                           |
| `await expect(c).toBeContainerRunning()`                                  | Container state is `running`                                           |
| `await expect(c).toBeContainerStarted()`                                  | Container status is `running`                                          |
| `await expect(c).toBeContainerStopped()`                                  | Container status is `exited`                                           |
| `await expect(c).toBeContainerHealthy()`                                  | Docker HEALTHCHECK status is `healthy`                                 |
| `await expect(c).toHaveContainerUser(user?, collator?)`                   | Container runs as the given user (exact match, or any user if omitted) |
| `await expect(c).toMatchContainerUser(string \| RegExp, collator?)`       | Container user contains the substring / matches the regex              |
| `expect(c).toHaveContainerLabel(key, value?, collator?)`                  | Container has the given label (and optional exact value)               |
| `expect(c).toBeContainerPort(port)`                                       | Port is mapped to a host port                                          |
| `expect(c).toMatchContainerPortInRange(port, range?)`                     | Mapped host port for `port` is within `range` bounds (see below)       |
| `expect(c).toHaveContainerName(string, collator?)`                        | Container name is exactly `string`                                     |
| `expect(c).toMatchContainerName(string \| RegExp, collator?)`             | Container name contains the substring / matches the regex              |
| `expect(c).toHaveContainerNetwork(networkName, collator?)`                | Container is connected to the network                                  |

All matchers support `.not`:

```typescript
await expect(container).not.toBeContainerHealthy();
expect(container).not.toBeContainerPort(3306);
```

### Port matchers

`toBeContainerPort` checks that the container port is exposed and mapped to any host port:

```typescript
expect(container).toBeContainerPort(5432);
expect(container).not.toBeContainerPort(3306);
```

`toMatchContainerPortInRange` checks that the mapped host port falls within a `PortRange` window.
Both bounds are optional — omit, pass `null`, or use `±Infinity` to leave a side unbounded:

```typescript
expect(container).toMatchContainerPortInRange(80, { min: 1024, max: 65535 });
expect(container).toMatchContainerPortInRange(80, { min: 1024 });           // no upper bound
expect(container).toMatchContainerPortInRange(80, { max: 65535 });          // no lower bound

// any mapped port — all equivalent
expect(container).toMatchContainerPortInRange(80);
expect(container).toMatchContainerPortInRange(80, {});
expect(container).toMatchContainerPortInRange(80, { min: null, max: null });
expect(container).toMatchContainerPortInRange(80, { min: -Infinity, max: Infinity });
```

### Examples

```typescript
test("container is healthy", async ({ useContainer }) => {
  const container = await useContainer("postgres:16", {
    ports: 5432,
    environment: { POSTGRES_PASSWORD: "secret" },
    healthCheck: {
      test: ["CMD-SHELL", "pg_isready -U postgres"],
      interval: 1_000,
      retries: 5,
    },
    waitStrategy: Wait.forHealthCheck(),
  });

  await expect(container).toBeContainerRunning();
  await expect(container).toBeContainerHealthy();
  expect(container).toBeContainerPort(5432);
  expect(container).toHaveContainerLabel("org.testcontainers", "true");
});

test("log message", async ({ useContainer }) => {
  const container = await useContainer("redis:8", { ports: 6379 });
  await expect(container).toMatchContainerLogMessage(
    "Ready to accept connections",
  );
  await expect(container).toMatchContainerLogMessage(/ready.*\d+/i);
});
```

### Locale-aware matching (`Intl.Collator`)

String-based matchers accept an optional `Intl.Collator` as their last argument.
This enables locale-sensitive comparisons — for example case-insensitive search
or matching text that contains accented characters from non-English locales.

```typescript
// case-insensitive (any locale)
const ci = new Intl.Collator("en", { sensitivity: "base" });

expect(container).toHaveContainerName("MY-POSTGRES", ci); // matches "my-postgres"
expect(container).toHaveContainerLabel("env", "STAGING", ci); // matches "staging"
expect(container).toHaveContainerNetwork("BRIDGE", ci); // matches "bridge"
await expect(container).toMatchContainerLogMessage("ERROR", ci); // matches "error" or "Error"
await expect(container).toHaveContainerUser("NOBODY", ci); // matches "nobody"
```

Containers running French or other non-ASCII workloads can be matched with the
appropriate locale collator:

```typescript
const fr = new Intl.Collator("fr", { sensitivity: "base" });

// container logs contain "Bonjour le monde!"
await expect(container).toMatchContainerLogMessage("bonjour", fr);
```

> When a `RegExp` is passed instead of a string the collator is ignored — use
> regex flags (e.g. `/bonjour/i`) for pattern-based case-insensitivity.

## Requirements

- `@playwright/test` >= 1.57.0
- `testcontainers` >= 10.0.0
- Docker running locally
