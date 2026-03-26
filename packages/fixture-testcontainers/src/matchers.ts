// ─── matchers ────────────────────────────────────────────────────────────────
import { Writable } from "stream";
import { pipeline } from "stream/promises";

import {
  ExpectMatcherState,
  MatcherReturnType,
  expect as baseExpect,
} from "@playwright/test";
import {
  getContainerRuntimeClient,
  StartedTestContainer,
} from "testcontainers";

// ─── helpers ─────────────────────────────────────────────────────────────────

async function collectLogs(container: StartedTestContainer): Promise<string> {
  const stream = await container.logs();
  const parts: string[] = [];

  const writer = new Writable({
    write(chunk: Buffer | string, _encoding, callback) {
      parts.push(typeof chunk === "string" ? chunk : chunk.toString("utf-8"));
      callback();
    },
  });

  // Docker keeps the log stream open indefinitely for running containers
  // (follow=true). Abort the pipeline after 500 ms so we capture all buffered
  // startup output without hanging.
  const windowSignal = AbortSignal.timeout(500);

  try {
    await pipeline(stream, writer, { signal: windowSignal });
  } catch (err) {
    // AbortError is expected — it means the 500 ms window elapsed normally.
    if ((err as NodeJS.ErrnoException).code !== "ABORT_ERR") throw err;
  }

  return parts.join("");
}

async function inspectContainer(container: StartedTestContainer) {
  const client = await getContainerRuntimeClient();
  const dockerContainer = client.container.getById(container.getId());
  return client.container.inspect(dockerContainer);
}

// ─── locale helpers ───────────────────────────────────────────────────────────

/**
 * Locale-aware substring search (sliding-window over `haystack`).
 * Falls back to `String.prototype.includes` when no collator is provided.
 */
function containsString(
  haystack: string,
  needle: string,
  collator?: Intl.Collator,
): boolean {
  if (!collator) return haystack.includes(needle);
  if (needle.length === 0) return true;
  if (needle.length > haystack.length) return false;
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    if (collator.compare(haystack.slice(i, i + needle.length), needle) === 0) {
      return true;
    }
  }
  return false;
}

/**
 * Locale-aware string equality.
 * Falls back to strict `===` when no collator is provided.
 */
function equalsString(
  a: string,
  b: string,
  collator?: Intl.Collator,
): boolean {
  return collator ? collator.compare(a, b) === 0 : a === b;
}

/**
 * Inclusive port range bounds for `toBeContainerPortInRange`.
 * Omit or pass `null` / `±Infinity` for a bound to leave that side unbounded.
 */
export type PortRange = {
  min?: number | null;
  max?: number | null;
};

export type Matchers = {
  /**
   * Asserts that the container logs contain the expected string or match the
   * given regular expression.
   *
   * Reads the full log output of the container via `container.logs()` and checks
   * for the presence of the expected value.
   *
   * @param received - A started container instance
   * @param expected - A substring or regular expression to match against the logs
   * @returns `MatcherReturnType` — pass when the logs contain / match `expected`
   *
   * @example
   * ```typescript
   * await expect(container).toMatchContainerLogMessage('ready to accept connections');
   * await expect(container).toMatchContainerLogMessage(/started in \d+ms/i);
   * await expect(container).not.toMatchContainerLogMessage('ERROR');
   * ```
   */
  toMatchContainerLogMessage(
    this: ExpectMatcherState,
    received: StartedTestContainer,
    expected: string | RegExp,
    collator?: Intl.Collator,
  ): Promise<MatcherReturnType>;

  /**
   * Asserts that the container is currently in the `running` state.
   *
   * Uses the Docker container runtime client to inspect `State.Running`.
   *
   * @param received - A started container instance
   * @returns `MatcherReturnType` — pass when `State.Running` is `true`
   *
   * @example
   * ```typescript
   * await expect(container).toBeContainerRunning();
   * await expect(container).not.toBeContainerRunning();
   * ```
   */
  toBeContainerRunning(
    this: ExpectMatcherState,
    received: StartedTestContainer,
  ): Promise<MatcherReturnType>;

  /**
   * Asserts that the container has been started (status is `running`).
   *
   * @param received - A started container instance
   * @returns `MatcherReturnType` — pass when `State.Status === "running"`
   *
   * @example
   * ```typescript
   * await expect(container).toBeContainerStarted();
   * await expect(container).not.toBeContainerStarted();
   * ```
   */
  toBeContainerStarted(
    this: ExpectMatcherState,
    received: StartedTestContainer,
  ): Promise<MatcherReturnType>;

  /**
   * Asserts that the container has been stopped (status is `exited`).
   *
   * Inspects `State.Status` via the Docker runtime client. The container must
   * still exist in Docker at the time of the assertion — i.e. it must **not**
   * have been removed yet.
   *
   * > **Important:** `container.stop()` removes the container by default
   * > (`remove: true`), which makes any subsequent inspect call fail.
   * > Pass `{ remove: false }` to keep the container available for inspection:
   * >
   * > ```typescript
   * > await container.stop({ remove: false });
   * > await expect(container).toBeContainerStopped();
   * > ```
   *
   * @param received - A started container instance
   * @returns `MatcherReturnType` — pass when `State.Status === "exited"`
   *
   * @example
   * ```typescript
   * await container.stop({ remove: false });
   * await expect(container).toBeContainerStopped();
   * await expect(container).not.toBeContainerStopped();
   * ```
   */
  toBeContainerStopped(
    this: ExpectMatcherState,
    received: StartedTestContainer,
  ): Promise<MatcherReturnType>;

  /**
   * Asserts that the container's Docker HEALTHCHECK reports a `healthy` status.
   *
   * Uses the Docker container runtime client to inspect `State.Health.Status`.
   * Fails immediately (non-negatable) if the image has no HEALTHCHECK configured.
   *
   * @param received - A started container instance
   * @returns `MatcherReturnType` — pass when `State.Health.Status === "healthy"`
   *
   * @example
   * ```typescript
   * await expect(container).toBeContainerHealthy();
   * await expect(container).not.toBeContainerHealthy();
   * ```
   */
  toBeContainerHealthy(
    this: ExpectMatcherState,
    received: StartedTestContainer,
  ): Promise<MatcherReturnType>;

  /**
   * Asserts that the container has the given Docker label set.
   * When `value` is provided, also asserts the exact label value.
   *
   * @param received - A started container instance
   * @param key - The label key to check
   * @param value - Optional expected label value
   * @returns `MatcherReturnType` — pass when the label (and optional value) is present
   *
   * @example
   * ```typescript
   * expect(container).toHaveContainerLabel('app');
   * expect(container).toHaveContainerLabel('env', 'test');
   * expect(container).not.toHaveContainerLabel('debug');
   * ```
   */
  toHaveContainerLabel(
    this: ExpectMatcherState,
    received: StartedTestContainer,
    key: string,
    value?: string,
    collator?: Intl.Collator,
  ): MatcherReturnType;

  /**
   * Asserts that the container has the given port exposed and mapped to a host port.
   *
   * Calls `container.getMappedPort(port)` — if it throws, the port is not mapped.
   *
   * @param received - A started container instance
   * @param port - The container port number to check
   * @returns `MatcherReturnType` — pass when the port is mapped to a host port
   *
   * @example
   * ```typescript
   * expect(container).toBeContainerPort(5432);
   * expect(container).not.toBeContainerPort(3306);
   * ```
   */
  toBeContainerPort(
    this: ExpectMatcherState,
    received: StartedTestContainer,
    port: number,
  ): MatcherReturnType;

  /**
   * Asserts that the container name is **exactly** equal to `expected`.
   *
   * The leading `/` that Docker adds to all container names is stripped
   * automatically, so you can pass the plain name you set with `withName()`.
   * For partial or pattern matching use `toMatchContainerName` instead.
   *
   * @param received - A started container instance
   * @param expected - The exact container name to match against
   * @returns `MatcherReturnType` — pass when `container.getName()` equals `expected`
   *
   * @example
   * ```typescript
   * expect(container).toHaveContainerName('my-postgres');
   * expect(container).not.toHaveContainerName('old-container');
   * ```
   */
  toHaveContainerName(
    this: ExpectMatcherState,
    received: StartedTestContainer,
    expected: string,
    collator?: Intl.Collator,
  ): MatcherReturnType;

  /**
   * Asserts that the container is connected to the given Docker network.
   *
   * @param received - A started container instance
   * @param networkName - The expected Docker network name
   * @returns `MatcherReturnType` — pass when `container.getNetworkNames()` includes `networkName`
   *
   * @example
   * ```typescript
   * expect(container).toHaveContainerNetwork('my-network');
   * expect(container).not.toHaveContainerNetwork('isolated-net');
   * ```
   */
  toHaveContainerNetwork(
    this: ExpectMatcherState,
    received: StartedTestContainer,
    networkName: string,
    collator?: Intl.Collator,
  ): MatcherReturnType;

  /**
   * Asserts that the container process runs as a specific user.
   *
   * When called **without arguments**, asserts that any non-empty user is configured.
   * When called **with a `user` argument**, asserts an exact match against `Config.User`
   * from the Docker inspect output.
   *
   * @param received - A started container instance
   * @param expectedUser - Optional exact username (or `"uid:gid"` format) to match
   * @returns `MatcherReturnType` — pass when the configured user matches `expectedUser`
   *
   * @example
   * ```typescript
   * await expect(container).toHaveContainerUser('postgres');
   * await expect(container).toHaveContainerUser('1000:1000');
   * await expect(container).toHaveContainerUser(); // any non-empty user is set
   * await expect(container).not.toHaveContainerUser('root');
   * ```
   */
  toHaveContainerUser(
    this: ExpectMatcherState,
    received: StartedTestContainer,
    expectedUser?: string,
    collator?: Intl.Collator,
  ): Promise<MatcherReturnType>;

  /**
   * Asserts that the container's configured user contains the given substring
   * or matches the given regular expression.
   *
   * Unlike `toHaveContainerUser`, which performs an exact match, this matcher
   * checks for a **partial** string match or regex. Useful when you only know
   * part of the user string (e.g. just the UID in a `"uid:gid"` format).
   *
   * @param received - A started container instance
   * @param pattern - A substring to find inside `Config.User`, or a `RegExp` to test against it
   * @returns `MatcherReturnType` — pass when the user contains / matches `pattern`
   *
   * @example
   * ```typescript
   * await expect(container).toMatchContainerUser('postgres');
   * await expect(container).toMatchContainerUser(/^postgres$/i);
   * await expect(container).toMatchContainerUser('1000');  // uid prefix in "1000:1000"
   * await expect(container).not.toMatchContainerUser('root');
   * ```
   */
  toMatchContainerUser(
    this: ExpectMatcherState,
    received: StartedTestContainer,
    pattern: string | RegExp,
    collator?: Intl.Collator,
  ): Promise<MatcherReturnType>;

  /**
   * Asserts that the mapped host port for a given container port falls within
   * an optional inclusive window `{ min?, max? }`.
   *
   * Both bounds are optional — omit, pass `null`, or use `±Infinity` to leave
   * a side unbounded.  Omitting `range` entirely checks only that the port is mapped.
   *
   * | `range`                            | Effective check                 |
   * | ---------------------------------- | ------------------------------- |
   * | `{ min: 1024, max: 65535 }`        | 1024 ≤ port ≤ 65535             |
   * | `{ min: 1024 }`                    | port ≥ 1024                     |
   * | `{ max: 1023 }`                    | port ≤ 1023                     |
   * | `{}` / `undefined` / `null` bounds | any port (only checks mapping)  |
   *
   * @param received - A started container instance
   * @param port - The container port whose mapping to check
   * @param range - Optional `{ min?, max? }` bounds (inclusive); omit for any port
   * @returns `MatcherReturnType` — pass when `getMappedPort(port)` satisfies the range
   *
   * @example
   * ```typescript
   * expect(container).toMatchContainerPortInRange(80, { min: 1024, max: 65535 });
   * expect(container).toMatchContainerPortInRange(80, { min: 1024 });  // no upper bound
   * expect(container).toMatchContainerPortInRange(80, { max: 65535 }); // no lower bound
   * expect(container).toMatchContainerPortInRange(80);                 // any mapped port
   * expect(container).not.toMatchContainerPortInRange(80, { min: 1, max: 1023 });
   * ```
   */
  toMatchContainerPortInRange(
    this: ExpectMatcherState,
    received: StartedTestContainer,
    port: number,
    range?: PortRange,
  ): MatcherReturnType;

  /**
   * Asserts that the container name contains the given substring or matches
   * the given regular expression.
   *
   * Unlike `toHaveContainerName` (which does an exact string comparison),
   * this matcher checks for a **partial** match. The leading `/` that Docker
   * adds to container names is stripped automatically before the comparison.
   *
   * @param received - A started container instance
   * @param pattern - A substring to find inside the container name, or a `RegExp` to test against it
   * @returns `MatcherReturnType` — pass when the container name contains / matches `pattern`
   *
   * @example
   * ```typescript
   * expect(container).toMatchContainerName('postgres');
   * expect(container).toMatchContainerName(/postgres-\d{4}/);
   * expect(container).not.toMatchContainerName('mysql');
   * ```
   */
  toMatchContainerName(
    this: ExpectMatcherState,
    received: StartedTestContainer,
    pattern: string | RegExp,
    collator?: Intl.Collator,
  ): MatcherReturnType;
};

export const expect = baseExpect.extend<Matchers>({
  async toMatchContainerLogMessage(
    this: ExpectMatcherState,
    received: StartedTestContainer,
    expected: string | RegExp,
    collator?: Intl.Collator,
  ): Promise<MatcherReturnType> {
    const logs = await collectLogs(received);
    const pass =
      expected instanceof RegExp
        ? expected.test(logs)
        : containsString(logs, expected, collator);

    const expectedStr =
      expected instanceof RegExp ? expected.toString() : `"${expected}"`;

    return {
      pass,
      message: () =>
        pass
          ? `Expected container logs NOT to match ${expectedStr}`
          : `Expected container logs to match ${expectedStr}\n\nLogs:\n${logs}`,
    };
  },

  async toBeContainerRunning(
    this: ExpectMatcherState,
    received: StartedTestContainer,
  ): Promise<MatcherReturnType> {
    const info = await inspectContainer(received);
    const pass = info.State.Running === true;

    return {
      pass,
      message: () =>
        pass
          ? `Expected container "${received.getName()}" NOT to be running`
          : `Expected container "${received.getName()}" to be running, but its state is "${info.State.Status}"`,
    };
  },

  async toBeContainerStarted(
    this: ExpectMatcherState,
    received: StartedTestContainer,
  ): Promise<MatcherReturnType> {
    const info = await inspectContainer(received);
    const pass = info.State.Status === "running";

    return {
      pass,
      message: () =>
        pass
          ? `Expected container "${received.getName()}" NOT to be started`
          : `Expected container "${received.getName()}" to be started, but its state is "${info.State.Status}"`,
    };
  },

  async toBeContainerStopped(
    this: ExpectMatcherState,
    received: StartedTestContainer,
  ): Promise<MatcherReturnType> {
    const info = await inspectContainer(received);
    const pass = info.State.Status === "exited";

    return {
      pass,
      message: () =>
        pass
          ? `Expected container "${received.getName()}" NOT to be stopped`
          : `Expected container "${received.getName()}" to be stopped, but its state is "${info.State.Status}"`,
    };
  },

  async toBeContainerHealthy(
    this: ExpectMatcherState,
    received: StartedTestContainer,
  ): Promise<MatcherReturnType> {
    const info = await inspectContainer(received);
    const health = info.State.Health;

    if (health === undefined) {
      return {
        pass: false,
        message: () =>
          `Expected container "${received.getName()}" to be healthy, but it has no HEALTHCHECK configured`,
      };
    }

    const pass = health.Status === "healthy";
    return {
      pass,
      message: () =>
        pass
          ? `Expected container "${received.getName()}" NOT to be healthy`
          : `Expected container "${received.getName()}" to be healthy, but health status is "${health.Status}"`,
    };
  },

  toHaveContainerLabel(
    this: ExpectMatcherState,
    received: StartedTestContainer,
    key: string,
    value?: string,
    collator?: Intl.Collator,
  ): MatcherReturnType {
    const labels = received.getLabels();
    const hasKey = key in labels;

    if (value === undefined) {
      return {
        pass: hasKey,
        message: () =>
          hasKey
            ? `Expected container not to have label "${key}"`
            : `Expected container to have label "${key}", but found labels: ${JSON.stringify(labels)}`,
      };
    }

    const pass = hasKey && equalsString(labels[key], value, collator);
    return {
      pass,
      message: () =>
        pass
          ? `Expected container not to have label "${key}" = "${value}"`
          : hasKey
            ? `Expected label "${key}" to equal "${value}", but got "${labels[key]}"`
            : `Expected container to have label "${key}", but found labels: ${JSON.stringify(labels)}`,
    };
  },

  toBeContainerPort(
    this: ExpectMatcherState,
    received: StartedTestContainer,
    port: number,
  ): MatcherReturnType {
    let mappedPort: number | undefined;
    try {
      mappedPort = received.getMappedPort(port);
    } catch {
      // getMappedPort throws when the port is not mapped
    }

    const pass = mappedPort !== undefined;
    return {
      pass,
      message: () =>
        pass
          ? `Expected container not to expose port ${port}, but it is mapped to host port ${mappedPort}`
          : `Expected container to expose port ${port}, but it is not mapped`,
    };
  },

  toHaveContainerName(
    this: ExpectMatcherState,
    received: StartedTestContainer,
    expected: string,
    collator?: Intl.Collator,
  ): MatcherReturnType {
    const rawName = received.getName();
    // Docker always prefixes container names with '/' — strip it so callers can
    // use the plain name they passed to withName() without worrying about this.
    const name = rawName.startsWith("/") ? rawName.slice(1) : rawName;
    const pass = equalsString(name, expected, collator);

    return {
      pass,
      message: () =>
        pass
          ? `Expected container name not to be "${expected}", but got "${rawName}"`
          : `Expected container name to be "${expected}", but got "${rawName}"`,
    };
  },

  toHaveContainerNetwork(
    this: ExpectMatcherState,
    received: StartedTestContainer,
    networkName: string,
    collator?: Intl.Collator,
  ): MatcherReturnType {
    const networks = received.getNetworkNames();
    const pass = networks.some((n) => equalsString(n, networkName, collator));

    return {
      pass,
      message: () =>
        pass
          ? `Expected container not to be connected to network "${networkName}"`
          : `Expected container to be connected to network "${networkName}", but found networks: ${JSON.stringify(networks)}`,
    };
  },

  async toHaveContainerUser(
    this: ExpectMatcherState,
    received: StartedTestContainer,
    expectedUser?: string,
    collator?: Intl.Collator,
  ): Promise<MatcherReturnType> {
    const info = await inspectContainer(received);
    const actualUser = info.Config.User;

    if (expectedUser === undefined) {
      const pass = actualUser !== "" && actualUser !== undefined;
      return {
        pass,
        message: () =>
          pass
            ? `Expected container not to have a user set, but it runs as "${actualUser}"`
            : `Expected container to have a user set, but no user is configured`,
      };
    }

    const pass = equalsString(actualUser, expectedUser, collator);
    return {
      pass,
      message: () =>
        pass
          ? `Expected container not to run as user "${expectedUser}"`
          : `Expected container to run as user "${expectedUser}", but got "${actualUser}"`,
    };
  },

  async toMatchContainerUser(
    this: ExpectMatcherState,
    received: StartedTestContainer,
    pattern: string | RegExp,
    collator?: Intl.Collator,
  ): Promise<MatcherReturnType> {
    const info = await inspectContainer(received);
    const actualUser = info.Config.User ?? "";
    const pass =
      pattern instanceof RegExp
        ? pattern.test(actualUser)
        : containsString(actualUser, pattern, collator);

    const patternStr =
      pattern instanceof RegExp ? pattern.toString() : `"${pattern}"`;

    return {
      pass,
      message: () =>
        pass
          ? `Expected container user "${actualUser}" NOT to match ${patternStr}`
          : `Expected container user "${actualUser}" to match ${patternStr}`,
    };
  },

  toMatchContainerPortInRange(
    this: ExpectMatcherState,
    received: StartedTestContainer,
    port: number,
    range?: PortRange,
  ): MatcherReturnType {
    let mappedPort: number | undefined;
    try {
      mappedPort = received.getMappedPort(port);
    } catch {
      // getMappedPort throws when the port is not exposed
    }

    // Resolve effective bounds: undefined / null / ±Infinity → unbounded side
    const effectiveMin =
      range?.min == null || !Number.isFinite(range.min) ? -Infinity : range.min;
    const effectiveMax =
      range?.max == null || !Number.isFinite(range.max) ? Infinity : range.max;

    const rangeLabel =
      effectiveMin === -Infinity && effectiveMax === Infinity
        ? "any"
        : effectiveMin === -Infinity
          ? `≤ ${effectiveMax}`
          : effectiveMax === Infinity
            ? `≥ ${effectiveMin}`
            : `[${effectiveMin}, ${effectiveMax}]`;

    if (mappedPort === undefined) {
      return {
        pass: false,
        message: () =>
          `Expected container port ${port} to be mapped (range ${rangeLabel}), but it is not exposed`,
      };
    }

    const pass = mappedPort >= effectiveMin && mappedPort <= effectiveMax;
    return {
      pass,
      message: () =>
        pass
          ? `Expected mapped port for ${port} (${mappedPort}) NOT to be in range ${rangeLabel}`
          : `Expected mapped port for ${port} (${mappedPort}) to be in range ${rangeLabel}`,
    };
  },

  toMatchContainerName(
    this: ExpectMatcherState,
    received: StartedTestContainer,
    pattern: string | RegExp,
    collator?: Intl.Collator,
  ): MatcherReturnType {
    const rawName = received.getName();
    const name = rawName.startsWith("/") ? rawName.slice(1) : rawName;
    const pass =
      pattern instanceof RegExp
        ? pattern.test(name)
        : containsString(name, pattern, collator);

    const patternStr =
      pattern instanceof RegExp ? pattern.toString() : `"${pattern}"`;

    return {
      pass,
      message: () =>
        pass
          ? `Expected container name "${rawName}" NOT to match ${patternStr}`
          : `Expected container name "${rawName}" to match ${patternStr}`,
    };
  },
});
