---
title: "Fixture Testcontainers"
description: "API reference for @playwright-labs/fixture-testcontainers."
---

Source files: [`packages/fixture-testcontainers/src/fixture.ts`](/workspace/home/playwright-labs/packages/fixture-testcontainers/src/fixture.ts), [`packages/fixture-testcontainers/src/matchers.ts`](/workspace/home/playwright-labs/packages/fixture-testcontainers/src/matchers.ts).

## Imports

```ts
import {
  test,
  expect,
  type Fixture,
  type ContainerOpts,
  type BindMount,
  type ExtraHost,
  type HealthCheck,
  type ResourcesQuota,
} from "@playwright-labs/fixture-testcontainers";
```

## Fixture API

```ts
export type Fixture = {
  useContainer(
    imageOrContainer: GenericContainer | string,
    opts?: ContainerOpts,
  ): Promise<StartedTestContainer>;
  useContainerFromDockerFile(
    context: string,
    dockerfilePath?: string,
    opts?: ContainerOpts,
  ): Promise<StartedTestContainer>;
};
```

`ContainerOpts` mirrors `GenericContainer.with*` methods instead of introducing a custom DSL. That is why the type is broad: it covers ports, environment, commands, labels, networks, mounts, health checks, resource quotas, copied files, and startup policies.

| Option group | Examples |
|---|---|
| Connectivity | `ports`, `network`, `networkMode`, `networkAliases`, `extraHosts` |
| Runtime config | `environment`, `command`, `entrypoint`, `user`, `hostname`, `workingDir` |
| Storage and copy | `bindMounts`, `tmpFs`, `copyFiles`, `copyDirectories`, `copyContent`, `copyArchives` |
| Startup behavior | `waitStrategy`, `startupTimeout`, `pullPolicy`, `reuse`, `autoRemove` |

## Matchers

The package exports an extended `expect` with matchers defined in `matchers.ts`, including:

- `toMatchContainerLogMessage(container, expected, collator?)`
- `toBeContainerRunning(container)`
- `toBeContainerStarted(container)`
- `toBeContainerStopped(container)`
- `toBeContainerHealthy(container)`
- `toHaveContainerLabel(container, key, value?)`
- `toBeContainerPortInRange(container, port, range)`

## Example

```ts
import { test, expect } from "@playwright-labs/fixture-testcontainers";
import { Wait } from "testcontainers";

test("starts redis", async ({ useContainer }) => {
  const container = await useContainer("redis:8", {
    ports: 6379,
    waitStrategy: Wait.forLogMessage("Ready to accept connections"),
  });

  await expect(container).toBeContainerRunning();
});
```
