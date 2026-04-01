import { selectors } from "@playwright/test";
import { AngularEngine } from "../src/index";

/**
 * Register the Angular selector engine once per worker process.
 * After registration, `page.locator('angular=SelectorSyntax')` becomes available.
 *
 * Selector syntax:
 *   angular=ComponentTagName
 *   angular=ComponentTagName[property="value"]
 *   angular=ComponentTagName[nested.property="value"]
 *   angular=ComponentTagName[property]              (truthy check)
 *   angular=ComponentTagName[property="value" i]    (case-insensitive)
 */
selectors.register("angular", AngularEngine);
