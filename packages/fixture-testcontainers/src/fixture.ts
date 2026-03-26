import { Readable } from "stream";

import {
  expect as baseExpect,
  test as baseTest,
  type ExpectMatcherState,
  type MatcherReturnType,
} from "@playwright/test";
import {
  CopyToContainerOptions,
  GenericContainer,
  ImagePullPolicy,
  PortWithOptionalBinding,
  StartedNetwork,
  StartedTestContainer,
  WaitStrategy,
  getContainerRuntimeClient,
} from "testcontainers";

// Types derived directly from GenericContainer method signatures so they stay
// automatically in sync with testcontainers without manual re-declaration.

export type BindMount = Parameters<GenericContainer["withBindMounts"]>[0][number];
export type BindMode = NonNullable<BindMount["mode"]>;

export type ExtraHost = Parameters<GenericContainer["withExtraHosts"]>[0][number];
export type HealthCheck = Parameters<GenericContainer["withHealthCheck"]>[0];
export type ResourcesQuota = Parameters<GenericContainer["withResourcesQuota"]>[0];
export type Ulimits = Parameters<GenericContainer["withUlimits"]>[0];

export type FileToCopy = Parameters<GenericContainer["withCopyFilesToContainer"]>[0][number];
export type DirectoryToCopy = Parameters<GenericContainer["withCopyDirectoriesToContainer"]>[0][number];
export type ContentToCopy = Parameters<GenericContainer["withCopyContentToContainer"]>[0][number];
export type ArchiveToCopy = Parameters<GenericContainer["withCopyArchivesToContainer"]>[0][number];

/**
 * Options for `useContainer` / `useContainerFromDockerFile`.
 * Each property corresponds directly to a `with*` method on `GenericContainer`.
 */
export type ContainerOpts = {
  // ── withExposedPorts ──────────────────────────────────────────────────────
  ports?: PortWithOptionalBinding | PortWithOptionalBinding[];
  // ── withEnvironment ───────────────────────────────────────────────────────
  environment?: Record<string, string>;
  // ── withCommand ───────────────────────────────────────────────────────────
  command?: string[];
  // ── withEntrypoint ────────────────────────────────────────────────────────
  entrypoint?: string[];
  // ── withName ──────────────────────────────────────────────────────────────
  name?: string;
  // ── withLabels ────────────────────────────────────────────────────────────
  labels?: Record<string, string>;
  // ── withPlatform ──────────────────────────────────────────────────────────
  platform?: string;
  // ── withUser ──────────────────────────────────────────────────────────────
  user?: string;
  // ── withHostname ──────────────────────────────────────────────────────────
  hostname?: string;
  // ── withWorkingDir ────────────────────────────────────────────────────────
  workingDir?: string;
  // ── withPrivilegedMode ────────────────────────────────────────────────────
  privileged?: boolean;
  // ── withDefaultLogDriver ──────────────────────────────────────────────────
  defaultLogDriver?: boolean;
  // ── withReuse ─────────────────────────────────────────────────────────────
  reuse?: boolean;
  // ── withAutoRemove ────────────────────────────────────────────────────────
  autoRemove?: boolean;
  // ── withNetwork ───────────────────────────────────────────────────────────
  network?: StartedNetwork;
  // ── withNetworkMode ───────────────────────────────────────────────────────
  networkMode?: string;
  // ── withNetworkAliases ────────────────────────────────────────────────────
  networkAliases?: string[];
  // ── withExtraHosts ────────────────────────────────────────────────────────
  extraHosts?: ExtraHost[];
  // ── withBindMounts ────────────────────────────────────────────────────────
  bindMounts?: BindMount[];
  // ── withTmpFs ─────────────────────────────────────────────────────────────
  tmpFs?: Record<string, string>;
  // ── withUlimits ───────────────────────────────────────────────────────────
  ulimits?: Ulimits;
  // ── withSecurityOpt ───────────────────────────────────────────────────────
  securityOpt?: string[];
  // ── withAddedCapabilities ─────────────────────────────────────────────────
  addedCapabilities?: string[];
  // ── withDroppedCapabilities ───────────────────────────────────────────────
  droppedCapabilities?: string[];
  // ── withIpcMode ───────────────────────────────────────────────────────────
  ipcMode?: string;
  // ── withHealthCheck ───────────────────────────────────────────────────────
  healthCheck?: HealthCheck;
  // ── withWaitStrategy ──────────────────────────────────────────────────────
  waitStrategy?: WaitStrategy;
  // ── withStartupTimeout ────────────────────────────────────────────────────
  startupTimeout?: number;
  // ── withPullPolicy ────────────────────────────────────────────────────────
  pullPolicy?: ImagePullPolicy;
  // ── withResourcesQuota ────────────────────────────────────────────────────
  resourcesQuota?: ResourcesQuota;
  // ── withSharedMemorySize ──────────────────────────────────────────────────
  sharedMemorySize?: number;
  // ── withLogConsumer ───────────────────────────────────────────────────────
  logConsumer?: (stream: Readable) => unknown;
  // ── withCopyFilesToContainer ──────────────────────────────────────────────
  copyFiles?: FileToCopy[];
  // ── withCopyDirectoriesToContainer ────────────────────────────────────────
  copyDirectories?: DirectoryToCopy[];
  // ── withCopyContentToContainer ────────────────────────────────────────────
  copyContent?: ContentToCopy[];
  // ── withCopyArchivesToContainer ───────────────────────────────────────────
  copyArchives?: ArchiveToCopy[];
  // ── withCopyToContainerOptions ────────────────────────────────────────────
  copyToContainerOptions?: CopyToContainerOptions;
};

function applyOpts(
  container: GenericContainer,
  opts: ContainerOpts | undefined,
): GenericContainer {
  if (opts === undefined) return container;

  if (opts.ports !== undefined) {
    const ports = Array.isArray(opts.ports) ? opts.ports : [opts.ports];
    container.withExposedPorts(...ports);
  }
  if (opts.environment !== undefined)
    container.withEnvironment(opts.environment);
  if (opts.command !== undefined) container.withCommand(opts.command);
  if (opts.entrypoint !== undefined) container.withEntrypoint(opts.entrypoint);
  if (opts.name !== undefined) container.withName(opts.name);
  if (opts.labels !== undefined) container.withLabels(opts.labels);
  if (opts.platform !== undefined) container.withPlatform(opts.platform);
  if (opts.user !== undefined) container.withUser(opts.user);
  if (opts.hostname !== undefined) container.withHostname(opts.hostname);
  if (opts.workingDir !== undefined) container.withWorkingDir(opts.workingDir);
  if (opts.privileged === true) container.withPrivilegedMode();
  if (opts.defaultLogDriver === true) container.withDefaultLogDriver();
  if (opts.reuse === true) container.withReuse();
  if (opts.autoRemove !== undefined) container.withAutoRemove(opts.autoRemove);
  if (opts.network !== undefined) container.withNetwork(opts.network);
  if (opts.networkMode !== undefined)
    container.withNetworkMode(opts.networkMode);
  if (opts.networkAliases !== undefined)
    container.withNetworkAliases(...opts.networkAliases);
  if (opts.extraHosts !== undefined) container.withExtraHosts(opts.extraHosts);
  if (opts.bindMounts !== undefined) container.withBindMounts(opts.bindMounts);
  if (opts.tmpFs !== undefined) container.withTmpFs(opts.tmpFs);
  if (opts.ulimits !== undefined) container.withUlimits(opts.ulimits);
  if (opts.securityOpt !== undefined)
    container.withSecurityOpt(...opts.securityOpt);
  if (opts.addedCapabilities !== undefined)
    container.withAddedCapabilities(...opts.addedCapabilities);
  if (opts.droppedCapabilities !== undefined)
    container.withDroppedCapabilities(...opts.droppedCapabilities);
  if (opts.ipcMode !== undefined) container.withIpcMode(opts.ipcMode);
  if (opts.healthCheck !== undefined)
    container.withHealthCheck(opts.healthCheck);
  if (opts.waitStrategy !== undefined)
    container.withWaitStrategy(opts.waitStrategy);
  if (opts.startupTimeout !== undefined)
    container.withStartupTimeout(opts.startupTimeout);
  if (opts.pullPolicy !== undefined) container.withPullPolicy(opts.pullPolicy);
  if (opts.resourcesQuota !== undefined)
    container.withResourcesQuota(opts.resourcesQuota);
  if (opts.sharedMemorySize !== undefined)
    container.withSharedMemorySize(opts.sharedMemorySize);
  if (opts.logConsumer !== undefined)
    container.withLogConsumer(opts.logConsumer);
  if (opts.copyFiles !== undefined)
    container.withCopyFilesToContainer(opts.copyFiles);
  if (opts.copyDirectories !== undefined)
    container.withCopyDirectoriesToContainer(opts.copyDirectories);
  if (opts.copyContent !== undefined)
    container.withCopyContentToContainer(opts.copyContent);
  if (opts.copyArchives !== undefined)
    container.withCopyArchivesToContainer(opts.copyArchives);
  if (opts.copyToContainerOptions !== undefined)
    container.withCopyToContainerOptions(opts.copyToContainerOptions);

  return container;
}

/**
 * Playwright fixtures for working with Testcontainers.
 * Provides utilities for starting Docker containers in tests with automatic cleanup.
 *
 * @example
 * ```typescript
 * import { test } from '@playwright-labs/fixture-testcontainers';
 * import { Wait } from 'testcontainers';
 *
 * test('postgres', async ({ useContainer }) => {
 *   const container = await useContainer('postgres:16', {
 *     ports: 5432,
 *     environment: { POSTGRES_PASSWORD: 'secret' },
 *     waitStrategy: Wait.forLogMessage('ready to accept connections'),
 *     startupTimeout: 30_000,
 *   });
 *   const port = container.getMappedPort(5432);
 * });
 * ```
 */
export type Fixture = {
  /**
   * Starts a Docker container from an image name or a pre-configured `GenericContainer`.
   * All options mirror the `with*` methods on `GenericContainer`.
   * The container is automatically stopped after the test completes.
   *
   * @param imageOrContainer - Docker image name (e.g. `"redis:8"`) or a `GenericContainer` instance
   * @param opts - Container configuration — each key corresponds to a `GenericContainer.with*` method
   * @returns A started container instance
   *
   * @example
   * ```typescript
   * test('redis', async ({ useContainer }) => {
   *   const container = await useContainer('redis:8', { ports: 6379 });
   *   const port = container.getMappedPort(6379);
   * });
   *
   * test('postgres', async ({ useContainer }) => {
   *   const container = await useContainer('postgres:16', {
   *     ports: 5432,
   *     environment: { POSTGRES_PASSWORD: 'secret' },
   *     waitStrategy: Wait.forLogMessage('ready to accept connections'),
   *     startupTimeout: 30_000,
   *   });
   * });
   * ```
   */
  useContainer(
    imageOrContainer: GenericContainer,
    opts?: ContainerOpts,
  ): Promise<StartedTestContainer>;
  useContainer(
    imageOrContainer: string,
    opts?: ContainerOpts,
  ): Promise<StartedTestContainer>;

  /**
   * Builds a Docker image from a Dockerfile and starts a container from it.
   * All options mirror the `with*` methods on `GenericContainer`.
   * The container is automatically stopped after the test completes.
   *
   * @param context - Path to the Docker build context directory
   * @param dockerfilePath - Path to the Dockerfile within the context (default: `"Dockerfile"`)
   * @param opts - Container configuration — each key corresponds to a `GenericContainer.with*` method
   * @returns A started container instance
   */
  useContainerFromDockerFile(
    context: string,
    dockerfilePath?: string,
    opts?: ContainerOpts,
  ): Promise<StartedTestContainer>;
};

export const test = baseTest.extend<Fixture>({
  useContainer: async ({}, use) => {
    const started: StartedTestContainer[] = [];

    await use(async (imageOrContainer, opts) => {
      let container: GenericContainer;

      if (typeof imageOrContainer === "string") {
        container = new GenericContainer(imageOrContainer);
      } else if (imageOrContainer instanceof GenericContainer) {
        container = imageOrContainer;
      } else {
        throw new TypeError(
          'Cannot run "useContainer": expected an image name string or a GenericContainer instance',
          {
            cause: {
              received: imageOrContainer,
              typeof: typeof imageOrContainer,
            },
          },
        );
      }

      applyOpts(container, opts);

      const startedContainer = await container.start();
      started.push(startedContainer);
      return startedContainer;
    });

    await Promise.all(started.map((c) => c.stop()));
  },

  useContainerFromDockerFile: async ({ useContainer }, use) => {
    await use(async (context, dockerfilePath, opts) => {
      const builtContainer = await GenericContainer.fromDockerfile(
        context,
        dockerfilePath,
      ).build();
      return useContainer(builtContainer, opts);
    });
  },
});
