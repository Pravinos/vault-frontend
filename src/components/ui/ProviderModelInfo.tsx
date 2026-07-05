"use client";

import { Info } from "lucide-react";

import Tooltip from "@/components/ui/Tooltip";

type ProviderModelInfoProps = {
  provider: string;
  model: string;
};

export default function ProviderModelInfo({ provider, model }: ProviderModelInfoProps) {
  const label = `${provider} / ${model}`;

  return (
    <div className="opacity-0 transition-opacity group-hover:opacity-100">
      <Tooltip content={label}>
        <button
          type="button"
          aria-label={`AI model: ${label}`}
          className="flex items-center rounded-md p-1 text-gray-500 hover:text-gray-400"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
    </div>
  );
}
