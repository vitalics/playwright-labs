import type { Locator as LocatorCore } from "playwright-core";
import type { Locator as LocatorTest } from "@playwright/test";

/**
 * Type guard: checks whether an unknown value is a Playwright `Locator`.
 *
 * Playwright does not export the `Locator` class, so the check is structural —
 * it looks for the combination of methods that only `Locator` has
 * (`Page` lacks `and`/`or`/`elementHandle`, `FrameLocator` lacks `click`/`evaluate`,
 * `ElementHandle` lacks `and`/`or`/`page`).
 */
export function isLocator(value: unknown): value is LocatorCore | LocatorTest {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<PropertyKey, unknown>;
  return (
    typeof candidate.click === "function" &&
    typeof candidate.evaluate === "function" &&
    typeof candidate.evaluateAll === "function" &&
    typeof candidate.elementHandle === "function" &&
    typeof candidate.and === "function" &&
    typeof candidate.or === "function" &&
    typeof candidate.page === "function"
  );
}
