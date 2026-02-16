import s, { AnySchemaBuilder, SchemaBuilder } from "ajv-ts";
import type { MinusOne } from "./types";

type Options = {
  prefix?: string;
  schema?: Record<string, AnySchemaBuilder>;
  /**
   * Can be `process.env` or `import.meta.env` or any other object with string values.
   * @default `{}`
   */
  env?: Record<string, string | undefined>;
  onValidationError?: (error: Error) => void;
  extends?: Record<string, unknown>[];
  readonlyKeys?: boolean;
};

type AddPrefix<
  T extends Record<string, any>,
  Prefix extends string | undefined = undefined,
> = Prefix extends string
  ? Pretty<{
      [P in keyof T as `${Prefix}${string & P}`]: T[P];
    }>
  : Pretty<T>;

type Pretty<T> = {
  [K in keyof T]: T[K];
} & {};

type Merge<T extends Record<string, any>, T2 extends Record<string, any>> = {
  [K in keyof T | keyof T2]: K extends keyof T
    ? T[K]
    : K extends keyof T2
      ? T2[K]
      : never;
};

type Tail<T extends readonly any[]> = T extends readonly [any, ...infer Rest]
  ? Rest
  : T;

type MergeWithArray<
  T extends Record<string, any>,
  Arr extends Record<string, any>[],
  N extends number = Arr["length"],
> = N extends 0 ? T : MergeWithArray<Merge<T, Arr[0]>, Tail<Arr>, MinusOne<N>>;

type AddReadonly<
  T extends Record<string, any>,
  ShouldBeReadonly extends boolean | undefined,
> = ShouldBeReadonly extends true ? Pretty<Readonly<T>> : Pretty<T>;

export function createEnv<
  const O extends Options,
  S extends O["schema"] = O["schema"],
  const Obj extends Record<string, any> = {
    [P in keyof S]: S[P] extends SchemaBuilder<any, any, infer Res, any>
      ? Res
      : never;
  },
  const Mapped extends Record<string, any> = AddReadonly<
    AddPrefix<Obj, O["prefix"]>,
    O["readonlyKeys"]
  >,
  const MergedWithExtended = O["extends"] extends Record<string, any>[]
    ? Pretty<MergeWithArray<Mapped, O["extends"]>>
    : Pretty<Mapped>,
>(options?: O): MergedWithExtended {
  const prefix = options?.prefix ?? "";
  const schema = options?.schema ?? {};
  const env = options?.env ?? {};
  const onValidationError = options?.onValidationError;
  const extendsOptions = options?.extends ?? [];
  const readonlyKeys = options?.readonlyKeys ?? false;

  const output: Record<string, unknown> = {};

  // Process extended env objects first (prefix should not affect extends)
  for (const extendedEnv of extendsOptions) {
    for (const [key, value] of Object.entries(extendedEnv)) {
      output[key] = value;
    }
  }

  // Process schema and validate against env
  for (const [key, schemaBuilder] of Object.entries(schema)) {
    const envKey = `${prefix}${key}`;
    const envValue = env[envKey];

    // Validate the env value against the schema
    const result = schemaBuilder.safeParse(envValue);

    if (!result.success) {
      if (onValidationError) onValidationError(result.error);
    } else {
      output[envKey] = result.data;
    }
  }

  // Apply readonly if requested
  if (readonlyKeys) {
    for (const key of Object.keys(output)) {
      Object.defineProperty(output, key, {
        value: output[key],
        writable: false,
        configurable: false,
        enumerable: true,
      });
    }
  }

  return output as MergedWithExtended;
}

/**
 * Predefined environment variables from GitHub Actions.
 * @see {@link https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables Default environment variables}
 */
export const github = () =>
  createEnv({
    env: process.env as Record<string, string>,
    schema: {
      /** Always set to `true`. */
      CI: s.string().meta({ description: "Always set to `true`." }),
      /** The name of the action currently running, or the `id` of a step. */
      GITHUB_ACTION: s.string().meta({
        description:
          "The name of the action currently running, or the `id` of a step.",
      }),
      /** The path where an action is located. This property is only supported in composite actions. */
      GITHUB_ACTION_PATH: s.string().optional().meta({
        description:
          "The path where an action is located. This property is only supported in composite actions.",
      }),
      /** For a step executing an action, this is the owner and repository name of the action. */
      GITHUB_ACTION_REPOSITORY: s.string().optional().meta({
        description:
          "For a step executing an action, this is the owner and repository name of the action.",
      }),
      /** Always set to `true` when GitHub Actions is running the workflow. */
      GITHUB_ACTIONS: s.string().meta({
        description:
          "Always set to `true` when GitHub Actions is running the workflow.",
      }),
      /** The name of the person or app that initiated the workflow. */
      GITHUB_ACTOR: s.string().meta({
        description:
          "The name of the person or app that initiated the workflow.",
      }),
      /** The account ID of the person or app that triggered the initial workflow run. */
      GITHUB_ACTOR_ID: s.string().meta({
        description:
          "The account ID of the person or app that triggered the initial workflow run.",
      }),
      /** Returns the API URL. For example: `https://api.github.com`. */
      GITHUB_API_URL: s.string().meta({
        description: "Returns the API URL. For example: `https://api.github.com`.",
      }),
      /** The name of the base ref or target branch of the pull request in a workflow run. */
      GITHUB_BASE_REF: s.string().optional().meta({
        description:
          "The name of the base ref or target branch of the pull request in a workflow run.",
      }),
      /** The path on the runner to the file that sets variables from workflow commands. */
      GITHUB_ENV: s.string().meta({
        description:
          "The path on the runner to the file that sets variables from workflow commands.",
      }),
      /** The name of the event that triggered the workflow. */
      GITHUB_EVENT_NAME: s.string().meta({
        description: "The name of the event that triggered the workflow.",
      }),
      /** The path to the file on the runner that contains the full event webhook payload. */
      GITHUB_EVENT_PATH: s.string().meta({
        description:
          "The path to the file on the runner that contains the full event webhook payload.",
      }),
      /** Returns the GraphQL API URL. For example: `https://api.github.com/graphql`. */
      GITHUB_GRAPHQL_URL: s.string().meta({
        description:
          "Returns the GraphQL API URL. For example: `https://api.github.com/graphql`.",
      }),
      /** The head ref or source branch of the pull request in a workflow run. */
      GITHUB_HEAD_REF: s.string().optional().meta({
        description:
          "The head ref or source branch of the pull request in a workflow run.",
      }),
      /** The job_id of the current job. */
      GITHUB_JOB: s.string().meta({
        description: "The job_id of the current job.",
      }),
      /** The path on the runner to the file that sets the current step's outputs from workflow commands. */
      GITHUB_OUTPUT: s.string().meta({
        description:
          "The path on the runner to the file that sets the current step's outputs from workflow commands.",
      }),
      /** The path on the runner to the file that sets system `PATH` variables from workflow commands. */
      GITHUB_PATH: s.string().meta({
        description:
          "The path on the runner to the file that sets system `PATH` variables from workflow commands.",
      }),
      /** The fully-formed ref of the branch or tag that triggered the workflow run. */
      GITHUB_REF: s.string().optional().meta({
        description:
          "The fully-formed ref of the branch or tag that triggered the workflow run.",
      }),
      /** The short ref name of the branch or tag that triggered the workflow run. */
      GITHUB_REF_NAME: s.string().optional().meta({
        description:
          "The short ref name of the branch or tag that triggered the workflow run.",
      }),
      /** `true` if branch protections or rulesets are configured for the ref that triggered the workflow run. */
      GITHUB_REF_PROTECTED: s.string().optional().meta({
        description:
          "`true` if branch protections or rulesets are configured for the ref that triggered the workflow run.",
      }),
      /** The type of ref that triggered the workflow run. Valid values are `branch` or `tag`. */
      GITHUB_REF_TYPE: s.string().optional().meta({
        description:
          "The type of ref that triggered the workflow run. Valid values are `branch` or `tag`.",
      }),
      /** The owner and repository name. For example, `octocat/Hello-World`. */
      GITHUB_REPOSITORY: s.string().meta({
        description:
          "The owner and repository name. For example, `octocat/Hello-World`.",
      }),
      /** The ID of the repository. */
      GITHUB_REPOSITORY_ID: s.string().meta({
        description: "The ID of the repository.",
      }),
      /** The repository owner's name. */
      GITHUB_REPOSITORY_OWNER: s.string().meta({
        description: "The repository owner's name.",
      }),
      /** The repository owner's account ID. */
      GITHUB_REPOSITORY_OWNER_ID: s.string().meta({
        description: "The repository owner's account ID.",
      }),
      /** The number of days that workflow run logs and artifacts are kept. */
      GITHUB_RETENTION_DAYS: s.string().meta({
        description:
          "The number of days that workflow run logs and artifacts are kept.",
      }),
      /** A unique number for each attempt of a particular workflow run in a repository. */
      GITHUB_RUN_ATTEMPT: s.string().meta({
        description:
          "A unique number for each attempt of a particular workflow run in a repository.",
      }),
      /** A unique number for each workflow run within a repository. */
      GITHUB_RUN_ID: s.string().meta({
        description: "A unique number for each workflow run within a repository.",
      }),
      /** A unique number for each run of a particular workflow in a repository. */
      GITHUB_RUN_NUMBER: s.string().meta({
        description:
          "A unique number for each run of a particular workflow in a repository.",
      }),
      /** The URL of the GitHub server. For example: `https://github.com`. */
      GITHUB_SERVER_URL: s.string().meta({
        description: "The URL of the GitHub server. For example: `https://github.com`.",
      }),
      /** The commit SHA that triggered the workflow. */
      GITHUB_SHA: s.string().meta({
        description: "The commit SHA that triggered the workflow.",
      }),
      /** The path on the runner to the file that contains job summaries from workflow commands. */
      GITHUB_STEP_SUMMARY: s.string().meta({
        description:
          "The path on the runner to the file that contains job summaries from workflow commands.",
      }),
      /** The username of the user that initiated the workflow run. */
      GITHUB_TRIGGERING_ACTOR: s.string().meta({
        description: "The username of the user that initiated the workflow run.",
      }),
      /** The name of the workflow. */
      GITHUB_WORKFLOW: s.string().meta({
        description: "The name of the workflow.",
      }),
      /** The ref path to the workflow. */
      GITHUB_WORKFLOW_REF: s.string().meta({
        description: "The ref path to the workflow.",
      }),
      /** The commit SHA for the workflow file. */
      GITHUB_WORKFLOW_SHA: s.string().meta({
        description: "The commit SHA for the workflow file.",
      }),
      /** The default working directory on the runner for steps. */
      GITHUB_WORKSPACE: s.string().meta({
        description: "The default working directory on the runner for steps.",
      }),
      /** The architecture of the runner executing the job. Possible values are `X86`, `X64`, `ARM`, or `ARM64`. */
      RUNNER_ARCH: s.string().meta({
        description:
          "The architecture of the runner executing the job. Possible values are `X86`, `X64`, `ARM`, or `ARM64`.",
      }),
      /** This is set only if debug logging is enabled, and always has the value of `1`. */
      RUNNER_DEBUG: s.string().optional().meta({
        description:
          "This is set only if debug logging is enabled, and always has the value of `1`.",
      }),
      /** The environment of the runner executing the job. Possible values are: `github-hosted` or `self-hosted`. */
      RUNNER_ENVIRONMENT: s.string().meta({
        description:
          "The environment of the runner executing the job. Possible values are: `github-hosted` or `self-hosted`.",
      }),
      /** The name of the runner executing the job. */
      RUNNER_NAME: s.string().meta({
        description: "The name of the runner executing the job.",
      }),
      /** The operating system of the runner executing the job. Possible values are `Linux`, `Windows`, or `macOS`. */
      RUNNER_OS: s.string().meta({
        description:
          "The operating system of the runner executing the job. Possible values are `Linux`, `Windows`, or `macOS`.",
      }),
      /** The path to a temporary directory on the runner. */
      RUNNER_TEMP: s.string().meta({
        description: "The path to a temporary directory on the runner.",
      }),
      /** The path to the directory containing preinstalled tools for GitHub-hosted runners. */
      RUNNER_TOOL_CACHE: s.string().meta({
        description:
          "The path to the directory containing preinstalled tools for GitHub-hosted runners.",
      }),
    },
  });

/**
 * Predefined environment variables from GitLab CI/CD.
 * @see {@link https://docs.gitlab.com/ci/variables/predefined_variables/ Predefined variables reference}
 */
export const gitlab = () =>
  createEnv({
    env: process.env as Record<string, string>,
    schema: {
      // General CI/CD Variables
      /** Available for all jobs executed in CI/CD. `true` when available. */
      CI: s.string().meta({
        description:
          "Available for all jobs executed in CI/CD. `true` when available.",
      }),
      /** Available for all jobs executed in CI/CD. `true` when available. */
      GITLAB_CI: s.string().meta({
        description:
          "Available for all jobs executed in CI/CD. `true` when available.",
      }),
      /** The GitLab API v4 root URL. */
      CI_API_V4_URL: s.string().meta({
        description: "The GitLab API v4 root URL.",
      }),
      /** The GitLab API GraphQL root URL. */
      CI_API_GRAPHQL_URL: s.string().optional().meta({
        description: "The GitLab API GraphQL root URL.",
      }),
      /** The base URL of the GitLab instance, including protocol and port. */
      CI_SERVER_URL: s.string().meta({
        description:
          "The base URL of the GitLab instance, including protocol and port.",
      }),
      /** The host of the GitLab instance, without protocol or port. */
      CI_SERVER_HOST: s.string().meta({
        description: "The host of the GitLab instance, without protocol or port.",
      }),
      /** The port of the GitLab instance. */
      CI_SERVER_PORT: s.string().meta({
        description: "The port of the GitLab instance.",
      }),
      /** The protocol of the GitLab instance. */
      CI_SERVER_PROTOCOL: s.string().meta({
        description: "The protocol of the GitLab instance.",
      }),
      /** The fully qualified domain name (FQDN) of the instance. */
      CI_SERVER_FQDN: s.string().optional().meta({
        description: "The fully qualified domain name (FQDN) of the instance.",
      }),
      /** The name of the GitLab instance. */
      CI_SERVER_NAME: s.string().meta({
        description: "The name of the GitLab instance.",
      }),
      /** The revision of the GitLab instance. */
      CI_SERVER_REVISION: s.string().meta({
        description: "The revision of the GitLab instance.",
      }),
      /** The version of the GitLab instance. */
      CI_SERVER_VERSION: s.string().meta({
        description: "The version of the GitLab instance.",
      }),
      /** The major version of the GitLab instance. */
      CI_SERVER_VERSION_MAJOR: s.string().meta({
        description: "The major version of the GitLab instance.",
      }),
      /** The minor version of the GitLab instance. */
      CI_SERVER_VERSION_MINOR: s.string().meta({
        description: "The minor version of the GitLab instance.",
      }),
      /** The patch version of the GitLab instance. */
      CI_SERVER_VERSION_PATCH: s.string().meta({
        description: "The patch version of the GitLab instance.",
      }),

      // Commit & Branch Variables
      /** The commit revision the project is built for. */
      CI_COMMIT_SHA: s.string().meta({
        description: "The commit revision the project is built for.",
      }),
      /** The first eight characters of CI_COMMIT_SHA. */
      CI_COMMIT_SHORT_SHA: s.string().meta({
        description: "The first eight characters of CI_COMMIT_SHA.",
      }),
      /** The branch or tag name for which project is built. */
      CI_COMMIT_REF_NAME: s.string().meta({
        description: "The branch or tag name for which project is built.",
      }),
      /** CI_COMMIT_REF_NAME in lowercase, shortened to 63 bytes, with non-alphanumeric characters replaced with `-`. */
      CI_COMMIT_REF_SLUG: s.string().meta({
        description:
          "CI_COMMIT_REF_NAME in lowercase, shortened to 63 bytes, with non-alphanumeric characters replaced with `-`.",
      }),
      /** `true` if the job is running for a protected ref. */
      CI_COMMIT_REF_PROTECTED: s.string().optional().meta({
        description: "`true` if the job is running for a protected ref.",
      }),
      /** The branch name. Only available in branch pipelines. */
      CI_COMMIT_BRANCH: s.string().optional().meta({
        description: "The branch name. Only available in branch pipelines.",
      }),
      /** The tag name. Only available in tag pipelines. */
      CI_COMMIT_TAG: s.string().optional().meta({
        description: "The tag name. Only available in tag pipelines.",
      }),
      /** The full commit message. */
      CI_COMMIT_MESSAGE: s.string().meta({
        description: "The full commit message.",
      }),
      /** The title of the commit (first line of the message). */
      CI_COMMIT_TITLE: s.string().meta({
        description: "The title of the commit (first line of the message).",
      }),
      /** The description of the commit (message without first line). */
      CI_COMMIT_DESCRIPTION: s.string().optional().meta({
        description:
          "The description of the commit (message without first line).",
      }),
      /** The author of the commit in `Name <email>` format. */
      CI_COMMIT_AUTHOR: s.string().meta({
        description: "The author of the commit in `Name <email>` format.",
      }),
      /** The timestamp of the commit in ISO 8601 format. */
      CI_COMMIT_TIMESTAMP: s.string().meta({
        description: "The timestamp of the commit in ISO 8601 format.",
      }),
      /** The previous latest commit present on a branch or tag. */
      CI_COMMIT_BEFORE_SHA: s.string().optional().meta({
        description:
          "The previous latest commit present on a branch or tag.",
      }),

      // Project Variables
      /** The unique ID of the current project. */
      CI_PROJECT_ID: s.string().meta({
        description: "The unique ID of the current project.",
      }),
      /** The name of the directory for the project. */
      CI_PROJECT_NAME: s.string().meta({
        description: "The name of the directory for the project.",
      }),
      /** The project namespace with the project name included. */
      CI_PROJECT_PATH: s.string().meta({
        description: "The project namespace with the project name included.",
      }),
      /** CI_PROJECT_PATH in lowercase with characters that are not `a-z` or `0-9` replaced with `-`. */
      CI_PROJECT_PATH_SLUG: s.string().meta({
        description:
          "CI_PROJECT_PATH in lowercase with characters that are not `a-z` or `0-9` replaced with `-`.",
      }),
      /** The project namespace (username or group name). */
      CI_PROJECT_NAMESPACE: s.string().meta({
        description: "The project namespace (username or group name).",
      }),
      /** The root namespace (top-level group or username). */
      CI_PROJECT_ROOT_NAMESPACE: s.string().meta({
        description: "The root namespace (top-level group or username).",
      }),
      /** The HTTP(S) address of the project. */
      CI_PROJECT_URL: s.string().meta({
        description: "The HTTP(S) address of the project.",
      }),
      /** The project visibility: `internal`, `private`, or `public`. */
      CI_PROJECT_VISIBILITY: s.string().meta({
        description:
          "The project visibility: `internal`, `private`, or `public`.",
      }),
      /** The human-readable project name. */
      CI_PROJECT_TITLE: s.string().meta({
        description: "The human-readable project name.",
      }),
      /** The project description as shown in GitLab web interface. */
      CI_PROJECT_DESCRIPTION: s.string().optional().meta({
        description: "The project description as shown in GitLab web interface.",
      }),
      /** The full path the repository is cloned to. */
      CI_PROJECT_DIR: s.string().meta({
        description: "The full path the repository is cloned to.",
      }),
      /** The URL to clone the Git repository. */
      CI_REPOSITORY_URL: s.string().meta({
        description: "The URL to clone the Git repository.",
      }),
      /** The default branch name for the project. */
      CI_DEFAULT_BRANCH: s.string().meta({
        description: "The default branch name for the project.",
      }),
      /** The configured timeout for the project as a human-readable string. */
      CI_PROJECT_CONFIG_PATH: s.string().optional().meta({
        description:
          "The path to the CI/CD configuration file (`.gitlab-ci.yml` by default).",
      }),

      // Job Variables
      /** The unique ID of the current job. */
      CI_JOB_ID: s.string().meta({
        description: "The unique ID of the current job.",
      }),
      /** The name of the job. */
      CI_JOB_NAME: s.string().meta({
        description: "The name of the job.",
      }),
      /** The name of the job's stage. */
      CI_JOB_STAGE: s.string().meta({
        description: "The name of the job's stage.",
      }),
      /** The status of the job. */
      CI_JOB_STATUS: s.string().optional().meta({
        description: "The status of the job.",
      }),
      /** A token to authenticate with certain API endpoints. */
      CI_JOB_TOKEN: s.string().meta({
        description: "A token to authenticate with certain API endpoints.",
      }),
      /** The job details URL. */
      CI_JOB_URL: s.string().meta({
        description: "The job details URL.",
      }),
      /** The UTC datetime when the job started, in ISO 8601 format. */
      CI_JOB_STARTED_AT: s.string().optional().meta({
        description: "The UTC datetime when the job started, in ISO 8601 format.",
      }),
      /** `true` if a job was started manually. */
      CI_JOB_MANUAL: s.string().optional().meta({
        description: "`true` if a job was started manually.",
      }),
      /** `true` if a job was triggered. */
      CI_JOB_TRIGGERED: s.string().optional().meta({
        description: "`true` if a job was triggered.",
      }),
      /** The name of the Docker image running the job. */
      CI_JOB_IMAGE: s.string().optional().meta({
        description: "The name of the Docker image running the job.",
      }),
      /** The job timeout in seconds. */
      CI_JOB_TIMEOUT: s.string().optional().meta({
        description: "The job timeout in seconds.",
      }),

      // Pipeline Variables
      /** The instance-level ID of the current pipeline. */
      CI_PIPELINE_ID: s.string().meta({
        description: "The instance-level ID of the current pipeline.",
      }),
      /** The project-level IID of the current pipeline. */
      CI_PIPELINE_IID: s.string().meta({
        description: "The project-level IID of the current pipeline.",
      }),
      /** How the pipeline was triggered. */
      CI_PIPELINE_SOURCE: s.string().meta({
        description: "How the pipeline was triggered.",
      }),
      /** The URL for the pipeline details. */
      CI_PIPELINE_URL: s.string().meta({
        description: "The URL for the pipeline details.",
      }),
      /** The UTC datetime when the pipeline was created, in ISO 8601 format. */
      CI_PIPELINE_CREATED_AT: s.string().meta({
        description:
          "The UTC datetime when the pipeline was created, in ISO 8601 format.",
      }),
      /** The pipeline name. */
      CI_PIPELINE_NAME: s.string().optional().meta({
        description: "The pipeline name.",
      }),

      // Runner Variables
      /** The unique ID of the runner being used. */
      CI_RUNNER_ID: s.string().meta({
        description: "The unique ID of the runner being used.",
      }),
      /** The description of the runner. */
      CI_RUNNER_DESCRIPTION: s.string().optional().meta({
        description: "The description of the runner.",
      }),
      /** A comma-separated list of the runner tags. */
      CI_RUNNER_TAGS: s.string().optional().meta({
        description: "A comma-separated list of the runner tags.",
      }),
      /** The version of the GitLab Runner running the job. */
      CI_RUNNER_VERSION: s.string().meta({
        description: "The version of the GitLab Runner running the job.",
      }),
      /** The revision of the GitLab Runner running the job. */
      CI_RUNNER_REVISION: s.string().meta({
        description: "The revision of the GitLab Runner running the job.",
      }),
      /** The OS/architecture of the GitLab Runner executable. */
      CI_RUNNER_EXECUTABLE_ARCH: s.string().meta({
        description: "The OS/architecture of the GitLab Runner executable.",
      }),
      /** The name of the machine executing the job. */
      CI_RUNNER_SHORT_TOKEN: s.string().optional().meta({
        description: "The first 8 characters of the runner's authentication token.",
      }),

      // Environment Variables
      /** The name of the environment for this job. */
      CI_ENVIRONMENT_NAME: s.string().optional().meta({
        description: "The name of the environment for this job.",
      }),
      /** The simplified environment name. */
      CI_ENVIRONMENT_SLUG: s.string().optional().meta({
        description: "The simplified environment name.",
      }),
      /** The URL of the environment for this job. */
      CI_ENVIRONMENT_URL: s.string().optional().meta({
        description: "The URL of the environment for this job.",
      }),
      /** The action annotation specified for this job's environment. */
      CI_ENVIRONMENT_ACTION: s.string().optional().meta({
        description:
          "The action annotation specified for this job's environment.",
      }),
      /** The deployment tier of the environment. */
      CI_ENVIRONMENT_TIER: s.string().optional().meta({
        description: "The deployment tier of the environment.",
      }),

      // Container Registry Variables
      /** The address of the GitLab Container Registry. */
      CI_REGISTRY: s.string().optional().meta({
        description: "The address of the GitLab Container Registry.",
      }),
      /** The address of the project's Container Registry. */
      CI_REGISTRY_IMAGE: s.string().optional().meta({
        description: "The address of the project's Container Registry.",
      }),
      /** The username to push containers to the project's Container Registry. */
      CI_REGISTRY_USER: s.string().optional().meta({
        description:
          "The username to push containers to the project's Container Registry.",
      }),
      /** The password to push containers to the project's Container Registry. */
      CI_REGISTRY_PASSWORD: s.string().optional().meta({
        description:
          "The password to push containers to the project's Container Registry.",
      }),

      // Merge Request Variables
      /** The project-level IID of the merge request. */
      CI_MERGE_REQUEST_IID: s.string().optional().meta({
        description: "The project-level IID of the merge request.",
      }),
      /** The instance-level ID of the merge request. */
      CI_MERGE_REQUEST_ID: s.string().optional().meta({
        description: "The instance-level ID of the merge request.",
      }),
      /** The title of the merge request. */
      CI_MERGE_REQUEST_TITLE: s.string().optional().meta({
        description: "The title of the merge request.",
      }),
      /** The description of the merge request. */
      CI_MERGE_REQUEST_DESCRIPTION: s.string().optional().meta({
        description: "The description of the merge request.",
      }),
      /** The source branch name of the merge request. */
      CI_MERGE_REQUEST_SOURCE_BRANCH_NAME: s.string().optional().meta({
        description: "The source branch name of the merge request.",
      }),
      /** The target branch name of the merge request. */
      CI_MERGE_REQUEST_TARGET_BRANCH_NAME: s.string().optional().meta({
        description: "The target branch name of the merge request.",
      }),
      /** The HEAD SHA of the source branch of the merge request. */
      CI_MERGE_REQUEST_SOURCE_BRANCH_SHA: s.string().optional().meta({
        description: "The HEAD SHA of the source branch of the merge request.",
      }),
      /** The HEAD SHA of the target branch of the merge request. */
      CI_MERGE_REQUEST_TARGET_BRANCH_SHA: s.string().optional().meta({
        description: "The HEAD SHA of the target branch of the merge request.",
      }),
      /** The source project ID of the merge request. */
      CI_MERGE_REQUEST_SOURCE_PROJECT_ID: s.string().optional().meta({
        description: "The source project ID of the merge request.",
      }),
      /** The source project path of the merge request. */
      CI_MERGE_REQUEST_SOURCE_PROJECT_PATH: s.string().optional().meta({
        description: "The source project path of the merge request.",
      }),
      /** The source project URL of the merge request. */
      CI_MERGE_REQUEST_SOURCE_PROJECT_URL: s.string().optional().meta({
        description: "The source project URL of the merge request.",
      }),
      /** The target project ID of the merge request. */
      CI_MERGE_REQUEST_TARGET_PROJECT_ID: s.string().optional().meta({
        description: "The target project ID of the merge request.",
      }),
      /** The target project path of the merge request. */
      CI_MERGE_REQUEST_TARGET_PROJECT_PATH: s.string().optional().meta({
        description: "The target project path of the merge request.",
      }),
      /** The target project URL of the merge request. */
      CI_MERGE_REQUEST_TARGET_PROJECT_URL: s.string().optional().meta({
        description: "The target project URL of the merge request.",
      }),
      /** Comma-separated label names of the merge request. */
      CI_MERGE_REQUEST_LABELS: s.string().optional().meta({
        description: "Comma-separated label names of the merge request.",
      }),
      /** The milestone title of the merge request. */
      CI_MERGE_REQUEST_MILESTONE: s.string().optional().meta({
        description: "The milestone title of the merge request.",
      }),
      /** The username of the assignees of the merge request. */
      CI_MERGE_REQUEST_ASSIGNEES: s.string().optional().meta({
        description: "The username of the assignees of the merge request.",
      }),
      /** The event type of the merge request. */
      CI_MERGE_REQUEST_EVENT_TYPE: s.string().optional().meta({
        description: "The event type of the merge request.",
      }),
      /** The diff base SHA of the merge request. */
      CI_MERGE_REQUEST_DIFF_BASE_SHA: s.string().optional().meta({
        description: "The diff base SHA of the merge request.",
      }),
      /** The diff ID of the merge request. */
      CI_MERGE_REQUEST_DIFF_ID: s.string().optional().meta({
        description: "The diff ID of the merge request.",
      }),
      /** `true` when the merge request's approval status is `approved`. */
      CI_MERGE_REQUEST_APPROVED: s.string().optional().meta({
        description:
          "`true` when the merge request's approval status is `approved`.",
      }),
      /** `true` when the pipeline is a merge request pipeline. */
      CI_OPEN_MERGE_REQUESTS: s.string().optional().meta({
        description:
          "A comma-separated list of up to 4 merge requests that use the current branch as the source.",
      }),

      // User Variables
      /** The numeric ID of the user who started the pipeline. */
      GITLAB_USER_ID: s.string().meta({
        description: "The numeric ID of the user who started the pipeline.",
      }),
      /** The unique username of the user who started the pipeline. */
      GITLAB_USER_LOGIN: s.string().meta({
        description:
          "The unique username of the user who started the pipeline.",
      }),
      /** The email of the user who started the pipeline. */
      GITLAB_USER_EMAIL: s.string().meta({
        description: "The email of the user who started the pipeline.",
      }),
      /** The display name of the user who started the pipeline. */
      GITLAB_USER_NAME: s.string().meta({
        description: "The display name of the user who started the pipeline.",
      }),

      // ChatOps Variables
      /** The Source chat channel that triggered the ChatOps command. */
      CHAT_CHANNEL: s.string().optional().meta({
        description:
          "The Source chat channel that triggered the ChatOps command.",
      }),
      /** The additional arguments passed with the ChatOps command. */
      CHAT_INPUT: s.string().optional().meta({
        description:
          "The additional arguments passed with the ChatOps command.",
      }),
      /** The chat service's user ID of the user who triggered the ChatOps command. */
      CHAT_USER_ID: s.string().optional().meta({
        description:
          "The chat service's user ID of the user who triggered the ChatOps command.",
      }),

      // Deployment Variables
      /** The name of the deploy token. */
      CI_DEPLOY_USER: s.string().optional().meta({
        description: "The username of the deploy token.",
      }),
      /** The password of the deploy token. */
      CI_DEPLOY_PASSWORD: s.string().optional().meta({
        description: "The password of the deploy token.",
      }),
      /** `true` for jobs that are deploying to the production environment. */
      CI_DEPLOY_FREEZE: s.string().optional().meta({
        description:
          "Available when the pipeline runs during a deploy freeze window.",
      }),

      // Feature Flags
      /** `true` if feature flags are available for the project. */
      CI_PROJECT_CLASSIFICATION_LABEL: s.string().optional().meta({
        description: "The external authorization classification label.",
      }),
    },
  });
