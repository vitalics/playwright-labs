import type { TestStep } from "@playwright/test/reporter";

/** Outcome of a polling assertion step. */
export type PollOutcome = "pass" | "timeout";

/** Information about a polling assertion (`expect.poll` / `expect().toPass()`). */
export type PollInfo = {
  /** Number of poll attempts (child steps when Playwright reports them, otherwise 1). */
  attempts: number;
  /** `pass` when the poll eventually succeeded, `timeout` when it did not. */
  outcome: PollOutcome;
};

/**
 * Returns `true` when the step is an `expect.poll()` / `expect().toPass()`
 * polling assertion.
 *
 * Playwright reports a poll as an `expect`-category step whose children are
 * the individual poll attempts (also `expect`-category). Polls with a custom
 * `message` option get that message as the title, so the title-based check
 * (`Expect "poll …"` / `Expect "toPass"`) is not sufficient on its own —
 * the children shape is the reliable signal.
 */
export function isExpectPollStep(step: TestStep): boolean {
  if (step.category !== "expect") return false;
  if (step.title.startsWith('Expect "poll') || step.title === 'Expect "toPass"') {
    return true;
  }
  return (
    step.steps.length > 0 &&
    step.steps.every((child) => child.category === "expect")
  );
}

/**
 * Returns poll info for a polling assertion step, or `null` when the step is
 * not a poll (see {@link isExpectPollStep}).
 *
 * Attempt counting: `expect.poll` nests one child step per attempt, so the
 * children count is the attempt count; `expect().toPass()` does not nest
 * attempts, so it counts as 1.
 */
export function getExpectPollInfo(step: TestStep): PollInfo | null {
  if (!isExpectPollStep(step)) return null;
  return {
    attempts: Math.max(step.steps.length, 1),
    outcome: step.error ? "timeout" : "pass",
  };
}
