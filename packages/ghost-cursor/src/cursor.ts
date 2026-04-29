import type { ElementHandle, Page } from "@playwright/test";
import {
  type Vector,
  type TimedVector,
  bezierCurve,
  bezierCurveSpeed,
  direction,
  magnitude,
  origin,
  overshoot,
  add,
  clamp,
  scale,
  extrapolate,
} from "./math";
import { installMouseHelper } from "./mouse-helper";

export { installMouseHelper };

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type MouseButton = "left" | "right" | "middle";

export interface BoxOptions {
  readonly paddingPercentage?: number;
  readonly destination?: Vector;
}

export interface GetElementOptions {
  readonly waitForSelector?: number;
}

export interface ScrollOptions {
  readonly scrollSpeed?: number;
  readonly scrollDelay?: number;
}

export interface ScrollIntoViewOptions
  extends ScrollOptions,
    GetElementOptions {
  readonly inViewportMargin?: number;
}

export interface MoveOptions
  extends BoxOptions,
    ScrollIntoViewOptions,
    Pick<PathOptions, "moveSpeed"> {
  readonly moveDelay?: number;
  readonly randomizeMoveDelay?: boolean;
  readonly maxTries?: number;
  readonly overshootThreshold?: number;
}

export interface ClickOptions extends MoveOptions {
  readonly hesitate?: number;
  readonly waitForClick?: number;
  readonly button?: MouseButton;
  readonly clickCount?: number;
}

export interface PathOptions {
  readonly spreadOverride?: number;
  readonly moveSpeed?: number;
  readonly useTimestamps?: boolean;
}

export interface RandomMoveOptions
  extends Pick<MoveOptions, "moveDelay" | "randomizeMoveDelay" | "moveSpeed"> {}

export interface MoveToOptions
  extends PathOptions,
    Pick<MoveOptions, "moveDelay" | "randomizeMoveDelay"> {}

export type ScrollToDestination =
  | Partial<Vector>
  | "top"
  | "bottom"
  | "left"
  | "right";

export type MouseButtonOptions = Pick<ClickOptions, "button" | "clickCount">;

export interface DefaultOptions {
  randomMove?: RandomMoveOptions;
  move?: MoveOptions;
  moveTo?: MoveToOptions;
  click?: ClickOptions;
  scroll?: ScrollOptions & ScrollIntoViewOptions;
  getElement?: GetElementOptions;
}

export interface CreateCursorOptions {
  /** Initial cursor position. Defaults to `{ x: 0, y: 0 }`. */
  start?: Vector;
  /** Continuously move the cursor to random positions when idle. */
  performRandomMoves?: boolean;
  /** Default options applied to all cursor methods. */
  defaultOptions?: DefaultOptions;
  /** Show a visual debug overlay following the cursor. */
  visible?: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const delay = async (ms: number): Promise<void> => {
  if (ms < 1) return;
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const fitts = (distance: number, width: number): number => {
  const a = 0;
  const b = 2;
  const id = Math.log2(distance / width + 1);
  return a + b * id;
};

const getRandomBoxPoint = (
  { x, y, width, height }: BoundingBox,
  options?: Pick<BoxOptions, "paddingPercentage">
): Vector => {
  let paddingWidth = 0;
  let paddingHeight = 0;

  if (
    options?.paddingPercentage !== undefined &&
    options.paddingPercentage > 0 &&
    options.paddingPercentage <= 100
  ) {
    paddingWidth = (width * options.paddingPercentage) / 100;
    paddingHeight = (height * options.paddingPercentage) / 100;
  }

  return {
    x: x + paddingWidth / 2 + Math.random() * (width - paddingWidth),
    y: y + paddingHeight / 2 + Math.random() * (height - paddingHeight),
  };
};

const shouldOvershoot = (
  a: Vector,
  b: Vector,
  threshold: number
): boolean => magnitude(direction(a, b)) > threshold;

const intersectsElement = (vec: Vector, box: BoundingBox): boolean =>
  vec.x > box.x &&
  vec.x <= box.x + box.width &&
  vec.y > box.y &&
  vec.y <= box.y + box.height;

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Returns a random point within the current viewport.
 */
export const getRandomPagePoint = (page: Page): Vector => {
  const viewportSize = page.viewportSize();
  return getRandomBoxPoint({
    x: origin.x,
    y: origin.y,
    width: viewportSize?.width ?? 1280,
    height: viewportSize?.height ?? 720,
  });
};

/**
 * Returns the bounding box of an element. Falls back to `getBoundingClientRect`
 * when `boundingBox()` returns null (e.g. elements inside cross-origin iframes).
 */
export const getElementBox = async (
  _page: Page,
  element: ElementHandle
): Promise<BoundingBox> => {
  const box = await element.boundingBox();
  if (box !== null) return box;
  return element.evaluate((el) => {
    const rect = (el as HTMLElement).getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
};

/**
 * Generates a Bézier-curve path from `start` to `end`.
 *
 * @param options - A number is treated as `spreadOverride`.
 */
export function path(
  start: Vector,
  end: Vector | BoundingBox,
  options?: number | PathOptions
): Vector[] | TimedVector[] {
  const opts: PathOptions =
    typeof options === "number" ? { spreadOverride: options } : { ...options };

  const DEFAULT_WIDTH = 100;
  const MIN_STEPS = 25;
  const width =
    "width" in end && end.width !== 0 ? end.width : DEFAULT_WIDTH;
  const curve = bezierCurve(start, end, opts.spreadOverride);
  const length = curve.length() * 0.8;

  const speed =
    opts.moveSpeed !== undefined && opts.moveSpeed > 0
      ? 25 / opts.moveSpeed
      : Math.random();
  const baseTime = speed * MIN_STEPS;
  const steps = Math.ceil(
    (Math.log2(fitts(length, width) + 1) + baseTime) * 3
  );

  const re = curve.getLUT(steps);
  return clampPositive(re, opts);
}

const clampPositive = (
  vectors: Vector[],
  options?: PathOptions
): Vector[] | TimedVector[] => {
  const clamped = vectors.map((v) => ({
    x: Math.max(0, v.x),
    y: Math.max(0, v.y),
  }));
  return options?.useTimestamps === true
    ? generateTimestamps(clamped, options)
    : clamped;
};

const generateTimestamps = (
  vectors: Vector[],
  options?: PathOptions
): TimedVector[] => {
  const speed = options?.moveSpeed ?? Math.random() * 0.5 + 0.5;

  const timeToMove = (
    P0: Vector,
    P1: Vector,
    P2: Vector,
    P3: Vector,
    samples: number
  ): number => {
    let total = 0;
    const dt = 1 / samples;
    for (let t = 0; t < 1; t += dt) {
      const v1 = bezierCurveSpeed(t * dt, P0, P1, P2, P3);
      const v2 = bezierCurveSpeed(t, P0, P1, P2, P3);
      total += ((v1 + v2) * dt) / 2;
    }
    return Math.round(total / speed);
  };

  const timedVectors: TimedVector[] = [];
  for (let i = 0; i < vectors.length; i++) {
    if (i === 0) {
      timedVectors.push({ ...vectors[i], timestamp: Date.now() });
    } else {
      const P0 = vectors[i - 1];
      const P1 = vectors[i];
      const P2 =
        i + 1 < vectors.length ? vectors[i + 1] : extrapolate(P0, P1);
      const P3 =
        i + 2 < vectors.length ? vectors[i + 2] : extrapolate(P1, P2);
      const time = timeToMove(P0, P1, P2, P3, vectors.length);
      timedVectors.push({
        ...vectors[i],
        timestamp: timedVectors[i - 1].timestamp + time,
      });
    }
  }
  return timedVectors;
};

// ---------------------------------------------------------------------------
// GhostCursor
// ---------------------------------------------------------------------------

/**
 * Human-like mouse cursor for Playwright.
 *
 * Generates realistic Bézier-curve movement paths with optional overshoot,
 * jitter, and Fitts's-law–based timing. All movement is driven by Playwright's
 * native `page.mouse` API — no Puppeteer / CDP required.
 */
export class GhostCursor {
  public readonly page: Page;
  public defaultOptions: DefaultOptions;

  private location: Vector;
  /** true = random moves are paused / blocked */
  private moving: boolean = false;
  private removeMouseHelperFn: (() => Promise<void>) | undefined;

  private static readonly OVERSHOOT_SPREAD = 10;
  private static readonly OVERSHOOT_RADIUS = 120;

  constructor(
    page: Page,
    {
      start = origin,
      performRandomMoves = false,
      defaultOptions = {},
      visible = false,
    }: CreateCursorOptions = {}
  ) {
    this.page = page;
    this.location = start;
    this.defaultOptions = defaultOptions;

    if (visible) {
      this.installMouseHelper().then(
        () => {},
        () => {}
      );
    }

    if (performRandomMoves) {
      this.randomMove().then(
        () => {},
        () => {}
      );
    }
  }

  // -------------------------------------------------------------------------
  // Mouse helper overlay
  // -------------------------------------------------------------------------

  public async installMouseHelper(): Promise<void> {
    const { removeMouseHelper } = await installMouseHelper(this.page);
    this.removeMouseHelperFn = removeMouseHelper;
  }

  public async removeMouseHelper(): Promise<void> {
    await this.removeMouseHelperFn?.();
    this.removeMouseHelperFn = undefined;
  }

  // -------------------------------------------------------------------------
  // Low-level movement
  // -------------------------------------------------------------------------

  private async moveMouse(
    newLocation: BoundingBox | Vector,
    options?: PathOptions,
    abortOnMove: boolean = false
  ): Promise<void> {
    const vectors = path(this.location, newLocation, options);
    let lastTimestamp: number | undefined;

    for (const v of vectors) {
      try {
        if (abortOnMove && this.moving) return;

        // When timestamps are enabled, simulate realistic inter-frame delays
        if ("timestamp" in v) {
          if (lastTimestamp !== undefined) {
            const delta = v.timestamp - lastTimestamp;
            if (delta > 0) await delay(delta);
          }
          lastTimestamp = v.timestamp;
        }

        await this.page.mouse.move(v.x, v.y);
        this.location = v;
      } catch {
        if (this.page.isClosed()) return;
      }
    }
  }

  private async randomMove(options?: RandomMoveOptions): Promise<void> {
    const opts = {
      moveDelay: 2000,
      randomizeMoveDelay: true,
      ...this.defaultOptions?.randomMove,
      ...options,
    };

    try {
      if (!this.moving) {
        const rand = getRandomPagePoint(this.page);
        await this.moveMouse(rand, opts, true);
      }
      await delay(
        opts.moveDelay * (opts.randomizeMoveDelay ? Math.random() : 1)
      );
      this.randomMove(options).then(
        () => {},
        () => {}
      );
    } catch {
      // stop silently
    }
  }

  // -------------------------------------------------------------------------
  // Mouse buttons
  // -------------------------------------------------------------------------

  private async mouseButtonAction(
    action: "down" | "up",
    options?: MouseButtonOptions
  ): Promise<void> {
    const opts = {
      button: "left" as MouseButton,
      clickCount: 1,
      ...this.defaultOptions?.click,
      ...options,
    };

    if (action === "down") {
      await this.page.mouse.down({
        button: opts.button,
        clickCount: opts.clickCount,
      });
    } else {
      await this.page.mouse.up({
        button: opts.button,
        clickCount: opts.clickCount,
      });
    }
  }

  public async mouseDown(options?: MouseButtonOptions): Promise<void> {
    await this.mouseButtonAction("down", options);
  }

  public async mouseUp(options?: MouseButtonOptions): Promise<void> {
    await this.mouseButtonAction("up", options);
  }

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /**
   * Enable (`true`) or disable (`false`) random background movements.
   */
  public toggleRandomMove(random: boolean): void {
    this.moving = !random;
  }

  public getLocation(): Vector {
    return this.location;
  }

  // -------------------------------------------------------------------------
  // High-level actions
  // -------------------------------------------------------------------------

  /**
   * Move to `selector` and perform a realistic mouse click.
   * Omit `selector` to click at the current cursor location.
   */
  public async click(
    selector?: string | ElementHandle,
    options?: ClickOptions
  ): Promise<void> {
    const opts = {
      moveDelay: 2000,
      hesitate: 0,
      waitForClick: 0,
      randomizeMoveDelay: true,
      button: "left" as MouseButton,
      clickCount: 1,
      ...this.defaultOptions?.click,
      ...options,
    };

    const wasRandom = !this.moving;
    this.toggleRandomMove(false);

    if (selector !== undefined) {
      await this.move(selector, { ...opts, moveDelay: 0 });
    }

    try {
      await delay(opts.hesitate);
      await this.mouseDown({ button: opts.button, clickCount: opts.clickCount });
      await delay(opts.waitForClick);
      await this.mouseUp({ button: opts.button, clickCount: opts.clickCount });
    } catch {
      // ignore
    }

    await delay(
      opts.moveDelay * (opts.randomizeMoveDelay ? Math.random() : 1)
    );
    this.toggleRandomMove(wasRandom);
  }

  /**
   * Move the cursor to `selector` with a natural Bézier path and optional
   * overshoot correction.
   */
  public async move(
    selector: string | ElementHandle,
    options?: MoveOptions
  ): Promise<void> {
    const opts = {
      moveDelay: 0,
      maxTries: 10,
      overshootThreshold: 500,
      randomizeMoveDelay: true,
      ...this.defaultOptions?.move,
      ...options,
    };

    const wasRandom = !this.moving;
    this.toggleRandomMove(false);

    const go = async (iteration: number): Promise<void> => {
      if (iteration > opts.maxTries) {
        throw new Error("Could not mouse-over element within enough tries");
      }

      const elem = await this.getElement(selector, opts);
      await this.scrollIntoView(elem, opts);

      const box = await getElementBox(this.page, elem);
      const destination =
        opts.destination !== undefined
          ? add(box, opts.destination)
          : getRandomBoxPoint(box, opts);

      if (shouldOvershoot(this.location, destination, opts.overshootThreshold)) {
        await this.moveMouse(
          overshoot(destination, GhostCursor.OVERSHOOT_RADIUS),
          opts
        );
        await this.moveMouse(
          { ...box, ...destination },
          { ...opts, spreadOverride: GhostCursor.OVERSHOOT_SPREAD }
        );
      } else {
        await this.moveMouse(destination, opts);
      }

      const newBox = await getElementBox(this.page, elem);
      if (!intersectsElement(this.location, newBox)) {
        return go(iteration + 1);
      }
    };

    await go(0);
    this.toggleRandomMove(wasRandom);
    await delay(opts.moveDelay * (opts.randomizeMoveDelay ? Math.random() : 1));
  }

  /**
   * Move the cursor directly to absolute `destination` coordinates.
   */
  public async moveTo(
    destination: Vector,
    options?: MoveToOptions
  ): Promise<void> {
    const opts = {
      moveDelay: 0,
      randomizeMoveDelay: true,
      ...this.defaultOptions?.moveTo,
      ...options,
    };

    const wasRandom = !this.moving;
    this.toggleRandomMove(false);
    await this.moveMouse(destination, opts);
    this.toggleRandomMove(wasRandom);
    await delay(opts.moveDelay * (opts.randomizeMoveDelay ? Math.random() : 1));
  }

  /**
   * Move the cursor by a relative `delta` from its current position.
   */
  public async moveBy(
    delta: Partial<Vector>,
    options?: MoveToOptions
  ): Promise<void> {
    await this.moveTo(add(this.location, { x: 0, y: 0, ...delta }), options);
  }

  // -------------------------------------------------------------------------
  // Scrolling
  // -------------------------------------------------------------------------

  /**
   * Scroll by `delta` pixels from the current cursor position.
   * `scrollSpeed` (1–100) controls step granularity; 100 = one instant step.
   */
  public async scroll(
    delta: Partial<Vector>,
    options?: ScrollOptions
  ): Promise<void> {
    const opts = {
      scrollDelay: 200,
      scrollSpeed: 100,
      ...this.defaultOptions?.scroll,
      ...options,
    };

    const scrollSpeed = clamp(opts.scrollSpeed, 1, 100);

    // Round to integer pixels — fractional wheel deltas can leave residual
    // scroll position that doesn't reach exactly 0 or the intended target.
    let rawDeltaX = Math.round(delta.x ?? 0);
    let rawDeltaY = Math.round(delta.y ?? 0);

    if (rawDeltaX === 0 && rawDeltaY === 0) {
      await delay(opts.scrollDelay);
      return;
    }

    const xDir = rawDeltaX < 0 ? -1 : 1;
    const yDir = rawDeltaY < 0 ? -1 : 1;
    const absDeltaX = Math.abs(rawDeltaX);
    const absDeltaY = Math.abs(rawDeltaY);

    const largerDir = absDeltaX > absDeltaY ? "x" : "y";
    const [larger, shorter] =
      largerDir === "x"
        ? [absDeltaX, absDeltaY]
        : [absDeltaY, absDeltaX];

    const EXP_SCALE_START = 90;
    const largerStep =
      scrollSpeed < EXP_SCALE_START
        ? scrollSpeed
        : scale(
            scrollSpeed,
            [EXP_SCALE_START, 100],
            [EXP_SCALE_START, larger]
          );

    const numSteps = Math.floor(larger / largerStep);

    if (numSteps <= 0 || !isFinite(numSteps)) {
      await this.page.mouse.wheel(rawDeltaX, rawDeltaY);
      await delay(opts.scrollDelay);
      return;
    }

    const largerRemainder = larger % largerStep;
    const shorterStep = Math.floor(shorter / numSteps);
    const shorterRemainder = shorter % numSteps;

    for (let i = 0; i < numSteps; i++) {
      let longerDelta = largerStep;
      let shorterDelta = shorterStep;
      if (i === numSteps - 1) {
        longerDelta += largerRemainder;
        shorterDelta += shorterRemainder;
      }

      const [stepX, stepY] =
        largerDir === "x"
          ? [longerDelta * xDir, shorterDelta * yDir]
          : [shorterDelta * xDir, longerDelta * yDir];

      await this.page.mouse.wheel(stepX, stepY);
    }

    await delay(opts.scrollDelay);
  }

  /**
   * Scroll to a named position (`'top'`, `'bottom'`, `'left'`, `'right'`)
   * or to an absolute `{ x, y }` document coordinate.
   */
  public async scrollTo(
    destination: ScrollToDestination,
    options?: ScrollOptions
  ): Promise<void> {
    const opts = {
      scrollDelay: 200,
      scrollSpeed: 100,
      ...this.defaultOptions?.scroll,
      ...options,
    };

    const { docHeight, docWidth, scrollTop, scrollLeft } =
      await this.page.evaluate(() => ({
        docHeight: document.documentElement.scrollHeight,
        docWidth: document.documentElement.scrollWidth,
        scrollTop: window.scrollY,
        scrollLeft: window.scrollX,
      }));

    const to = ((): Partial<Vector> => {
      switch (destination) {
        case "top":
          return { y: 0 };
        case "bottom":
          return { y: docHeight };
        case "left":
          return { x: 0 };
        case "right":
          return { x: docWidth };
        default:
          return destination;
      }
    })();

    await this.scroll(
      {
        y: to.y !== undefined ? to.y - scrollTop : 0,
        x: to.x !== undefined ? to.x - scrollLeft : 0,
      },
      opts
    );
  }

  /**
   * Scroll `selector` into the visible viewport, then optionally wait.
   * Uses `ElementHandle.scrollIntoViewIfNeeded()` for instant scrolling or
   * step-by-step `scroll()` when a custom speed / margin is required.
   */
  public async scrollIntoView(
    selector: string | ElementHandle,
    options?: ScrollIntoViewOptions
  ): Promise<void> {
    const opts = {
      scrollDelay: 200,
      scrollSpeed: 100,
      inViewportMargin: 0,
      ...this.defaultOptions?.scroll,
      ...options,
    };

    const scrollSpeed = clamp(opts.scrollSpeed, 1, 100);
    const elem = await this.getElement(selector, opts);

    const { viewportWidth, viewportHeight, docHeight, docWidth, scrollTop, scrollLeft } =
      await this.page.evaluate(() => ({
        viewportWidth: document.documentElement.clientWidth,
        viewportHeight: document.documentElement.clientHeight,
        docHeight: document.documentElement.scrollHeight,
        docWidth: document.documentElement.scrollWidth,
        scrollTop: window.scrollY,
        scrollLeft: window.scrollX,
      }));

    const elemBox = await getElementBox(this.page, elem);

    const edges = {
      top: elemBox.y - opts.inViewportMargin,
      left: elemBox.x - opts.inViewportMargin,
      bottom: elemBox.y + elemBox.height + opts.inViewportMargin,
      right: elemBox.x + elemBox.width + opts.inViewportMargin,
    };

    const docEdges = {
      top: Math.max(edges.top + scrollTop, 0) - scrollTop,
      left: Math.max(edges.left + scrollLeft, 0) - scrollLeft,
      bottom: Math.min(edges.bottom + scrollTop, docHeight) - scrollTop,
      right: Math.min(edges.right + scrollLeft, docWidth) - scrollLeft,
    };

    const isInViewport =
      docEdges.top >= 0 &&
      docEdges.left >= 0 &&
      docEdges.bottom <= viewportHeight &&
      docEdges.right <= viewportWidth;

    if (isInViewport) return;

    const manualScroll = async (): Promise<void> => {
      let deltaY = 0;
      let deltaX = 0;

      if (docEdges.top < 0) deltaY = docEdges.top;
      else if (docEdges.bottom > viewportHeight)
        deltaY = docEdges.bottom - viewportHeight;

      if (docEdges.left < 0) deltaX = docEdges.left;
      else if (docEdges.right > viewportWidth)
        deltaX = docEdges.right - viewportWidth;

      await this.scroll({ x: deltaX, y: deltaY }, opts);
    };

    try {
      if (scrollSpeed === 100 && opts.inViewportMargin <= 0) {
        try {
          await elem.scrollIntoViewIfNeeded();
        } catch {
          await manualScroll();
        }
      } else {
        await manualScroll();
      }
    } catch {
      await elem.evaluate((el) =>
        el.scrollIntoView({
          block: "center",
          behavior: scrollSpeed < 90 ? "smooth" : undefined,
        })
      );
    }
  }

  // -------------------------------------------------------------------------
  // Element resolution
  // -------------------------------------------------------------------------

  /**
   * Resolve `selector` (CSS or XPath string, or an existing `ElementHandle`)
   * to an `ElementHandle`. Supports `waitForSelector` timeout.
   */
  public async getElement(
    selector: string | ElementHandle,
    options?: GetElementOptions
  ): Promise<ElementHandle<SVGElement | HTMLElement>> {
    if (typeof selector !== "string") {
      return selector as ElementHandle<SVGElement | HTMLElement>;
    }

    const opts = {
      ...this.defaultOptions?.getElement,
      ...options,
    };

    const isXPath =
      selector.startsWith("//") || selector.startsWith("(//");
    const resolved = isXPath ? `xpath=.${selector}` : selector;

    if (opts.waitForSelector !== undefined) {
      await this.page.waitForSelector(resolved, {
        timeout: opts.waitForSelector,
      });
    }

    let elem: ElementHandle<SVGElement | HTMLElement> | null;

    if (isXPath) {
      const handles = await this.page.$$(resolved);
      elem =
        (handles[0] as unknown as ElementHandle<SVGElement | HTMLElement>) ??
        null;
    } else {
      elem = await this.page.$(selector);
    }

    if (elem === null) {
      throw new Error(
        `Could not find element with selector "${selector}". ` +
          `Consider passing "waitForSelector" to wait for it to appear.`
      );
    }

    return elem;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a new `GhostCursor` bound to `page`.
 *
 * @example
 * ```ts
 * const cursor = createCursor(page, { visible: true })
 * await cursor.click('#submit')
 * ```
 */
export const createCursor = (
  page: Page,
  options: CreateCursorOptions = {}
): GhostCursor => new GhostCursor(page, options);
