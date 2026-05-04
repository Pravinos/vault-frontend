"use client";

type ProviderBadgeProps = {
  provider: string;
  model: string;
};

const providerStyles: Record<string, string> = {
  groq: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  lmstudio: "border-sky-500/30 bg-sky-500/10 text-sky-200",
};

export default function ProviderBadge({ provider, model }: ProviderBadgeProps) {
  const providerKey = provider.toLowerCase();
  const colorClasses =
    providerStyles[providerKey] ?? "border-gray-600 bg-gray-700/30 text-gray-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${colorClasses}`}
      title={`${provider} / ${model}`}
    >
      {provider} / {model}
    </span>
  );
}
