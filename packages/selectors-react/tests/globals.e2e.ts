import { selectors } from "@playwright/test";
import { ReactEngine } from "../src/index";

/**
 * Register the React selector engine once per worker process.
 * After registration, `page.locator('react=SelectorSyntax')` becomes available.
 *
 * Selector syntax:
 *   react=ComponentName
 *   react=ComponentName[props.label="value"]
 *   react=ComponentName[state.0=5]
 *   react=ComponentName[context.theme="dark"]
 *   react=ComponentName[props.label]              (truthy check)
 *   react=ComponentName[props.label="value" i]    (case-insensitive)
 */
try {
  selectors.register("react", ReactEngine);
} catch {
  // Already registered in this worker — safe to ignore
}
