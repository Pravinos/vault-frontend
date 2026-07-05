"use client";

type ProviderBadgeProps = {
  provider: string;
  model: string;
  variant?: "default" | "subtle";
};

const providerStyles: Record<string, string> = {
  groq: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  lmstudio: "border-sky-500/30 bg-sky-500/10 text-sky-200",
};

const subtleProviderStyles: Record<string, string> = {
  groq: "border-emerald-500/15 bg-emerald-500/5 text-emerald-400/60",
  lmstudio: "border-sky-500/15 bg-sky-500/5 text-sky-400/60",
};

export default function ProviderBadge({ provider, model, variant = "default" }: ProviderBadgeProps) {
  const providerKey = provider.toLowerCase();
  const styles = variant === "subtle" ? subtleProviderStyles : providerStyles;
  const colorClasses = styles[providerKey] ?? "border-gray-700/40 bg-gray-800/20 text-gray-500";
  const sizeClasses =
    variant === "subtle" ? "px-1.5 py-px text-[10px] font-normal" : "px-2 py-0.5 text-[11px] font-medium";

  return (
    <span
      className={`inline-flex items-center rounded-full border ${sizeClasses} ${colorClasses}`}
      title={`${provider} / ${model}`}
    >
      {provider} / {model}
    </span>
  );
}
