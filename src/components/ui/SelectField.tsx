import { ChevronDown } from "lucide-react";

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
}

export default function SelectField({ label, children, className, ...props }: SelectFieldProps) {
  return (
    <div className={`w-full ${className ?? ""}`}>
      {label ? (
        <label className="mb-2 block text-sm font-medium text-gray-300">{label}</label>
      ) : null}
      <div className="relative w-full">
        <select
          {...props}
          className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-base text-white input-interactive focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
    </div>
  );
}
