"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateAiConfig } from "@/lib/api";
import type { AiConfig } from "@/types";
import AiProviderCard from "@/components/settings/AiProviderCard";
import ErrorMessage from "@/components/ui/ErrorMessage";
import SelectField from "@/components/ui/SelectField";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import {
  CURRENCY_OPTIONS,
  getCurrencyOptionLabel,
  useCurrency,
  type CurrencyCode,
} from "@/lib/currencyContext";
import { useAiSettings } from "@/lib/hooks/useAiSettings";
import { queryKeys } from "@/lib/queryKeys";

const DEFAULT_CONFIG: AiConfig = {
  chat: { provider: "lmstudio", model: "" },
  summary: { provider: "groq", model: "" },
  availableModels: { lmstudio: [], groq: [] },
};

function GeneralSettingsSection({
  currency,
  onCurrencyChange,
}: {
  currency: CurrencyCode;
  onCurrencyChange: (code: CurrencyCode) => void;
}) {
  return (
    <section className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">General</h2>
        <p className="mt-1 text-sm text-gray-400">App-wide display preferences</p>
      </div>

      <SelectField
        label="Display currency"
        value={currency}
        onChange={(event) => onCurrencyChange(event.target.value as CurrencyCode)}
      >
        {CURRENCY_OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            {getCurrencyOptionLabel(option.code)}
          </option>
        ))}
      </SelectField>

      <p className="text-xs text-gray-500">
        This changes how amounts are displayed. It does not convert values between currencies.
      </p>
    </section>
  );
}

export default function SettingsPage() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const { currency: savedCurrency, setCurrency } = useCurrency();
  const [localCurrency, setLocalCurrency] = useState<CurrencyCode>(savedCurrency);
  const [localChat, setLocalChat] = useState(DEFAULT_CONFIG.chat);
  const [localSummary, setLocalSummary] = useState(DEFAULT_CONFIG.summary);
  const [savedConfig, setSavedConfig] = useState<AiConfig | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  const qc = useQueryClient();
  const { data: config, isLoading: loading, error, refetch } = useAiSettings();

  useEffect(() => {
    setLocalCurrency(savedCurrency);
  }, [savedCurrency]);

  useEffect(() => {
    if (!config) return;

    setLocalChat(config.chat ?? DEFAULT_CONFIG.chat);
    setLocalSummary(config.summary ?? DEFAULT_CONFIG.summary);
    setSavedConfig({
      ...config,
      chat: config.chat ?? DEFAULT_CONFIG.chat,
      summary: config.summary ?? DEFAULT_CONFIG.summary,
    });
  }, [config]);

  const handleChatChange = useCallback(
    (next: { provider: "lmstudio" | "groq"; model: string }) => {
      setLocalChat(next);
    },
    [],
  );

  const handleSummaryChange = useCallback(
    (next: { provider: "lmstudio" | "groq"; model: string }) => {
      setLocalSummary(next);
    },
    [],
  );

  const isAiDirty = useMemo(() => {
    if (!savedConfig) return false;
    return (
      savedConfig.chat.provider !== localChat.provider ||
      savedConfig.chat.model !== localChat.model ||
      savedConfig.summary.provider !== localSummary.provider ||
      savedConfig.summary.model !== localSummary.model
    );
  }, [savedConfig, localChat, localSummary]);

  const isCurrencyDirty = localCurrency !== savedCurrency;
  const isDirty = isAiDirty || isCurrencyDirty;

  const handleSaveAll = async () => {
    setSavingAll(true);
    setToast(null);

    if (isCurrencyDirty) {
      setCurrency(localCurrency);
    }

    if (!isAiDirty) {
      if (isCurrencyDirty) {
        setToast({ message: "Settings saved", type: "success" });
      }
      setSavingAll(false);
      return;
    }

    const ops = [
      updateAiConfig({ task: "chat", provider: localChat.provider, model: localChat.model }),
      updateAiConfig({ task: "summary", provider: localSummary.provider, model: localSummary.model }),
    ];

    const results = await Promise.allSettled(ops);
    const [chatRes, summaryRes] = results;

    const failedTasks: string[] = [];
    if (chatRes.status === "rejected") failedTasks.push("Chat");
    if (summaryRes.status === "rejected") failedTasks.push("Summary");

    if (failedTasks.length > 0) {
      const message =
        failedTasks.length === 2
          ? "Failed to save settings"
          : `Failed to save ${failedTasks[0]} settings`;
      setToast({ message, type: "error" });
      if (failedTasks.length === 1) {
        await qc.invalidateQueries({ queryKey: queryKeys.aiSettings });
      }
    } else {
      setSavedConfig((prev) =>
        prev ? { ...prev, chat: localChat, summary: localSummary } : prev,
      );
      setToast({
        message: isCurrencyDirty ? "Settings saved" : "AI settings saved",
        type: "success",
      });
      await qc.invalidateQueries({ queryKey: queryKeys.aiSettings });
    }

    setSavingAll(false);
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-gray-400">Manage app preferences and AI configuration</p>
      </div>

      <GeneralSettingsSection
        currency={localCurrency}
        onCurrencyChange={setLocalCurrency}
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">AI</h2>
          <p className="mt-1 text-sm text-gray-400">Configure providers and models for each AI task</p>
        </div>

        {error ? (
          <ErrorMessage
            message="Unable to load AI settings."
            onRetry={() => void refetch()}
          />
        ) : loading || !config ? (
          <div className="flex max-w-2xl flex-col gap-6">
            <Skeleton variant="card" className="h-52 rounded-xl" />
            <Skeleton variant="card" className="h-52 rounded-xl" />
            <Skeleton variant="text" className="h-10 w-36 rounded-lg" />
          </div>
        ) : (
          <div className="flex max-w-2xl flex-col gap-6">
            <AiProviderCard
              title="Chat"
              task="chat"
              config={localChat}
              onChange={handleChatChange}
            />
            <AiProviderCard
              title="Weekly Summary"
              task="summary"
              config={localSummary}
              note="Groq (llama3-70b-8192) is recommended for the best summary quality."
              onChange={handleSummaryChange}
            />

          </div>
        )}
      </section>

      <div className="flex justify-start">
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={!isDirty || savingAll}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {savingAll ? "Saving…" : "Save settings"}
        </button>
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
