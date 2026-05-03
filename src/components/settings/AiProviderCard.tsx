"use client";

import { useEffect, useState } from "react";
import { getLmStudioModels, getGroqModels, updateAiConfig } from "@/lib/api";
import type { AiTaskConfig } from "@/types";
import ConnectivityIndicator from "./ConnectivityIndicator";
import ModelDropdown from "./ModelDropdown";

type Provider = "lmstudio" | "groq";

interface AiProviderCardProps {
  title: string;
  task: "chat" | "summary";
  initialConfig: AiTaskConfig;
  note?: string;
  onSaved: () => void;
  onError: () => void;
}

export default function AiProviderCard({
  title,
  task,
  initialConfig,
  note,
  onSaved,
  onError,
}: AiProviderCardProps) {
  const [provider, setProvider] = useState<Provider>(initialConfig.provider);
  const [model, setModel] = useState(initialConfig.model);
  const [lmModels, setLmModels] = useState<string[]>([]);
  const [groqModels, setGroqModels] = useState<string[]>([]);
  const [lmStatus, setLmStatus] = useState<"idle" | "ok" | "error">("idle");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLmStudioModels()
      .then((models) => {
        setLmModels(models);
        setLmStatus("ok");
      })
      .catch(() => {
        setLmStatus("error");
      });

    getGroqModels()
      .then(setGroqModels)
      .catch(() => {});
  }, []);

  const activeModels = provider === "lmstudio" ? lmModels : groqModels;

  const handleProviderChange = (next: Provider) => {
    setProvider(next);
    const nextModels = next === "lmstudio" ? lmModels : groqModels;
    setModel(nextModels[0] ?? "");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAiConfig({ task, provider, model });
      onSaved();
    } catch {
      onError();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {provider === "lmstudio" && <ConnectivityIndicator status={lmStatus} />}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            Provider
          </p>
          <div className="flex gap-2">
            {(["lmstudio", "groq"] as Provider[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleProviderChange(p)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  provider === p
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {p === "lmstudio" ? "LM Studio" : "Groq"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            Model
          </p>
          <ModelDropdown
            models={activeModels}
            value={model}
            onChange={setModel}
          />
        </div>

        {note && (
          <p className="rounded-lg bg-gray-800/60 px-3 py-2 text-xs text-gray-400">
            {note}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="self-start rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
