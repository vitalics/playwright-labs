import os from "node:os";
import {
  type ReporterDescription,
  type PlaywrightTestConfig,
} from "@playwright/test";

/** base environment information that will be included in the report. */
export const ENVIRONMENT_INFO = Object.freeze({
  os_platform: os.platform(),
  os_release: os.release(),
  os_version: os.version(),
  parallelism: os.availableParallelism().toString(),
  node_version: process.version,
} as const satisfies Record<string, string>);

type Options = {
  /**
   * Whether to include detailed information in the report.
   * @default true
   */
  detail?: boolean;
  /**
   * The folder where the report will be saved.
   * @default "output/allure-results"
   */
  outputFolder?: string;
  /**
   * The folder where the report will be saved.
   * @default "output/allure-results"
   */
  resultsDir?: string;
  /**
   * The Environment information to be included in the report.
   * @default `os_platform`, `os_release`, `os_version`, `parallelism`, `node_version`
   */
  environmentInfo?: Record<string, string>;
};
/**
 * Creates a reporter description for allure-playwright with base os information.
 * @example
 * import { defineConfig } from '@playwright/test';
 * import { makeReporterDescription } from "@playwright-labs/packages/fixture-allure";
 *
 * defineConfig({
 *   reporter: [
 * ['json', { outputFile: 'test-results.json' }], // JSON reporter
 * makeReporterDescription({
 *   outputFolder: 'output/allure-results',
 *   resultsDir: 'output/allure-results',
 *   environmentInfo: {
 *     'OS Platform': os.platform(),
 *     'OS Release': os.release(),
 *     'OS Version': os.version(),
 *     'Parallelism': process.env.PLAYWRIGHT_WORKERS || '1',
 *     'Node Version': process.version,
 *     },
 *   })
 *  ]
 * })
 */
export function makeReporterDescription(
  options: Options = {
    detail: true,
    outputFolder: "output/allure-results",
    resultsDir: "output/allure-results",
    environmentInfo: ENVIRONMENT_INFO,
  },
): ReporterDescription {
  return ["allure-playwright", options] as const satisfies ReporterDescription;
}

/**
 * Playwright default description for reuse.
 * @example
 * // filename: playwright.config.ts
 * import { REPORTER_DESCRIPTION } from "@playwright-labs/packages/fixture-allure";
 *
 * export defineConfig({
 *   reporter: [
 * ['json', { outputFile: 'test-results.json' }], // JSON reporter
 * REPORTER_DESCRIPTION // allure reporter with base os information
 * ]
 * })
 */

export const REPORTER_DESCRIPTION = makeReporterDescription();

/**
 * Playwright default configuration for reuse.
 * @example
 * // filename: playwright.config.ts
 * import { DEFAULT_CONFIG } from "@playwright-labs/packages/fixture-allure";
 *
 * export defineConfig({
 *   ...DEFAULT_CONFIG,
 *   testMatch: '**\/*.spec.ts',
 * })
 */
export const DEFAULT_CONFIG = {
  reporter: [REPORTER_DESCRIPTION],
} as const satisfies PlaywrightTestConfig;

export default {
  DEFAULT_CONFIG,
  REPORTER_DESCRIPTION,
  makeReporterDescription,
  ENVIRONMENT_INFO,
};
