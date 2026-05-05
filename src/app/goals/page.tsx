"use client";

import Link from "next/link";
import { Ban } from "lucide-react";

export default function GoalsPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl font-bold text-white sm:text-2xl">Goals</h1>

      <div className="rounded-2xl border border-gray-800 bg-[#1a2332] p-6 sm:p-8">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
            <Ban className="h-7 w-7" />
          </div>

          <p className="text-lg font-semibold text-white">Goals is temporarily disabled</p>
          <p className="mt-2 text-sm text-gray-400">
            This feature has been hidden for now and will be re-enabled later.
          </p>

          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
