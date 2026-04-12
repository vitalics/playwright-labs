import {
  expect as baseExpect,
  type Locator,
  type ExpectMatcherState,
  type MatcherReturnType,
} from "@playwright/test";

export type VueMatchers = {
  /**
   * Asserts that the element is associated with a Vue component instance
   * (i.e. a component can be found by walking up the Vue app tree).
   */
  toBeVueComponent(
    this: ExpectMatcherState,
    received: Locator,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the nearest Vue component has a prop with the given name.
   * Optionally asserts the prop's value using deep equality.
   */
  toHaveVueProp(
    this: ExpectMatcherState,
    received: Locator,
    name: string,
    value?: unknown,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the nearest Vue component has a prop `name` equal to `value`.
   * Deep equality is used for objects and arrays.
   */
  toBeVueProp(
    this: ExpectMatcherState,
    received: Locator,
    name: string,
    value: unknown,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the nearest Vue component has Composition API setup state at
   * `path`. Dot notation is supported: `"count"`, `"user.name"`.
   *
   * Optionally asserts the value using deep equality.
   */
  toHaveVueSetup(
    this: ExpectMatcherState,
    received: Locator,
    path: string,
    value?: unknown,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the nearest Vue component's setup state at `path` equals
   * `value`. Deep equality is used for objects and arrays.
   */
  toBeVueSetup(
    this: ExpectMatcherState,
    received: Locator,
    path: string,
    value: unknown,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the nearest Vue component has Options API data at `path`.
   * Dot notation is supported.
   *
   * Optionally asserts the value using deep equality.
   */
  toHaveVueData(
    this: ExpectMatcherState,
    received: Locator,
    path: string,
    value?: unknown,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the nearest Vue component's Options API data at `path` equals
   * `value`. Deep equality is used for objects and arrays.
   */
  toBeVueData(
    this: ExpectMatcherState,
    received: Locator,
    path: string,
    value: unknown,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the serialised DOM of the matched element matches the provided
   * `snapshot` string (whitespace-normalised).
   */
  toMatchVueSnapshot(
    this: ExpectMatcherState,
    received: Locator,
    snapshot: string,
  ): Promise<MatcherReturnType>;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, (b as unknown[])[i]));
  }
  if (typeof a !== "object" || typeof b !== "object") return false;
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(
    (k) =>
      Object.prototype.hasOwnProperty.call(b, k) &&
      deepEqual(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      ),
  );
}

function assertIsLocator(received: unknown): MatcherReturnType | null {
  if (
    received !== null &&
    typeof received === "object" &&
    typeof (received as Locator).evaluate === "function"
  )
    return null;
  return {
    pass: false,
    message: () =>
      "Expected a Playwright Locator as the received value, but got: " +
      (received === null ? "null" : typeof received),
  };
}

/**
 * Browser-side code shared across all matchers.
 * Resolves the Vue component instance for a DOM element by walking the
 * component tree from the Vue app root.
 */
const GET_VUE_INSTANCE = `
function findVueApp(el) {
  var current = el;
  while (current) {
    if (current.__vue_app__) return current.__vue_app__;
    current = current.parentElement;
  }
  return null;
}
function getFirstElement(vnode) {
  if (!vnode) return null;
  if (vnode.el && vnode.el.nodeType === 1) return vnode.el;
  if (Array.isArray(vnode.children)) {
    for (var i = 0; i < vnode.children.length; i++) {
      var child = vnode.children[i];
      if (child && typeof child === 'object') {
        var found = getFirstElement(child);
        if (found) return found;
      }
    }
  }
  if (vnode.component) return getFirstElement(vnode.component.subTree);
  return null;
}
function searchInVNode(vnode, targetEl) {
  if (!vnode) return null;
  if (vnode.component) return searchForElement(vnode.component, targetEl);
  var children = vnode.children;
  if (Array.isArray(children)) {
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child && typeof child === 'object') {
        var found2 = searchInVNode(child, targetEl);
        if (found2) return found2;
      }
    }
  }
  return null;
}
function searchForElement(instance, targetEl) {
  if (!instance || !instance.subTree) return null;
  if (getFirstElement(instance.subTree) === targetEl) return instance;
  return searchInVNode(instance.subTree, targetEl);
}
function getVueInstance(el) {
  var app = findVueApp(el);
  if (!app || !app._instance) return null;
  return searchForElement(app._instance, el);
}
function unref(val) {
  return val && typeof val === 'object' && val.__v_isRef ? val.value : val;
}
function getSetupState(instance) {
  var raw = instance.setupState;
  if (!raw || typeof raw !== 'object') return null;
  var state = {}; var hasAny = false;
  var keys = Object.keys(raw);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key.startsWith('__v_') || key.startsWith('__VUE')) continue;
    state[key] = unref(raw[key]); hasAny = true;
  }
  return hasAny ? state : null;
}
function getData(instance) {
  var data = instance.data;
  if (!data || typeof data !== 'object') return null;
  var result = {}; var hasAny = false;
  var keys = Object.keys(data);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key.startsWith('__v_')) continue;
    result[key] = data[key]; hasAny = true;
  }
  return hasAny ? result : null;
}
function resolvePath(obj, path) {
  var keys = path.split('.');
  var current = obj;
  for (var i = 0; i < keys.length; i++) {
    if (current === null || current === undefined) return { found: false, value: undefined };
    current = current[keys[i]];
  }
  return { found: true, value: current };
}
`;

// ─── Matcher implementations ───────────────────────────────────────────────────

export const expect = baseExpect.extend<VueMatchers>({
  // ── toBeVueComponent ────────────────────────────────────────────────────────

  async toBeVueComponent(received): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const pass = await locator.evaluate(
      new Function(
        "el",
        `"use strict";
${GET_VUE_INSTANCE}
return getVueInstance(el) !== null;`,
      ) as (el: Element) => boolean,
    );

    return {
      pass,
      message: () =>
        pass
          ? "Expected element NOT to be associated with a Vue component"
          : "Expected element to be associated with a Vue component, but no component instance was found\n" +
            "  Hint: make sure the Vue app is mounted and that you are using a development build",
    };
  },

  // ── toHaveVueProp ────────────────────────────────────────────────────────────

  async toHaveVueProp(received, name, value): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate(
      new Function(
        "el",
        "arg",
        `"use strict";
${GET_VUE_INSTANCE}
var propName = arg;
var instance = getVueInstance(el);
if (!instance) return { found: false, value: undefined, props: [], reason: 'no Vue component instance found' };
var props = instance.props || {};
var found = propName in props;
return { found: found, value: found ? props[propName] : undefined, props: Object.keys(props), reason: '' };`,
      ) as (el: Element, arg: string) => any,
      name as string,
    );

    const hasValue = arguments.length >= 3;
    const pass = result.found && (!hasValue || deepEqual(result.value, value));
    return {
      pass,
      message: () => {
        if (pass)
          return hasValue
            ? `Expected component NOT to have prop "${name}" equal to ${JSON.stringify(value)}`
            : `Expected component NOT to have prop "${name}"`;
        if (!result.found)
          return [
            `Expected component to have prop "${name}"`,
            result.props.length
              ? `  Available props: ${result.props.join(", ")}`
              : "",
            result.reason ? `  Reason: ${result.reason}` : "",
          ]
            .filter(Boolean)
            .join("\n");
        return [
          `Expected prop "${name}" to equal:`,
          `  Expected: ${JSON.stringify(value)}`,
          `  Received: ${JSON.stringify(result.value)}`,
        ].join("\n");
      },
    };
  },

  // ── toBeVueProp ──────────────────────────────────────────────────────────────

  async toBeVueProp(received, name, value): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate(
      new Function(
        "el",
        "arg",
        `"use strict";
${GET_VUE_INSTANCE}
var propName = arg;
var instance = getVueInstance(el);
if (!instance) return { ok: false, value: undefined, reason: 'no Vue component instance found' };
var props = instance.props || {};
if (!(propName in props)) return { ok: false, value: undefined, reason: 'prop "' + propName + '" not found' };
return { ok: true, value: props[propName], reason: '' };`,
      ) as (el: Element, arg: string) => any,
      name as string,
    );

    const pass = result.ok && deepEqual(result.value, value);
    return {
      pass,
      expected: value,
      actual: result.ok ? result.value : undefined,
      message: () =>
        pass
          ? `Expected prop "${name}" NOT to equal ${JSON.stringify(value)}`
          : !result.ok
            ? `Expected component to expose prop "${name}", but: ${result.reason}`
            : [
                `Expected prop "${name}" to equal:`,
                `  Expected: ${JSON.stringify(value)}`,
                `  Received: ${JSON.stringify(result.value)}`,
              ].join("\n"),
    };
  },

  // ── toHaveVueSetup ───────────────────────────────────────────────────────────

  async toHaveVueSetup(received, path, value): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate(
      new Function(
        "el",
        "arg",
        `"use strict";
${GET_VUE_INSTANCE}
var statePath = arg;
var instance = getVueInstance(el);
if (!instance) return { found: false, value: undefined, reason: 'no Vue component instance found' };
var state = getSetupState(instance);
if (!state) return { found: false, value: undefined, reason: 'component has no setup state' };
var r = resolvePath(state, statePath);
if (!r.found) return { found: false, value: undefined, reason: 'path "' + statePath + '" not found in setup state' };
return { found: true, value: r.value, reason: '' };`,
      ) as (el: Element, arg: string) => any,
      path as string,
    );

    const hasValue = arguments.length >= 3;
    const pass = result.found && (!hasValue || deepEqual(result.value, value));
    return {
      pass,
      message: () => {
        if (pass)
          return hasValue
            ? `Expected component NOT to have setup state at "${path}" equal to ${JSON.stringify(value)}`
            : `Expected component NOT to have setup state at "${path}"`;
        if (!result.found)
          return `Expected component to have setup state at "${path}", but: ${result.reason}`;
        return [
          `Expected setup state at "${path}" to equal:`,
          `  Expected: ${JSON.stringify(value)}`,
          `  Received: ${JSON.stringify(result.value)}`,
        ].join("\n");
      },
    };
  },

  // ── toBeVueSetup ─────────────────────────────────────────────────────────────

  async toBeVueSetup(received, path, value): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate(
      new Function(
        "el",
        "arg",
        `"use strict";
${GET_VUE_INSTANCE}
var statePath = arg;
var instance = getVueInstance(el);
if (!instance) return { ok: false, value: undefined, reason: 'no Vue component instance found' };
var state = getSetupState(instance);
if (!state) return { ok: false, value: undefined, reason: 'component has no setup state' };
var r = resolvePath(state, statePath);
if (!r.found) return { ok: false, value: undefined, reason: 'path "' + statePath + '" not found in setup state' };
return { ok: true, value: r.value, reason: '' };`,
      ) as (el: Element, arg: string) => any,
      path as string,
    );

    const pass = result.ok && deepEqual(result.value, value);
    return {
      pass,
      expected: value,
      actual: result.ok ? result.value : undefined,
      message: () =>
        pass
          ? `Expected setup state at "${path}" NOT to equal ${JSON.stringify(value)}`
          : !result.ok
            ? `Expected component to have setup state at "${path}", but: ${result.reason}`
            : [
                `Expected setup state at "${path}" to equal:`,
                `  Expected: ${JSON.stringify(value)}`,
                `  Received: ${JSON.stringify(result.value)}`,
              ].join("\n"),
    };
  },

  // ── toHaveVueData ────────────────────────────────────────────────────────────

  async toHaveVueData(received, path, value): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate(
      new Function(
        "el",
        "arg",
        `"use strict";
${GET_VUE_INSTANCE}
var dataPath = arg;
var instance = getVueInstance(el);
if (!instance) return { found: false, value: undefined, reason: 'no Vue component instance found' };
var d = getData(instance);
if (!d) return { found: false, value: undefined, reason: 'component has no Options API data' };
var r = resolvePath(d, dataPath);
if (!r.found) return { found: false, value: undefined, reason: 'path "' + dataPath + '" not found in data' };
return { found: true, value: r.value, reason: '' };`,
      ) as (el: Element, arg: string) => any,
      path as string,
    );

    const hasValue = arguments.length >= 3;
    const pass = result.found && (!hasValue || deepEqual(result.value, value));
    return {
      pass,
      message: () => {
        if (pass)
          return hasValue
            ? `Expected component NOT to have data at "${path}" equal to ${JSON.stringify(value)}`
            : `Expected component NOT to have data at "${path}"`;
        if (!result.found)
          return `Expected component to have data at "${path}", but: ${result.reason}`;
        return [
          `Expected data at "${path}" to equal:`,
          `  Expected: ${JSON.stringify(value)}`,
          `  Received: ${JSON.stringify(result.value)}`,
        ].join("\n");
      },
    };
  },

  // ── toBeVueData ──────────────────────────────────────────────────────────────

  async toBeVueData(received, path, value): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate(
      new Function(
        "el",
        "arg",
        `"use strict";
${GET_VUE_INSTANCE}
var dataPath = arg;
var instance = getVueInstance(el);
if (!instance) return { ok: false, value: undefined, reason: 'no Vue component instance found' };
var d = getData(instance);
if (!d) return { ok: false, value: undefined, reason: 'component has no Options API data' };
var r = resolvePath(d, dataPath);
if (!r.found) return { ok: false, value: undefined, reason: 'path "' + dataPath + '" not found in data' };
return { ok: true, value: r.value, reason: '' };`,
      ) as (el: Element, arg: string) => any,
      path as string,
    );

    const pass = result.ok && deepEqual(result.value, value);
    return {
      pass,
      expected: value,
      actual: result.ok ? result.value : undefined,
      message: () =>
        pass
          ? `Expected data at "${path}" NOT to equal ${JSON.stringify(value)}`
          : !result.ok
            ? `Expected component to have data at "${path}", but: ${result.reason}`
            : [
                `Expected data at "${path}" to equal:`,
                `  Expected: ${JSON.stringify(value)}`,
                `  Received: ${JSON.stringify(result.value)}`,
              ].join("\n"),
    };
  },

  // ── toMatchVueSnapshot ───────────────────────────────────────────────────────

  async toMatchVueSnapshot(received, snapshot): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;

    const actual = await locator.evaluate((el): string => {
      function normalizeHtml(html: string): string {
        return html
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .join("\n");
      }
      return normalizeHtml(el.outerHTML);
    });

    const normalizedSnapshot = (snapshot as string)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");

    const pass = actual === normalizedSnapshot;

    return {
      pass,
      expected: normalizedSnapshot,
      actual,
      message: () =>
        pass
          ? "Expected component DOM snapshot NOT to match, but it did"
          : [
              "Component DOM snapshot does not match.",
              "",
              "Expected:",
              normalizedSnapshot,
              "",
              "Received:",
              actual,
            ].join("\n"),
    };
  },
});
