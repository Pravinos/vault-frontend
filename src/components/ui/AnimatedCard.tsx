"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";

import { getStaggerDelayMs } from "@/lib/motion";

type AnimatedCardProps = {
  children: ReactNode;
  className?: string;
  staggerIndex?: number;
  as?: ElementType;
  style?: CSSProperties;
};

export default function AnimatedCard({
  children,
  className = "",
  staggerIndex,
  as: Component = "div",
  style,
}: AnimatedCardProps) {
  const staggerStyle =
    staggerIndex !== undefined
      ? { animationDelay: `${getStaggerDelayMs(staggerIndex)}ms`, ...style }
      : style;

  return (
    <Component className={`animate-card-enter ${className}`.trim()} style={staggerStyle}>
      {children}
    </Component>
  );
}
