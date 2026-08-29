export { AngularEngine } from "./engine";
export { expect, type AngularMatchers } from "./matchers";
export { test, type Fixture, NgHtmlElement } from "./fixture";
// side effect: registers the "angular" realizer for @playwright-labs/locators-extra
export { AngularRealizer } from "./realizer";
