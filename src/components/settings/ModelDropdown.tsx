import { ChevronDown } from "lucide-react";

interface ModelDropdownProps {
  models: string[];
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}

export default function ModelDropdown({ models, value, onChange, disabled }: ModelDropdownProps) {
  const isDisabled = disabled || models.length === 0;

  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isDisabled}
        className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-base text-white transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {models.length === 0 && (
          <option value="">No models available</option>
        )}
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  );
}
