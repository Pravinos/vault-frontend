/**
 * Shared motion constants for JS-driven animations (rAF loops, Recharts, timers).
 * These mirror the CSS custom properties defined in `src/app/globals.css` (`--duration-*`,
 * `--ease-standard`) so that JS- and CSS-driven motion stay in sync. When changing timing,
 * update both this file and the `@theme` block in globals.css.
 */

/** Micro-interactions: hover/focus/press feedback. */
export const DURATION_FAST = 150;
/** Small UI transitions: tabs, dropdown chrome, list item stagger. */
export const DURATION_BASE = 200;
/** Modal/dialog/toast open + close. */
export const DURATION_MODAL = 250;
/** Progress bar fills, chart entrances, count-up-adjacent motion. */
export const DURATION_SLOW = 400;

/** Matches CSS `--ease-standard`; a gentle deceleration curve used for both enter and exit. */
export const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;
/** CSS-string form of EASE_STANDARD, for inline styles / Recharts `easing`-less consumers. */
export const EASE_STANDARD_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Per-item delay for staggered list entrances. Kept under 30ms per item as per design spec. */
export const STAGGER_STEP_MS = 20;
/** Hard cap on cumulative stagger delay so long lists don't feel sluggish to finish animating in. */
export const STAGGER_MAX_DELAY_MS = 240;

/** Returns a capped, evenly-stepped stagger delay (ms) for the nth item in a list/grid. */
export function getStaggerDelayMs(index: number): number {
  return Math.min(index * STAGGER_STEP_MS, STAGGER_MAX_DELAY_MS);
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}
