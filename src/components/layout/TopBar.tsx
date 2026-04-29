"use client";

import type { ReactNode } from "react";

type TopBarProps = {
  title: string;
  action?: ReactNode;
};

export default function TopBar({ title, action }: TopBarProps) {
  return (
    <header className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      {action ? <div>{action}</div> : null}
    </header>
  );
}
