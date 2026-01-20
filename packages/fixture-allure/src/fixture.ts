import * as allure from "allure-js-commons";
import { test as baseTest, expect as baseExpect } from "@playwright/test";

type AllureAddParameterAllOptions = Parameters<(typeof allure)["parameter"]>;
type AllureAddParameterOptions = AllureAddParameterAllOptions[2];
export type AllureIssue = { name: string; url: string };
export type AllureParameter = {
  name: string;
  value: string;
  options?: AllureAddParameterOptions;
};

/** Allure type context for `useAllure` function */
export type AllureContext = {
  id?: string | number;
  layer?: string;
  description?: string;
  epic?: string;
  owner?: string;
  feature?: string;
  story?: string;
  suite?: string;
  component?: string;
  /** Allure severity */
  severity?:
    | "trivial"
    | "minor"
    | "blocker"
    | "critical"
    | (string & {})
    | allure.Severity;
  /** custom allure labels */
  labels?: Record<string, string>;
  /** allure parameters */
  parameters?: AllureParameter[] | Record<string, string>;
  tags?: string[];
  /** allure issue in format `name: url` */
  issues?: readonly allure.Link[];
  /** allure link in format `name: url` */
  links?: readonly allure.Link[];
};

export type Fixture = {
  /**
   * Hook that appends meta test information into allure.
   * @example
   * test('my simple test', ({ useAllure, page }) => {
   *   const allure = useAllure({
   *     id: 123456,
   *     description: 'This is a description',
   *     layer: 'API',
   *     severity: 'critical',
   *     owner: 'John Doe',
   *     labels: {
   *       custom_label: 'my_value',
   *     },
   *     tags: ['ui', 'regression'],
   *     issues: [ { url: "https://example.com/issue1", name: "Issue 1"}, ],
   *     links: [ {url: "https://example.com/doc1", name: "documentation 1"}, ],
   *   });
   *
   *   allure.parameter('param1', 'value1');
   *   await allure.step('my step', async () => {
   *     await allure.attachment('screenshot', 'image/png', await page.screenshot());
   *   });
   * })
   */
  useAllure: (context: AllureContext) => typeof allure;
  /**
   * allure instance that you can communicate
   * **NOTE:** preferable to use `useAllure`.
   * @see {@link Fixture['useAllure']}
   */
  allure: typeof allure;
};

export const test = baseTest.extend<Fixture>({
  allure: async ({}, use) => {
    await use(allure);
  },
  useAllure: async ({}, use) => {
    await use((ctx) => {
      Object.entries(ctx).map(async ([key, value]) => {
        if (key === "labels" && typeof value === "object") {
          const labels = Object.entries(value).map(
            ([labelName, labelValue]) =>
              ({
                name: labelName,
                value: labelValue,
              }) as { name: string; value: string },
          );
          allure.labels(...labels);
        } else if (key === "component" && typeof value === "string") {
          await allure.label("Component", value);
        } else if (key === "severity" && typeof value === "string") {
          await allure.label(allure.LabelName.SEVERITY, value);
        } else if (key === "issue" && typeof value === "string") {
          await allure.label("issue", value);
        } else if (key === "links" && Array.isArray(value)) {
          (value as unknown as readonly AllureIssue[]).forEach(
            async ({ name, url }) => {
              await allure.link(url, name);
            },
          );
        } else if (key === "issues" && Array.isArray(value)) {
          (value as unknown as readonly AllureIssue[]).forEach(
            async ({ name, url }) => {
              await allure.issue(name, url);
            },
          );
        } else if (key === "parameters" && Array.isArray(value)) {
          (value as AllureParameter[]).forEach(
            async ({ name, value: paramValue, options }) => {
              await allure.parameter(name, paramValue, options);
            },
          );
        } else if (key === "parameters" && typeof value === "object") {
          await Promise.all(
            Object.entries(value).map(async ([name, value]) => {
              await allure.parameter(name, value);
            }),
          );
        } else if (key === "tags" && Array.isArray(value)) {
          await allure.tags(...(value as string[]));
        } else if (key === "id") {
          await allure.allureId(String(value));
        } else {
          // eslint-disable-next-line no-unused-vars
          type Fn = (arg: string) => unknown;
          (allure as unknown as Record<string, Fn>)[key](String(value));
        }
      });
      return allure;
    });
  },
});

export const expect = baseExpect.extend({});
