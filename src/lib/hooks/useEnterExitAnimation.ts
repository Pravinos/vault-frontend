"use client";

import { useEffect, useState } from "react";

const EXIT_DURATION_MS = 250;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useEnterExitAnimation(isOpen: boolean, durationMs = EXIT_DURATION_MS) {
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setMounted(isOpen);
      setVisible(isOpen);
      return;
    }

    if (isOpen) {
      setMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [isOpen, durationMs]);

  return { mounted, visible };
}
