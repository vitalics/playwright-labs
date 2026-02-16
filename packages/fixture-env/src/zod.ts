import { z, ZodType, type infer as Infer } from "zod";
import type { MinusOne } from "./types";

type Options = {
  prefix?: string;
  schema?: Record<string, ZodType>;
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
    [P in keyof S]: S[P] extends ZodType ? Infer<S[P]> : never;
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
      CI: z.string().describe("Always set to `true`."),
      /** The name of the action currently running, or the `id` of a step. */
      GITHUB_ACTION: z
        .string()
        .describe(
          "The name of the action currently running, or the `id` of a step.",
        ),
      /** The path where an action is located. This property is only supported in composite actions. */
      GITHUB_ACTION_PATH: z
        .string()
        .optional()
        .describe(
          "The path where an action is located. This property is only supported in composite actions.",
        ),
      /** For a step executing an action, this is the owner and repository name of the action. */
      GITHUB_ACTION_REPOSITORY: z
        .string()
        .optional()
        .describe(
          "For a step executing an action, this is the owner and repository name of the action.",
        ),
      /** Always set to `true` when GitHub Actions is running the workflow. */
      GITHUB_ACTIONS: z
        .string()
        .describe(
          "Always set to `true` when GitHub Actions is running the workflow.",
        ),
      /** The name of the person or app that initiated the workflow. */
      GITHUB_ACTOR: z
        .string()
        .describe("The name of the person or app that initiated the workflow."),
      /** The account ID of the person or app that triggered the initial workflow run. */
      GITHUB_ACTOR_ID: z
        .string()
        .describe(
          "The account ID of the person or app that triggered the initial workflow run.",
        ),
      /** Returns the API URL. For example: `https://api.github.com`. */
      GITHUB_API_URL: z
        .string()
        .describe("Returns the API URL. For example: `https://api.github.com`."),
      /** The name of the base ref or target branch of the pull request in a workflow run. */
      GITHUB_BASE_REF: z
        .string()
        .optional()
        .describe(
          "The name of the base ref or target branch of the pull request in a workflow run.",
        ),
      /** The path on the runner to the file that sets variables from workflow commands. */
      GITHUB_ENV: z
        .string()
        .describe(
          "The path on the runner to the file that sets variables from workflow commands.",
        ),
      /** The name of the event that triggered the workflow. */
      GITHUB_EVENT_NAME: z
        .string()
        .describe("The name of the event that triggered the workflow."),
      /** The path to the file on the runner that contains the full event webhook payload. */
      GITHUB_EVENT_PATH: z
        .string()
        .describe(
          "The path to the file on the runner that contains the full event webhook payload.",
        ),
      /** Returns the GraphQL API URL. For example: `https://api.github.com/graphql`. */
      GITHUB_GRAPHQL_URL: z
        .string()
        .describe(
          "Returns the GraphQL API URL. For example: `https://api.github.com/graphql`.",
        ),
      /** The head ref or source branch of the pull request in a workflow run. */
      GITHUB_HEAD_REF: z
        .string()
        .optional()
        .describe(
          "The head ref or source branch of the pull request in a workflow run.",
        ),
      /** The job_id of the current job. */
      GITHUB_JOB: z.string().describe("The job_id of the current job."),
      /** The path on the runner to the file that sets the current step's outputs from workflow commands. */
      GITHUB_OUTPUT: z
        .string()
        .describe(
          "The path on the runner to the file that sets the current step's outputs from workflow commands.",
        ),
      /** The path on the runner to the file that sets system `PATH` variables from workflow commands. */
      GITHUB_PATH: z
        .string()
        .describe(
          "The path on the runner to the file that sets system `PATH` variables from workflow commands.",
        ),
      /** The fully-formed ref of the branch or tag that triggered the workflow run. */
      GITHUB_REF: z
        .string()
        .optional()
        .describe(
          "The fully-formed ref of the branch or tag that triggered the workflow run.",
        ),
      /** The short ref name of the branch or tag that triggered the workflow run. */
      GITHUB_REF_NAME: z
        .string()
        .optional()
        .describe(
          "The short ref name of the branch or tag that triggered the workflow run.",
        ),
      /** `true` if branch protections or rulesets are configured for the ref that triggered the workflow run. */
      GITHUB_REF_PROTECTED: z
        .string()
        .optional()
        .describe(
          "`true` if branch protections or rulesets are configured for the ref that triggered the workflow run.",
        ),
      /** The type of ref that triggered the workflow run. Valid values are `branch` or `tag`. */
      GITHUB_REF_TYPE: z
        .string()
        .optional()
        .describe(
          "The type of ref that triggered the workflow run. Valid values are `branch` or `tag`.",
        ),
      /** The owner and repository name. For example, `octocat/Hello-World`. */
      GITHUB_REPOSITORY: z
        .string()
        .describe(
          "The owner and repository name. For example, `octocat/Hello-World`.",
        ),
      /** The ID of the repository. */
      GITHUB_REPOSITORY_ID: z
        .string()
        .describe("The ID of the repository."),
      /** The repository owner's name. */
      GITHUB_REPOSITORY_OWNER: z
        .string()
        .describe("The repository owner's name."),
      /** The repository owner's account ID. */
      GITHUB_REPOSITORY_OWNER_ID: z
        .string()
        .describe("The repository owner's account ID."),
      /** The number of days that workflow run logs and artifacts are kept. */
      GITHUB_RETENTION_DAYS: z
        .string()
        .describe(
          "The number of days that workflow run logs and artifacts are kept.",
        ),
      /** A unique number for each attempt of a particular workflow run in a repository. */
      GITHUB_RUN_ATTEMPT: z
        .string()
        .describe(
          "A unique number for each attempt of a particular workflow run in a repository.",
        ),
      /** A unique number for each workflow run within a repository. */
      GITHUB_RUN_ID: z
        .string()
        .describe("A unique number for each workflow run within a repository."),
      /** A unique number for each run of a particular workflow in a repository. */
      GITHUB_RUN_NUMBER: z
        .string()
        .describe(
          "A unique number for each run of a particular workflow in a repository.",
        ),
      /** The URL of the GitHub server. For example: `https://github.com`. */
      GITHUB_SERVER_URL: z
        .string()
        .describe(
          "The URL of the GitHub server. For example: `https://github.com`.",
        ),
      /** The commit SHA that triggered the workflow. */
      GITHUB_SHA: z
        .string()
        .describe("The commit SHA that triggered the workflow."),
      /** The path on the runner to the file that contains job summaries from workflow commands. */
      GITHUB_STEP_SUMMARY: z
        .string()
        .describe(
          "The path on the runner to the file that contains job summaries from workflow commands.",
        ),
      /** The username of the user that initiated the workflow run. */
      GITHUB_TRIGGERING_ACTOR: z
        .string()
        .describe("The username of the user that initiated the workflow run."),
      /** The name of the workflow. */
      GITHUB_WORKFLOW: z.string().describe("The name of the workflow."),
      /** The ref path to the workflow. */
      GITHUB_WORKFLOW_REF: z
        .string()
        .describe("The ref path to the workflow."),
      /** The commit SHA for the workflow file. */
      GITHUB_WORKFLOW_SHA: z
        .string()
        .describe("The commit SHA for the workflow file."),
      /** The default working directory on the runner for steps. */
      GITHUB_WORKSPACE: z
        .string()
        .describe("The default working directory on the runner for steps."),
      /** The architecture of the runner executing the job. Possible values are `X86`, `X64`, `ARM`, or `ARM64`. */
      RUNNER_ARCH: z
        .string()
        .describe(
          "The architecture of the runner executing the job. Possible values are `X86`, `X64`, `ARM`, or `ARM64`.",
        ),
      /** This is set only if debug logging is enabled, and always has the value of `1`. */
      RUNNER_DEBUG: z
        .string()
        .optional()
        .describe(
          "This is set only if debug logging is enabled, and always has the value of `1`.",
        ),
      /** The environment of the runner executing the job. Possible values are: `github-hosted` or `self-hosted`. */
      RUNNER_ENVIRONMENT: z
        .string()
        .describe(
          "The environment of the runner executing the job. Possible values are: `github-hosted` or `self-hosted`.",
        ),
      /** The name of the runner executing the job. */
      RUNNER_NAME: z
        .string()
        .describe("The name of the runner executing the job."),
      /** The operating system of the runner executing the job. Possible values are `Linux`, `Windows`, or `macOS`. */
      RUNNER_OS: z
        .string()
        .describe(
          "The operating system of the runner executing the job. Possible values are `Linux`, `Windows`, or `macOS`.",
        ),
      /** The path to a temporary directory on the runner. */
      RUNNER_TEMP: z
        .string()
        .describe("The path to a temporary directory on the runner."),
      /** The path to the directory containing preinstalled tools for GitHub-hosted runners. */
      RUNNER_TOOL_CACHE: z
        .string()
        .describe(
          "The path to the directory containing preinstalled tools for GitHub-hosted runners.",
        ),
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
      CI: z
        .string()
        .describe(
          "Available for all jobs executed in CI/CD. `true` when available.",
        ),
      /** Available for all jobs executed in CI/CD. `true` when available. */
      GITLAB_CI: z
        .string()
        .describe(
          "Available for all jobs executed in CI/CD. `true` when available.",
        ),
      /** The GitLab API v4 root URL. */
      CI_API_V4_URL: z.string().describe("The GitLab API v4 root URL."),
      /** The GitLab API GraphQL root URL. */
      CI_API_GRAPHQL_URL: z
        .string()
        .optional()
        .describe("The GitLab API GraphQL root URL."),
      /** The base URL of the GitLab instance, including protocol and port. */
      CI_SERVER_URL: z
        .string()
        .describe(
          "The base URL of the GitLab instance, including protocol and port.",
        ),
      /** The host of the GitLab instance, without protocol or port. */
      CI_SERVER_HOST: z
        .string()
        .describe("The host of the GitLab instance, without protocol or port."),
      /** The port of the GitLab instance. */
      CI_SERVER_PORT: z.string().describe("The port of the GitLab instance."),
      /** The protocol of the GitLab instance. */
      CI_SERVER_PROTOCOL: z
        .string()
        .describe("The protocol of the GitLab instance."),
      /** The fully qualified domain name (FQDN) of the instance. */
      CI_SERVER_FQDN: z
        .string()
        .optional()
        .describe("The fully qualified domain name (FQDN) of the instance."),
      /** The name of the GitLab instance. */
      CI_SERVER_NAME: z.string().describe("The name of the GitLab instance."),
      /** The revision of the GitLab instance. */
      CI_SERVER_REVISION: z
        .string()
        .describe("The revision of the GitLab instance."),
      /** The version of the GitLab instance. */
      CI_SERVER_VERSION: z
        .string()
        .describe("The version of the GitLab instance."),
      /** The major version of the GitLab instance. */
      CI_SERVER_VERSION_MAJOR: z
        .string()
        .describe("The major version of the GitLab instance."),
      /** The minor version of the GitLab instance. */
      CI_SERVER_VERSION_MINOR: z
        .string()
        .describe("The minor version of the GitLab instance."),
      /** The patch version of the GitLab instance. */
      CI_SERVER_VERSION_PATCH: z
        .string()
        .describe("The patch version of the GitLab instance."),

      // Commit & Branch Variables
      /** The commit revision the project is built for. */
      CI_COMMIT_SHA: z
        .string()
        .describe("The commit revision the project is built for."),
      /** The first eight characters of CI_COMMIT_SHA. */
      CI_COMMIT_SHORT_SHA: z
        .string()
        .describe("The first eight characters of CI_COMMIT_SHA."),
      /** The branch or tag name for which project is built. */
      CI_COMMIT_REF_NAME: z
        .string()
        .describe("The branch or tag name for which project is built."),
      /** CI_COMMIT_REF_NAME in lowercase, shortened to 63 bytes, with non-alphanumeric characters replaced with `-`. */
      CI_COMMIT_REF_SLUG: z
        .string()
        .describe(
          "CI_COMMIT_REF_NAME in lowercase, shortened to 63 bytes, with non-alphanumeric characters replaced with `-`.",
        ),
      /** `true` if the job is running for a protected ref. */
      CI_COMMIT_REF_PROTECTED: z
        .string()
        .optional()
        .describe("`true` if the job is running for a protected ref."),
      /** The branch name. Only available in branch pipelines. */
      CI_COMMIT_BRANCH: z
        .string()
        .optional()
        .describe("The branch name. Only available in branch pipelines."),
      /** The tag name. Only available in tag pipelines. */
      CI_COMMIT_TAG: z
        .string()
        .optional()
        .describe("The tag name. Only available in tag pipelines."),
      /** The full commit message. */
      CI_COMMIT_MESSAGE: z.string().describe("The full commit message."),
      /** The title of the commit (first line of the message). */
      CI_COMMIT_TITLE: z
        .string()
        .describe("The title of the commit (first line of the message)."),
      /** The description of the commit (message without first line). */
      CI_COMMIT_DESCRIPTION: z
        .string()
        .optional()
        .describe("The description of the commit (message without first line)."),
      /** The author of the commit in `Name <email>` format. */
      CI_COMMIT_AUTHOR: z
        .string()
        .describe("The author of the commit in `Name <email>` format."),
      /** The timestamp of the commit in ISO 8601 format. */
      CI_COMMIT_TIMESTAMP: z
        .string()
        .describe("The timestamp of the commit in ISO 8601 format."),
      /** The previous latest commit present on a branch or tag. */
      CI_COMMIT_BEFORE_SHA: z
        .string()
        .optional()
        .describe("The previous latest commit present on a branch or tag."),

      // Project Variables
      /** The unique ID of the current project. */
      CI_PROJECT_ID: z
        .string()
        .describe("The unique ID of the current project."),
      /** The name of the directory for the project. */
      CI_PROJECT_NAME: z
        .string()
        .describe("The name of the directory for the project."),
      /** The project namespace with the project name included. */
      CI_PROJECT_PATH: z
        .string()
        .describe("The project namespace with the project name included."),
      /** CI_PROJECT_PATH in lowercase with characters that are not `a-z` or `0-9` replaced with `-`. */
      CI_PROJECT_PATH_SLUG: z
        .string()
        .describe(
          "CI_PROJECT_PATH in lowercase with characters that are not `a-z` or `0-9` replaced with `-`.",
        ),
      /** The project namespace (username or group name). */
      CI_PROJECT_NAMESPACE: z
        .string()
        .describe("The project namespace (username or group name)."),
      /** The root namespace (top-level group or username). */
      CI_PROJECT_ROOT_NAMESPACE: z
        .string()
        .describe("The root namespace (top-level group or username)."),
      /** The HTTP(S) address of the project. */
      CI_PROJECT_URL: z
        .string()
        .describe("The HTTP(S) address of the project."),
      /** The project visibility: `internal`, `private`, or `public`. */
      CI_PROJECT_VISIBILITY: z
        .string()
        .describe(
          "The project visibility: `internal`, `private`, or `public`.",
        ),
      /** The human-readable project name. */
      CI_PROJECT_TITLE: z
        .string()
        .describe("The human-readable project name."),
      /** The project description as shown in GitLab web interface. */
      CI_PROJECT_DESCRIPTION: z
        .string()
        .optional()
        .describe("The project description as shown in GitLab web interface."),
      /** The full path the repository is cloned to. */
      CI_PROJECT_DIR: z
        .string()
        .describe("The full path the repository is cloned to."),
      /** The URL to clone the Git repository. */
      CI_REPOSITORY_URL: z
        .string()
        .describe("The URL to clone the Git repository."),
      /** The default branch name for the project. */
      CI_DEFAULT_BRANCH: z
        .string()
        .describe("The default branch name for the project."),
      /** The path to the CI/CD configuration file. */
      CI_PROJECT_CONFIG_PATH: z
        .string()
        .optional()
        .describe(
          "The path to the CI/CD configuration file (`.gitlab-ci.yml` by default).",
        ),

      // Job Variables
      /** The unique ID of the current job. */
      CI_JOB_ID: z.string().describe("The unique ID of the current job."),
      /** The name of the job. */
      CI_JOB_NAME: z.string().describe("The name of the job."),
      /** The name of the job's stage. */
      CI_JOB_STAGE: z.string().describe("The name of the job's stage."),
      /** The status of the job. */
      CI_JOB_STATUS: z
        .string()
        .optional()
        .describe("The status of the job."),
      /** A token to authenticate with certain API endpoints. */
      CI_JOB_TOKEN: z
        .string()
        .describe("A token to authenticate with certain API endpoints."),
      /** The job details URL. */
      CI_JOB_URL: z.string().describe("The job details URL."),
      /** The UTC datetime when the job started, in ISO 8601 format. */
      CI_JOB_STARTED_AT: z
        .string()
        .optional()
        .describe(
          "The UTC datetime when the job started, in ISO 8601 format.",
        ),
      /** `true` if a job was started manually. */
      CI_JOB_MANUAL: z
        .string()
        .optional()
        .describe("`true` if a job was started manually."),
      /** `true` if a job was triggered. */
      CI_JOB_TRIGGERED: z
        .string()
        .optional()
        .describe("`true` if a job was triggered."),
      /** The name of the Docker image running the job. */
      CI_JOB_IMAGE: z
        .string()
        .optional()
        .describe("The name of the Docker image running the job."),
      /** The job timeout in seconds. */
      CI_JOB_TIMEOUT: z
        .string()
        .optional()
        .describe("The job timeout in seconds."),

      // Pipeline Variables
      /** The instance-level ID of the current pipeline. */
      CI_PIPELINE_ID: z
        .string()
        .describe("The instance-level ID of the current pipeline."),
      /** The project-level IID of the current pipeline. */
      CI_PIPELINE_IID: z
        .string()
        .describe("The project-level IID of the current pipeline."),
      /** How the pipeline was triggered. */
      CI_PIPELINE_SOURCE: z
        .string()
        .describe("How the pipeline was triggered."),
      /** The URL for the pipeline details. */
      CI_PIPELINE_URL: z.string().describe("The URL for the pipeline details."),
      /** The UTC datetime when the pipeline was created, in ISO 8601 format. */
      CI_PIPELINE_CREATED_AT: z
        .string()
        .describe(
          "The UTC datetime when the pipeline was created, in ISO 8601 format.",
        ),
      /** The pipeline name. */
      CI_PIPELINE_NAME: z
        .string()
        .optional()
        .describe("The pipeline name."),

      // Runner Variables
      /** The unique ID of the runner being used. */
      CI_RUNNER_ID: z
        .string()
        .describe("The unique ID of the runner being used."),
      /** The description of the runner. */
      CI_RUNNER_DESCRIPTION: z
        .string()
        .optional()
        .describe("The description of the runner."),
      /** A comma-separated list of the runner tags. */
      CI_RUNNER_TAGS: z
        .string()
        .optional()
        .describe("A comma-separated list of the runner tags."),
      /** The version of the GitLab Runner running the job. */
      CI_RUNNER_VERSION: z
        .string()
        .describe("The version of the GitLab Runner running the job."),
      /** The revision of the GitLab Runner running the job. */
      CI_RUNNER_REVISION: z
        .string()
        .describe("The revision of the GitLab Runner running the job."),
      /** The OS/architecture of the GitLab Runner executable. */
      CI_RUNNER_EXECUTABLE_ARCH: z
        .string()
        .describe("The OS/architecture of the GitLab Runner executable."),
      /** The first 8 characters of the runner's authentication token. */
      CI_RUNNER_SHORT_TOKEN: z
        .string()
        .optional()
        .describe(
          "The first 8 characters of the runner's authentication token.",
        ),

      // Environment Variables
      /** The name of the environment for this job. */
      CI_ENVIRONMENT_NAME: z
        .string()
        .optional()
        .describe("The name of the environment for this job."),
      /** The simplified environment name. */
      CI_ENVIRONMENT_SLUG: z
        .string()
        .optional()
        .describe("The simplified environment name."),
      /** The URL of the environment for this job. */
      CI_ENVIRONMENT_URL: z
        .string()
        .optional()
        .describe("The URL of the environment for this job."),
      /** The action annotation specified for this job's environment. */
      CI_ENVIRONMENT_ACTION: z
        .string()
        .optional()
        .describe(
          "The action annotation specified for this job's environment.",
        ),
      /** The deployment tier of the environment. */
      CI_ENVIRONMENT_TIER: z
        .string()
        .optional()
        .describe("The deployment tier of the environment."),

      // Container Registry Variables
      /** The address of the GitLab Container Registry. */
      CI_REGISTRY: z
        .string()
        .optional()
        .describe("The address of the GitLab Container Registry."),
      /** The address of the project's Container Registry. */
      CI_REGISTRY_IMAGE: z
        .string()
        .optional()
        .describe("The address of the project's Container Registry."),
      /** The username to push containers to the project's Container Registry. */
      CI_REGISTRY_USER: z
        .string()
        .optional()
        .describe(
          "The username to push containers to the project's Container Registry.",
        ),
      /** The password to push containers to the project's Container Registry. */
      CI_REGISTRY_PASSWORD: z
        .string()
        .optional()
        .describe(
          "The password to push containers to the project's Container Registry.",
        ),

      // Merge Request Variables
      /** The project-level IID of the merge request. */
      CI_MERGE_REQUEST_IID: z
        .string()
        .optional()
        .describe("The project-level IID of the merge request."),
      /** The instance-level ID of the merge request. */
      CI_MERGE_REQUEST_ID: z
        .string()
        .optional()
        .describe("The instance-level ID of the merge request."),
      /** The title of the merge request. */
      CI_MERGE_REQUEST_TITLE: z
        .string()
        .optional()
        .describe("The title of the merge request."),
      /** The description of the merge request. */
      CI_MERGE_REQUEST_DESCRIPTION: z
        .string()
        .optional()
        .describe("The description of the merge request."),
      /** The source branch name of the merge request. */
      CI_MERGE_REQUEST_SOURCE_BRANCH_NAME: z
        .string()
        .optional()
        .describe("The source branch name of the merge request."),
      /** The target branch name of the merge request. */
      CI_MERGE_REQUEST_TARGET_BRANCH_NAME: z
        .string()
        .optional()
        .describe("The target branch name of the merge request."),
      /** The HEAD SHA of the source branch of the merge request. */
      CI_MERGE_REQUEST_SOURCE_BRANCH_SHA: z
        .string()
        .optional()
        .describe("The HEAD SHA of the source branch of the merge request."),
      /** The HEAD SHA of the target branch of the merge request. */
      CI_MERGE_REQUEST_TARGET_BRANCH_SHA: z
        .string()
        .optional()
        .describe("The HEAD SHA of the target branch of the merge request."),
      /** The source project ID of the merge request. */
      CI_MERGE_REQUEST_SOURCE_PROJECT_ID: z
        .string()
        .optional()
        .describe("The source project ID of the merge request."),
      /** The source project path of the merge request. */
      CI_MERGE_REQUEST_SOURCE_PROJECT_PATH: z
        .string()
        .optional()
        .describe("The source project path of the merge request."),
      /** The source project URL of the merge request. */
      CI_MERGE_REQUEST_SOURCE_PROJECT_URL: z
        .string()
        .optional()
        .describe("The source project URL of the merge request."),
      /** The target project ID of the merge request. */
      CI_MERGE_REQUEST_TARGET_PROJECT_ID: z
        .string()
        .optional()
        .describe("The target project ID of the merge request."),
      /** The target project path of the merge request. */
      CI_MERGE_REQUEST_TARGET_PROJECT_PATH: z
        .string()
        .optional()
        .describe("The target project path of the merge request."),
      /** The target project URL of the merge request. */
      CI_MERGE_REQUEST_TARGET_PROJECT_URL: z
        .string()
        .optional()
        .describe("The target project URL of the merge request."),
      /** Comma-separated label names of the merge request. */
      CI_MERGE_REQUEST_LABELS: z
        .string()
        .optional()
        .describe("Comma-separated label names of the merge request."),
      /** The milestone title of the merge request. */
      CI_MERGE_REQUEST_MILESTONE: z
        .string()
        .optional()
        .describe("The milestone title of the merge request."),
      /** The username of the assignees of the merge request. */
      CI_MERGE_REQUEST_ASSIGNEES: z
        .string()
        .optional()
        .describe("The username of the assignees of the merge request."),
      /** The event type of the merge request. */
      CI_MERGE_REQUEST_EVENT_TYPE: z
        .string()
        .optional()
        .describe("The event type of the merge request."),
      /** The diff base SHA of the merge request. */
      CI_MERGE_REQUEST_DIFF_BASE_SHA: z
        .string()
        .optional()
        .describe("The diff base SHA of the merge request."),
      /** The diff ID of the merge request. */
      CI_MERGE_REQUEST_DIFF_ID: z
        .string()
        .optional()
        .describe("The diff ID of the merge request."),
      /** `true` when the merge request's approval status is `approved`. */
      CI_MERGE_REQUEST_APPROVED: z
        .string()
        .optional()
        .describe(
          "`true` when the merge request's approval status is `approved`.",
        ),
      /** A comma-separated list of up to 4 merge requests that use the current branch as the source. */
      CI_OPEN_MERGE_REQUESTS: z
        .string()
        .optional()
        .describe(
          "A comma-separated list of up to 4 merge requests that use the current branch as the source.",
        ),

      // User Variables
      /** The numeric ID of the user who started the pipeline. */
      GITLAB_USER_ID: z
        .string()
        .describe("The numeric ID of the user who started the pipeline."),
      /** The unique username of the user who started the pipeline. */
      GITLAB_USER_LOGIN: z
        .string()
        .describe("The unique username of the user who started the pipeline."),
      /** The email of the user who started the pipeline. */
      GITLAB_USER_EMAIL: z
        .string()
        .describe("The email of the user who started the pipeline."),
      /** The display name of the user who started the pipeline. */
      GITLAB_USER_NAME: z
        .string()
        .describe("The display name of the user who started the pipeline."),

      // ChatOps Variables
      /** The Source chat channel that triggered the ChatOps command. */
      CHAT_CHANNEL: z
        .string()
        .optional()
        .describe("The Source chat channel that triggered the ChatOps command."),
      /** The additional arguments passed with the ChatOps command. */
      CHAT_INPUT: z
        .string()
        .optional()
        .describe("The additional arguments passed with the ChatOps command."),
      /** The chat service's user ID of the user who triggered the ChatOps command. */
      CHAT_USER_ID: z
        .string()
        .optional()
        .describe(
          "The chat service's user ID of the user who triggered the ChatOps command.",
        ),

      // Deployment Variables
      /** The username of the deploy token. */
      CI_DEPLOY_USER: z
        .string()
        .optional()
        .describe("The username of the deploy token."),
      /** The password of the deploy token. */
      CI_DEPLOY_PASSWORD: z
        .string()
        .optional()
        .describe("The password of the deploy token."),
      /** Available when the pipeline runs during a deploy freeze window. */
      CI_DEPLOY_FREEZE: z
        .string()
        .optional()
        .describe(
          "Available when the pipeline runs during a deploy freeze window.",
        ),

      // Feature Flags
      /** The external authorization classification label. */
      CI_PROJECT_CLASSIFICATION_LABEL: z
        .string()
        .optional()
        .describe("The external authorization classification label."),
    },
  });
