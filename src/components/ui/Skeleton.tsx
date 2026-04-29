"use client";

type SkeletonProps = {
  variant: "text" | "card" | "stat" | "chart";
  className?: string;
};

const variantStyles: Record<string, string> = {
  text: "h-4 w-full",
  card: "h-40 w-full",
  stat: "h-24 w-full",
  chart: "h-64 w-full",
};

export default function Skeleton({ variant, className = "" }: SkeletonProps) {
  return (
    <div
      className={`bg-gray-700 animate-pulse rounded ${variantStyles[variant]} ${className}`}
    />
  );
}
