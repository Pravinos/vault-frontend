"use client";

import { useEffect, useState } from "react";

import { DURATION_MODAL, prefersReducedMotion } from "@/lib/motion";

export function useEnterExitAnimation(isOpen: boolean, durationMs = DURATION_MODAL) {
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
