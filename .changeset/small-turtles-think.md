---
"@playwright-labs/fixture-testcontainers": major
---

Introduce `@playwright-labs/fixture-testcontainers` — a new Playwright fixture package that integrates [Testcontainers](https://testcontainers.com/) into your test suite.

## Fixtures

- **`useContainer(image, opts?)`** — starts a Docker container from an image name or a pre-configured `GenericContainer` instance; the container is automatically stopped after the test.
- **`useContainerFromDockerFile(context, dockerfilePath?, opts?)`** — builds a Docker image from a Dockerfile and starts a container from it; automatic cleanup included.

Both fixtures accept a rich `ContainerOpts` object that maps to every `GenericContainer.with*` method (ports, environment, networks, health checks, resource quotas, copy operations, etc.).

## Custom `expect` matchers

An extended `expect` is exported with container-specific matchers:

| Matcher | Description |
|---|---|
| `toMatchContainerLogMessage(pattern)` | Log output contains a substring or matches a `RegExp` |
| `toBeContainerRunning()` | `State.Running === true` |
| `toBeContainerStarted()` | `State.Status === "running"` |
| `toBeContainerStopped()` | `State.Status === "exited"` |
| `toBeContainerHealthy()` | `State.Health.Status === "healthy"` |
| `toHaveContainerLabel(key, value?)` | Container has the given Docker label (optionally with exact value) |
| `toBeContainerPort(port)` | Port is exposed and mapped to a host port |
| `toMatchContainerPortInRange(port, range?)` | Mapped host port falls within an inclusive `{ min?, max? }` window |
| `toHaveContainerName(name)` | Exact container name match (leading `/` stripped automatically) |
| `toMatchContainerName(pattern)` | Container name contains a substring or matches a `RegExp` |
| `toHaveContainerNetwork(networkName)` | Container is connected to the given Docker network |
| `toHaveContainerUser(user?)` | Exact user match (or any non-empty user when called without args) |
| `toMatchContainerUser(pattern)` | Container user contains a substring or matches a `RegExp` |

All string-based matchers accept an optional `Intl.Collator` for locale-aware comparisons.
