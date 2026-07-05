"use client";

import { useEffect, useState } from "react";
import { getLmStudioModels, getGroqModels } from "@/lib/api";
import type { AiTaskConfig } from "@/types";
import ConnectivityIndicator from "./ConnectivityIndicator";
import ModelDropdown from "./ModelDropdown";

type Provider = "lmstudio" | "groq";

interface AiProviderCardProps {
  title: string;
  task: "chat" | "summary";
  config: AiTaskConfig;
  note?: string;
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
  onChange,
}: AiProviderCardProps) {
  const provider = config.provider as Provider;
  const model = config.model;
  const [lmModels, setLmModels] = useState<string[]>([]);
  const [groqModels, setGroqModels] = useState<string[]>([]);
  const [lmStatus, setLmStatus] = useState<"loading" | "connected" | "disconnected">("loading");
  const [groqStatus, setGroqStatus] = useState<"loading" | "connected" | "disconnected">("loading");

  useEffect(() => {
    getLmStudioModels()
      .then((models) => {
        setLmModels(models);
        setLmStatus("connected");
      })
      .catch(() => {
        setLmModels([]);
        setLmStatus("disconnected");
      });

    getGroqModels()
      .then((models) => {
        setGroqModels(models);
        setGroqStatus("connected");
      })
      .catch(() => {
        setGroqModels([]);
        setGroqStatus("disconnected");
      });
  }, []);

  useEffect(() => {
    if (provider === "lmstudio" && !model && lmModels[0]) {
      onChange({ provider: "lmstudio", model: lmModels[0] });
    }
  }, [provider, model, lmModels, onChange]);

  useEffect(() => {
    if (provider === "groq" && !model && groqModels[0]) {
      onChange({ provider: "groq", model: groqModels[0] });
    }
  }, [provider, model, groqModels, onChange]);

  const activeModels = provider === "lmstudio" ? lmModels : groqModels;

  const handleProviderChange = (next: Provider) => {
    const nextModels = next === "lmstudio" ? lmModels : groqModels;
    const nextModel = nextModels[0] ?? "";
    onChange({ provider: next, model: nextModel });
  };

  const handleModelChange = (nextModel: string) => {
    onChange({ provider, model: nextModel });
  };

  return (
    <div className="rounded-card border border-gray-800 bg-gray-900 p-card-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {provider === "lmstudio" && <ConnectivityIndicator status={lmStatus} />}
        {provider === "groq" && <ConnectivityIndicator status={groqStatus} />}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Provider</p>

          <div className="provider-toggle inline-flex bg-white/5 border border-white/10 rounded-lg p-1 gap-2">
            <button
              type="button"
              onClick={() => handleProviderChange("lmstudio")}
              className={`flex flex-col items-start px-3 py-2 rounded-md transition-colors ${
                provider === "lmstudio"
                  ? "bg-emerald-600 text-white font-medium"
                  : "bg-transparent text-gray-400"
              }`}
            >
              <span className="text-sm font-medium">LM Studio</span>
              <span className="text-xs opacity-60 leading-tight">Local</span>
            </button>

            <button
              type="button"
              onClick={() => handleProviderChange("groq")}
              className={`flex flex-col items-start px-3 py-2 rounded-md transition-colors ${
                provider === "groq"
                  ? "bg-emerald-600 text-white font-medium"
                  : "bg-transparent text-gray-400"
              }`}
            >
              <span className="text-sm font-medium">Groq</span>
              <span className="text-xs opacity-60 leading-tight">Cloud · Fast</span>
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Model</p>
          <ModelDropdown models={activeModels} value={model} onChange={handleModelChange} />

          {MODEL_DESCRIPTIONS[model] && (
            <p className="mt-2 text-xs text-gray-400 flex items-center gap-2">
              <span>💡</span>
              {MODEL_DESCRIPTIONS[model]}
            </p>
          )}
        </div>

        {note && (
          <p className="text-xs text-gray-400 flex items-center gap-2 mt-1 mb-0">
            <span>💡</span>
            {note}
          </p>
        )}
      </div>
    </div>
  );
}
