"use client";

import { useEffect, useState } from "react";
import { getAiConfig } from "@/lib/api";
import type { AiConfig } from "@/types";
import AiProviderCard from "@/components/settings/AiProviderCard";
import Toast from "@/components/ui/Toast";

const DEFAULT_CONFIG: AiConfig = {
  chat: { provider: "lmstudio", model: "" },
  summary: { provider: "groq", model: "" },
  availableModels: { lmstudio: [], groq: [] },
};

export default function AiSettingsPage() {
  const [config, setConfig] = useState<AiConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    getAiConfig()
      .then(setConfig)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const refreshConfig = () => {
    getAiConfig().then(setConfig).catch(() => {});
  };

  const handleSaved = () => {
    setToast({ message: "Settings saved.", type: "success" });
    refreshConfig();
  };

  const handleError = () => {
    setToast({ message: "Failed to save settings.", type: "error" });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">AI Settings</h1>
        <p className="mt-1 text-sm text-gray-400">Configure providers and models for each AI task</p>
      </div>

      <div>
        {loading ? (
          <p className="text-sm text-gray-400">Loading configuration…</p>
        ) : (
          <div className="flex flex-col gap-6 max-w-2xl">
            <AiProviderCard
              title="Chat"
              task="chat"
              initialConfig={config.chat}
              onSaved={handleSaved}
              onError={handleError}
            />
            <AiProviderCard
              title="Weekly Summary"
              task="summary"
              initialConfig={config.summary}
              note="Groq (llama3-70b-8192) is recommended for the best summary quality."
              onSaved={handleSaved}
              onError={handleError}
            />
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
