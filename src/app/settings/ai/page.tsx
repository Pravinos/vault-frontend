"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateAiConfig } from "@/lib/api";
import type { AiConfig } from "@/types";
import AiProviderCard from "@/components/settings/AiProviderCard";
import Toast from "@/components/ui/Toast";
import { useAiSettings } from "@/lib/hooks/useAiSettings";
import { queryKeys } from "@/lib/queryKeys";

const DEFAULT_CONFIG: AiConfig = {
  chat: { provider: "lmstudio", model: "" },
  summary: { provider: "groq", model: "" },
  availableModels: { lmstudio: [], groq: [] },
};

export default function AiSettingsPage() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [localChat, setLocalChat] = useState(DEFAULT_CONFIG.chat);
  const [localSummary, setLocalSummary] = useState(DEFAULT_CONFIG.summary);
  const [savedConfig, setSavedConfig] = useState<AiConfig | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  const qc = useQueryClient();
  const { data: config, isLoading: loading } = useAiSettings();

  useEffect(() => {
    if (config) {
      setLocalChat(config.chat);
      setLocalSummary(config.summary);
      setSavedConfig(config);
    }
  }, [config]);

  const isDirty = useMemo(() => {
    if (!savedConfig) return false;
    return (
      savedConfig.chat.provider !== localChat.provider ||
      savedConfig.chat.model !== localChat.model ||
      savedConfig.summary.provider !== localSummary.provider ||
      savedConfig.summary.model !== localSummary.model
    );
  }, [savedConfig, localChat, localSummary]);

  const handleSaveAll = async () => {
    setSavingAll(true);
    setToast(null);
    const ops = [
      updateAiConfig({ task: "chat", provider: localChat.provider, model: localChat.model }),
      updateAiConfig({ task: "summary", provider: localSummary.provider, model: localSummary.model }),
    ];

    const results = await Promise.allSettled(ops);
    const [chatRes, summaryRes] = results;

    let hadError = false;
    if (chatRes.status === "rejected") {
      setToast({ message: "Failed to save Chat settings", type: "error" });
      hadError = true;
    }

    if (summaryRes.status === "rejected") {
      setToast({ message: "Failed to save Summary settings", type: "error" });
      hadError = true;
    }

    if (!hadError) {
      setToast({ message: "AI settings saved", type: "success" });
      await qc.invalidateQueries({ queryKey: queryKeys.aiSettings });
    }

    setSavingAll(false);
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
              initialConfig={localChat}
              onChange={(next) => setLocalChat({ provider: next.provider, model: next.model })}
            />
            <AiProviderCard
              title="Weekly Summary"
              task="summary"
              initialConfig={localSummary}
              note="Groq (llama3-70b-8192) is recommended for the best summary quality."
              onChange={(next) => setLocalSummary({ provider: next.provider, model: next.model })}
            />

            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={!isDirty || savingAll}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {savingAll ? "Saving…" : "Save all settings"}
              </button>
            </div>
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
