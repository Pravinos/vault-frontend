"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface TransactionSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function TransactionSearch({ value, onChange, placeholder }: TransactionSearchProps) {
  const [local, setLocal] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceMs = 300;

  // Keep local in sync when parent value changes
  useEffect(() => setLocal(value ?? ""), [value]);

  // Debounce updates to parent
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (local !== value) onChange(local);
    }, debounceMs);
    return () => window.clearTimeout(id);
  }, [local, value, onChange]);

  // Keyboard shortcut: focus input on '/'
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleClear = () => {
    setLocal("");
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <Search className="w-4 h-4" />
      </span>

      <input
        ref={inputRef}
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder ?? "Search transactions..."}
        className="w-full rounded-lg bg-[#141c2a] border border-slate-700 pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors duration-150"
      />

      {/* Right side: either shortcut badge or clear button */}
      {local.length > 0 ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      ) : (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-500 border border-slate-700 rounded px-1.5 py-0.5 hidden md:block">
          /
        </div>
      )}
    </div>
  );
}
