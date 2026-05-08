import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, duration = 400): number {
  const [value, setValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      setValue(target);
      hasAnimated.current = true;
      return;
    }

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setValue(target);
      hasAnimated.current = true;
      return;
    }

    if (hasAnimated.current) {
      setValue(target);
      return;
    }

    if (target === 0) {
      setValue(0);
      return;
    }

    startTime.current = null;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target * 100) / 100;
      setValue(current);
      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      } else {
        setValue(target);
        hasAnimated.current = true;
      }
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [target, duration]);

  return value;
}
