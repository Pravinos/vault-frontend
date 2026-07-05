"use client";

import { type ReactNode } from "react";

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
};

export default function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const positionClasses =
    side === "top"
      ? "-top-8 left-1/2 -translate-x-1/2"
      : "top-full left-1/2 mt-1 -translate-x-1/2";

  return (
    <div className="relative inline-flex group/tooltip">
      {children}
      <div
        role="tooltip"
        className={`pointer-events-none absolute ${positionClasses} z-10 whitespace-nowrap rounded-md bg-[#0b1720] px-2 py-1 text-xs text-gray-300 opacity-0 invisible transition-opacity group-hover/tooltip:visible group-hover/tooltip:opacity-100`}
      >
        {content}
      </div>
    </div>
  );
}
