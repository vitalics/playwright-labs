import type { Locator } from "playwright-core";

import { dnd } from "./dnd";
import { isLocator } from "./is-locator";
import {
  registerRealizer,
  selectorRealization,
  selectorRealizationAll,
  type Realizer,
  type SelectorKind,
} from "./realization";

export { dnd, type DnDOptions } from "./dnd";
export { isLocator } from "./is-locator";
export {
  registerRealizer,
  selectorRealization,
  selectorRealizationAll,
  type KnownSelectorKinds,
  type Realizer,
  type SelectorKind,
} from "./realization";

/** Aggregated API — `LocatorExtra.is(value)`, `LocatorExtra.css(locator)`, … */
export const LocatorExtra = {
  is: isLocator,
  dnd,
  register: registerRealizer,
  realization: selectorRealization,
  realizationAll: selectorRealizationAll,
  css: (locator: Locator) => selectorRealization(locator, "css"),
  xpath: (locator: Locator) => selectorRealization(locator, "xpath"),
  tag: (locator: Locator) => selectorRealization(locator, "tag"),
} as const;
