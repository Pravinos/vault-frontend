"use client";

import { categoryColorMap } from "@/lib/utils";

type BadgeProps = {
  category: string;
};

export default function Badge({ category }: BadgeProps) {
  const classes = categoryColorMap[category] ?? "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {category}
    </span>
  );
}
