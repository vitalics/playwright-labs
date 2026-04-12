import {
  expect as baseExpect,
  type Locator,
  type ExpectMatcherState,
  type MatcherReturnType,
} from "@playwright/test";

export type ReactMatchers = {
  /**
   * Asserts that the element is associated with a React component fiber
   * (i.e. a component fiber can be found by walking up the fiber tree).
   */
  toBeReactComponent(
    this: ExpectMatcherState,
    received: Locator,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the nearest React component has a prop with the given name.
   * Optionally asserts the prop's value using deep equality.
   */
  toHaveReactProp(
    this: ExpectMatcherState,
    received: Locator,
    name: string,
    value?: unknown,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the nearest React component has a prop `name` equal to `value`.
   * Deep equality is used for objects and arrays.
   */
  toBeReactProp(
    this: ExpectMatcherState,
    received: Locator,
    name: string,
    value: unknown,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the nearest React component has state at `path`.
   *
   * `path` supports dot notation:
   * - Class components: `"count"`, `"user.name"`
   * - Function components: `"0"` (first `useState` hook), `"1"`, etc.
   *
   * Optionally asserts the value using deep equality.
   */
  toHaveReactState(
    this: ExpectMatcherState,
    received: Locator,
    path: string,
    value?: unknown,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the nearest React component's state at `path` equals `value`.
   * Deep equality is used for objects and arrays.
   */
  toBeReactState(
    this: ExpectMatcherState,
    received: Locator,
    path: string,
    value: unknown,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the nearest React **class** component has a context key `key`.
   * Optionally asserts the value using deep equality.
   *
   * Returns `false` for function components — context consumed via `useContext`
   * hooks is not accessible through the fiber tree.
   */
  toHaveReactContext(
    this: ExpectMatcherState,
    received: Locator,
    key: string,
    value?: unknown,
  ): Promise<MatcherReturnType>;
  /**
   * Asserts that the serialized DOM of the matched element matches the
   * provided `snapshot` string (same normalization as `toMatchNgSnapshot`).
   */
  toMatchReactSnapshot(
    this: ExpectMatcherState,
    received: Locator,
    snapshot: string,
  ): Promise<MatcherReturnType>;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Recursive deep equality without external dependencies. */
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

/**
 * Returns a failure `MatcherReturnType` when `received` is not a Playwright
 * Locator, or `null` when the guard passes.
 */
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

/** Resolves the nearest component fiber's memoizedProps from a DOM element. */
const GET_NEAREST_FIBER = `
function getReactFiber(element) {
  var key = Object.keys(element).find(function(k) {
    return k.startsWith('__reactFiber$') || k.startsWith('_reactInternals');
  });
  return key ? element[key] : null;
}
function getNearestComponentFiber(element) {
  var fiber = getReactFiber(element);
  if (!fiber) return null;
  var root = fiber;
  while (root.return) root = root.return;
  var fiberRoot = root.stateNode;
  var startFiber = (fiberRoot && fiberRoot.current && fiberRoot.current !== root)
    ? (fiber.alternate || fiber)
    : fiber;
  var f = startFiber;
  while (f) {
    var type = f.type;
    if (type && (typeof type === 'function' || (typeof type === 'object' && type !== null))) {
      return f;
    }
    f = f.return;
  }
  return null;
}
`;

// ─── Matcher implementations ───────────────────────────────────────────────────

export const expect = baseExpect.extend<ReactMatchers>({
  // ── toBeReactComponent ─────────────────────────────────────────────────────

  async toBeReactComponent(received): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const pass = await locator.evaluate(
      new Function(
        "el",
        `"use strict";
${GET_NEAREST_FIBER}
return getNearestComponentFiber(el) !== null;`,
      ) as (el: Element) => boolean,
    );

    return {
      pass,
      message: () =>
        pass
          ? "Expected element NOT to be associated with a React component"
          : "Expected element to be associated with a React component, but no component fiber was found\n" +
            "  Hint: make sure the React app has not been compiled with fiber metadata stripped",
    };
  },

  // ── toHaveReactProp ────────────────────────────────────────────────────────

  async toHaveReactProp(received, name, value): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate(
      new Function(
        "el",
        "arg",
        `"use strict";
${GET_NEAREST_FIBER}
var propName = arg;
var fiber = getNearestComponentFiber(el);
if (!fiber) return { found: false, value: undefined, props: [], reason: 'no React component fiber found' };
var props = fiber.memoizedProps || {};
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

  // ── toBeReactProp ──────────────────────────────────────────────────────────

  async toBeReactProp(received, name, value): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate(
      new Function(
        "el",
        "arg",
        `"use strict";
${GET_NEAREST_FIBER}
var propName = arg;
var fiber = getNearestComponentFiber(el);
if (!fiber) return { ok: false, value: undefined, reason: 'no React component fiber found' };
var props = fiber.memoizedProps || {};
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

  // ── toHaveReactState ───────────────────────────────────────────────────────

  async toHaveReactState(received, path, value): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate(
      new Function(
        "el",
        "arg",
        `"use strict";
${GET_NEAREST_FIBER}
var statePath = arg;
var fiber = getNearestComponentFiber(el);
if (!fiber) return { found: false, value: undefined, reason: 'no React component fiber found' };
var ms = fiber.memoizedState;
if (!ms) return { found: false, value: undefined, reason: 'component has no state' };

var stateObj;
if (fiber.stateNode && typeof fiber.stateNode === 'object' && fiber.stateNode.isReactComponent) {
  stateObj = ms;
} else {
  var states = [];
  var hook = ms; var guard = 0;
  while (hook !== null && guard < 200) {
    if (hook.queue != null) states.push(hook.memoizedState);
    hook = hook.next; guard++;
  }
  stateObj = states.reduce(function(acc, s, i) { acc[String(i)] = s; return acc; }, {});
}

var keys = statePath.split('.');
var current = stateObj;
for (var i = 0; i < keys.length; i++) {
  if (current === null || current === undefined) return { found: false, value: undefined, reason: 'path "' + statePath + '" not found in state' };
  current = current[keys[i]];
}
return { found: true, value: current, reason: '' };`,
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
            ? `Expected component NOT to have state at "${path}" equal to ${JSON.stringify(value)}`
            : `Expected component NOT to have state at "${path}"`;
        if (!result.found)
          return `Expected component to have state at "${path}", but: ${result.reason}`;
        return [
          `Expected state at "${path}" to equal:`,
          `  Expected: ${JSON.stringify(value)}`,
          `  Received: ${JSON.stringify(result.value)}`,
        ].join("\n");
      },
    };
  },

  // ── toBeReactState ─────────────────────────────────────────────────────────

  async toBeReactState(received, path, value): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate(
      new Function(
        "el",
        "arg",
        `"use strict";
${GET_NEAREST_FIBER}
var statePath = arg;
var fiber = getNearestComponentFiber(el);
if (!fiber) return { ok: false, value: undefined, reason: 'no React component fiber found' };
var ms = fiber.memoizedState;
if (!ms) return { ok: false, value: undefined, reason: 'component has no state' };

var stateObj;
if (fiber.stateNode && typeof fiber.stateNode === 'object' && fiber.stateNode.isReactComponent) {
  stateObj = ms;
} else {
  var states = [];
  var hook = ms; var guard = 0;
  while (hook !== null && guard < 200) {
    if (hook.queue != null) states.push(hook.memoizedState);
    hook = hook.next; guard++;
  }
  stateObj = states.reduce(function(acc, s, i) { acc[String(i)] = s; return acc; }, {});
}

var keys = statePath.split('.');
var current = stateObj;
for (var i = 0; i < keys.length; i++) {
  if (current === null || current === undefined) return { ok: false, value: undefined, reason: 'path "' + statePath + '" not found in state' };
  current = current[keys[i]];
}
return { ok: true, value: current, reason: '' };`,
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
          ? `Expected state at "${path}" NOT to equal ${JSON.stringify(value)}`
          : !result.ok
            ? `Expected component to have state at "${path}", but: ${result.reason}`
            : [
                `Expected state at "${path}" to equal:`,
                `  Expected: ${JSON.stringify(value)}`,
                `  Received: ${JSON.stringify(result.value)}`,
              ].join("\n"),
    };
  },

  // ── toHaveReactContext ─────────────────────────────────────────────────────

  async toHaveReactContext(received, key, value): Promise<MatcherReturnType> {
    const guard = assertIsLocator(received);
    if (guard) return guard;

    const locator = received as Locator;
    const result = await locator.evaluate(
      new Function(
        "el",
        "arg",
        `"use strict";
${GET_NEAREST_FIBER}
var ctxKey = arg;
var fiber = getNearestComponentFiber(el);
if (!fiber) return { found: false, value: undefined, reason: 'no React component fiber found' };
if (!fiber.stateNode || typeof fiber.stateNode !== 'object' || !fiber.stateNode.isReactComponent) {
  return { found: false, value: undefined, reason: 'context is only accessible on class components' };
}
var ctx = fiber.stateNode.context;
if (!ctx || !(ctxKey in ctx)) return { found: false, value: undefined, reason: 'context key "' + ctxKey + '" not found' };
return { found: true, value: ctx[ctxKey], reason: '' };`,
      ) as (el: Element, arg: string) => any,
      key as string,
    );

    const hasValue = arguments.length >= 3;
    const pass = result.found && (!hasValue || deepEqual(result.value, value));
    return {
      pass,
      message: () => {
        if (pass)
          return hasValue
            ? `Expected component NOT to have context key "${key}" equal to ${JSON.stringify(value)}`
            : `Expected component NOT to have context key "${key}"`;
        if (!result.found)
          return `Expected component to have context key "${key}", but: ${result.reason}`;
        return [
          `Expected context key "${key}" to equal:`,
          `  Expected: ${JSON.stringify(value)}`,
          `  Received: ${JSON.stringify(result.value)}`,
        ].join("\n");
      },
    };
  },

  // ── toMatchReactSnapshot ───────────────────────────────────────────────────

  async toMatchReactSnapshot(received, snapshot): Promise<MatcherReturnType> {
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
