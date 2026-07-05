"use client";

import { useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "@/lib/motion";

/**
 * Returns a percentage/width value that animates from 0 → `value` once on mount (so progress
 * bars visibly "fill in" the first time they appear instead of rendering at final width), then
 * tracks `value` directly on subsequent updates so later changes still transition smoothly via
 * the `.progress-bar-fill` CSS class without replaying the from-zero entrance.
 */
export function useAnimatedProgress(value: number): number {
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? value : 0));
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value);
      hasMountedRef.current = true;
      return;
    }

    if (!hasMountedRef.current) {
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          hasMountedRef.current = true;
          setDisplay(value);
        });
      });
      return () => cancelAnimationFrame(frame);
    }

    setDisplay(value);
  }, [value]);

  return display;
}
