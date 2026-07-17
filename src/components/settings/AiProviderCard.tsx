"use client";

import type { AiTaskConfig } from "@/types";
import type { ProviderConnectivityStatus } from "@/lib/hooks/useAiProviderModels";
import ConnectivityIndicator from "./ConnectivityIndicator";
import ModelDropdown from "./ModelDropdown";

type Provider = "lmstudio" | "groq";

interface AiProviderCardProps {
  title: string;
  task: "chat" | "summary";
  config: AiTaskConfig;
  note?: string;
  lmModels: string[];
  groqModels: string[];
  lmStatus: ProviderConnectivityStatus;
  groqStatus: ProviderConnectivityStatus;
  onRetryConnectivity?: () => void;
  onChange: (next: { provider: Provider; model: string }) => void;
}

const MODEL_DESCRIPTIONS: Record<string, string> = {
  "llama-3.1-8b-instant": "Fast · Low cost · Good for quick chat responses",
  "llama-3.3-70b-versatile": "Balanced · Best for detailed analysis",
  "llama3-70b-8192": "Most capable · Recommended for summaries",
  "llama-3.1-70b-versatile": "High quality · Slower response time",
};

export default function AiProviderCard({
  title,
  task,
  config,
  note,
  lmModels,
  groqModels,
  lmStatus,
  groqStatus,
  onRetryConnectivity,
  onChange,
}: AiProviderCardProps) {
  const provider = config.provider as Provider;
  const model = config.model;

  const activeModels = provider === "lmstudio" ? lmModels : groqModels;
  const activeStatus = provider === "lmstudio" ? lmStatus : groqStatus;
  const providerUnavailable = activeStatus === "disconnected" && activeModels.length === 0;

  const handleProviderChange = (next: Provider) => {
    const nextModels = next === "lmstudio" ? lmModels : groqModels;
    const nextModel = nextModels.includes(model) ? model : (nextModels[0] ?? "");
    onChange({ provider: next, model: nextModel });
  };

  const handleModelChange = (nextModel: string) => {
    onChange({ provider, model: nextModel });
  };

  return (
    <div className="rounded-card border border-border bg-surface-raised p-card-md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <ConnectivityIndicator
          status={activeStatus}
          onRetry={activeStatus === "disconnected" ? onRetryConnectivity : undefined}
        />
      </div>

      <div className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            Provider
          </legend>

          <div
            className="inline-flex gap-1 rounded-lg border border-border-strong bg-white/5 p-1"
            role="radiogroup"
            aria-label={`${title} provider`}
          >
            <button
              type="button"
              role="radio"
              aria-checked={provider === "lmstudio"}
              onClick={() => handleProviderChange("lmstudio")}
              className={`flex flex-col items-start rounded-md px-3 py-2 transition-colors ${
                provider === "lmstudio"
                  ? "bg-emerald-600 font-medium text-white"
                  : "bg-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              <span className="text-sm font-medium">LM Studio</span>
              <span className="text-xs leading-tight opacity-60">Local</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={provider === "groq"}
              onClick={() => handleProviderChange("groq")}
              className={`flex flex-col items-start rounded-md px-3 py-2 transition-colors ${
                provider === "groq"
                  ? "bg-emerald-600 font-medium text-white"
                  : "bg-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              <span className="text-sm font-medium">Groq</span>
              <span className="text-xs leading-tight opacity-60">Cloud · Fast</span>
            </button>
          </div>
        </fieldset>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Model</p>
          <ModelDropdown
            models={activeModels}
            value={model}
            onChange={handleModelChange}
            disabled={providerUnavailable}
          />

          {providerUnavailable && (
            <p className="mt-2 text-xs text-negative">
              Cannot reach {provider === "lmstudio" ? "LM Studio" : "Groq"}. Check your backend
              configuration{onRetryConnectivity ? " or retry the connection" : ""}.
            </p>
          )}

          {!model && activeModels.length > 0 && (
            <p className="mt-2 text-xs text-warning">Select a model to use for {task}.</p>
          )}

          {MODEL_DESCRIPTIONS[model] && (
            <p className="mt-2 flex items-center gap-2 text-xs text-gray-400">
              <span aria-hidden="true">💡</span>
              {MODEL_DESCRIPTIONS[model]}
            </p>
          )}
        </div>

        {note && (
          <p className="mb-0 mt-1 flex items-center gap-2 text-xs text-gray-400">
            <span aria-hidden="true">💡</span>
            {note}
          </p>
        )}
      </div>
    </div>
  );
}
