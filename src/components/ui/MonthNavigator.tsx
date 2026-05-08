"use client";

import { useCallback, useMemo, useRef } from "react";

export interface MonthNavigatorProps {
  value: string; // YYYY-MM
  onChange: (month: string) => void;
}

function toLabel(monthStr: string) {
  const [y, m] = monthStr.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function toYYYYMM(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function MonthNavigator({ value, onChange }: MonthNavigatorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentMonth = useMemo(() => {
    return toYYYYMM(new Date());
  }, []);

  const goTo = useCallback(
    (monthStr: string) => {
      onChange(monthStr);
    },
    [onChange]
  );

  const prev = useCallback(() => {
    const [y, m] = value.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    d.setMonth(d.getMonth() - 1);
    goTo(toYYYYMM(d));
  }, [value, goTo]);

  const next = useCallback(() => {
    const [y, m] = value.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    d.setMonth(d.getMonth() + 1);
    goTo(toYYYYMM(d));
  }, [value, goTo]);

  const openPicker = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    // Some browsers support showPicker()
    // Fallback to click()
    // @ts-ignore
    if (typeof input.showPicker === "function") {
      // @ts-ignore
      input.showPicker();
    } else {
      input.click();
    }
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        // prevent moving into future
        if (value === currentMonth) return;
        next();
      }
    },
    [prev, next, value, currentMonth]
  );

  const disabledNext = value === currentMonth;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="flex items-center gap-2"
      aria-label="Month navigator"
    >
      <button
        type="button"
        onClick={prev}
        className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm text-white bg-transparent border border-white/10 hover:bg-white/5 focus:outline-none"
        aria-label="Previous month"
      >
        ‹
      </button>

      <div className="flex items-center">
        <button
          type="button"
          onClick={openPicker}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          {toLabel(value)}
        </button>
        <input
          ref={inputRef}
          type="month"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </div>

      <button
        type="button"
        onClick={next}
        disabled={disabledNext}
        className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm text-white bg-transparent border border-white/10 hover:bg-white/5 focus:outline-none ${
          disabledNext ? "opacity-40 pointer-events-none" : ""
        }`}
        aria-label="Next month"
      >
        ›
      </button>
    </div>
  );
}
