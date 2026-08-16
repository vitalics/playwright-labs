import {
  expect as baseExpect,
  test as baseTest,
  type Locator,
  type Page,
} from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import type { AxeResults } from "axe-core";
import { isLocator, selectorRealizationAll } from "@playwright-labs/locators-extra";

type Axe = InstanceType<typeof AxeBuilder>;

type FrameSelector = Parameters<Axe["include"]>[0];

type AxePage = ConstructorParameters<typeof AxeBuilder>[0]["page"];

/**
 * `AxeBuilder` that also accepts locators in `include`/`exclude`.
 *
 * `include`/`exclude` are synchronous and chainable, while realizing a locator
 * into a CSS selector requires the page — locators are queued and resolved
 * right before the scan in {@link A11yBuilder.analyze}.
 */
export class A11yBuilder extends AxeBuilder {
  #pendingIncludes: Locator[] = [];
  #pendingExcludes: Locator[] = [];

  constructor(options: { page: Page }) {
    // @axe-core/playwright is typed against its own playwright-core version;
    // the Page shapes drift between releases — safe to bridge here
    super({ page: options.page as unknown as AxePage });
  }

  override include(locator: Locator): this;
  override include(selector: FrameSelector): this;
  override include(selectorOrLocator: FrameSelector | Locator): this;
  override include(selectorOrLocator: FrameSelector | Locator): this {
    if (isLocator(selectorOrLocator)) {
      this.#pendingIncludes.push(selectorOrLocator as Locator);
      return this;
    }
    return super.include(selectorOrLocator as FrameSelector);
  }

  override exclude(locator: Locator): this;
  override exclude(selector: FrameSelector): this;
  override exclude(selectorOrLocator: FrameSelector | Locator): this;
  override exclude(selectorOrLocator: FrameSelector | Locator): this {
    if (isLocator(selectorOrLocator)) {
      this.#pendingExcludes.push(selectorOrLocator as Locator);
      return this;
    }
    return super.exclude(selectorOrLocator);
  }

  override async analyze(): Promise<AxeResults> {
    for (const locator of this.#pendingIncludes.splice(0)) {
      const selectors = await selectorRealizationAll(locator, "css");
      // an include that matches nothing would silently widen the scan to the
      // whole page — fail loudly instead
      if (selectors.length === 0) {
        throw new Error(
          `a11y include locator matched no elements: ${String(locator)}`,
        );
      }
      for (const css of selectors) super.include(css);
    }
    for (const locator of this.#pendingExcludes.splice(0)) {
      for (const css of await selectorRealizationAll(locator, "css")) {
        super.exclude(css);
      }
    }
    return super.analyze();
  }
}

export type Fixture = {
  /** Fresh {@link A11yBuilder} for the default page — one scan per test. */
  a11y: A11yBuilder;
  /** Factory: a fresh {@link A11yBuilder} per call, for several scans in one test. */
  useA11y: (page?: Page) => A11yBuilder;
};

export const test = baseTest.extend<Fixture>({
  a11y: async ({ page }, use) => {
    await use(new A11yBuilder({ page }));
  },
  useA11y: async ({ page }, use) => {
    await use((otherPage) => new A11yBuilder({ page: otherPage ?? page }));
  },
});

export type ToBeAccessibleOptions = {
  /** Limit the scan to these parts of the page. */
  include?: Array<string | Locator>;
  /** Skip these parts of the page. */
  exclude?: Array<string | Locator>;
  /** Run only rules with these axe tags, e.g. `["wcag2a", "wcag2aa"]`. */
  tags?: string[];
  /** Rule ids to disable, e.g. `["color-contrast"]`. */
  disableRules?: string[];
};

function formatViolations(results: AxeResults): string {
  return results.violations
    .map((violation) => {
      const targets = violation.nodes
        .slice(0, 3)
        .map((node) => `    ${node.target.join(" ")}`)
        .join("\n");
      const more =
        violation.nodes.length > 3
          ? `\n    … and ${violation.nodes.length - 3} more node(s)`
          : "";
      return `  ${violation.id} (${violation.impact ?? "n/a"}): ${violation.help}\n${targets}${more}`;
    })
    .join("\n");
}

export const expect = baseExpect.extend({
  async toBeAccessible(
    target: Page | Locator,
    options: ToBeAccessibleOptions = {},
  ) {
    const assertionName = "toBeAccessible";
    let results: AxeResults | undefined;
    let error: unknown;
    try {
      const page = isLocator(target) ? target.page() : target;
      const builder = new A11yBuilder({ page });
      if (isLocator(target)) builder.include(target);
      for (const include of options.include ?? []) builder.include(include);
      for (const exclude of options.exclude ?? []) builder.exclude(exclude);
      if (options.tags?.length) builder.withTags(options.tags);
      if (options.disableRules?.length) builder.disableRules(options.disableRules);
      results = await builder.analyze();
    } catch (e) {
      error = e;
    }

    const violations = results?.violations ?? [];
    const pass = error === undefined && violations.length === 0;
    return {
      name: assertionName,
      pass,
      message: () => {
        if (error) {
          return `${assertionName}: axe scan failed: ${String(error)}`;
        }
        if (this.isNot) {
          return `Expected target not to be accessible, but axe found no violations`;
        }
        return `Expected target to be accessible, axe found ${violations.length} violation(s):\n${formatViolations(results!)}`;
      },
    };
  },
});
