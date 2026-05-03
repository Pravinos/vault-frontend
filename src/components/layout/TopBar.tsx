"use client";

import type { ReactNode } from "react";

type TopBarProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export default function TopBar({ title, subtitle, action }: TopBarProps) {
  return (
    <header className="border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-gray-400">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </header>
  );
}
