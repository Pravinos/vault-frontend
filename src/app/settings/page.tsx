"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useAiProviderModels } from "@/lib/hooks/useAiProviderModels";
import { useAiSettings } from "@/lib/hooks/useAiSettings";
import { queryKeys } from "@/lib/queryKeys";

const DEFAULT_CONFIG: AiConfig = {
  chat: { provider: "lmstudio", model: "" },
  summary: { provider: "groq", model: "" },
  availableModels: { lmstudio: [], groq: [] },
};

function SettingsSectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function GeneralSettingsSection({
  currency,
  onCurrencyChange,
}: {
  currency: CurrencyCode;
  onCurrencyChange: (code: CurrencyCode) => void;
}) {
  return (
    <section className="max-w-2xl space-y-4">
      <SettingsSectionHeader
        title="General"
        description="App-wide display preferences"
      />

      <div className="rounded-card border border-border bg-surface-raised p-card-md">
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

        <p className="mt-3 text-xs text-gray-500">
          This changes how amounts are displayed. It does not convert values between currencies.
        </p>
      </div>
    </section>
  );
}

function UnsavedChangesBar({
  saving,
  canSave,
  validationHint,
  onSave,
  onDiscard,
}: {
  saving: boolean;
  canSave: boolean;
  validationHint?: string;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-card border border-border-strong bg-surface-raised/95 p-4 shadow-lg backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-gray-300">You have unsaved changes</p>
        {validationHint && (
          <p className="mt-1 text-xs text-warning">{validationHint}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDiscard}
          disabled={saving}
          className="rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 disabled:opacity-50"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || saving}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
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
  const {
    lmModels,
    groqModels,
    lmStatus,
    groqStatus,
    refetch: refetchProviderModels,
  } = useAiProviderModels();

  const isDirtyRef = useRef(false);

  useEffect(() => {
    setLocalCurrency(savedCurrency);
  }, [savedCurrency]);

  useEffect(() => {
    if (!config || isDirtyRef.current) return;

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
  isDirtyRef.current = isDirty;

  const aiConfigValid = Boolean(localChat.model.trim() && localSummary.model.trim());
  const canSave = isDirty && (!isAiDirty || aiConfigValid);

  const handleDiscard = () => {
    setLocalCurrency(savedCurrency);
    if (savedConfig) {
      setLocalChat(savedConfig.chat);
      setLocalSummary(savedConfig.summary);
    }
    setToast(null);
  };

  const handleSaveAll = async () => {
    if (!canSave) return;

    setSavingAll(true);
    setToast(null);

    let currencySaved = false;
    const failedTasks: string[] = [];
    let nextSavedConfig = savedConfig;

    if (isCurrencyDirty) {
      setCurrency(localCurrency);
      currencySaved = true;
    }

    if (isAiDirty) {
      const ops = [
        { task: "chat" as const, config: localChat, label: "Chat" },
        { task: "summary" as const, config: localSummary, label: "Summary" },
      ];

      const results = await Promise.allSettled(
        ops.map(({ task, config: taskConfig }) =>
          updateAiConfig({
            task,
            provider: taskConfig.provider,
            model: taskConfig.model,
          }),
        ),
      );

      results.forEach((result, index) => {
        const { task, config: taskConfig, label } = ops[index];
        if (result.status === "rejected") {
          failedTasks.push(label);
          return;
        }

        nextSavedConfig = nextSavedConfig
          ? {
              ...nextSavedConfig,
              [task]: taskConfig,
            }
          : nextSavedConfig;
      });

      if (failedTasks.length === 0) {
        setSavedConfig(nextSavedConfig);
        await qc.invalidateQueries({ queryKey: queryKeys.aiSettings });
      }
    }

    if (failedTasks.length > 0) {
      if (nextSavedConfig !== savedConfig) {
        setSavedConfig(nextSavedConfig);
      }

      const aiMessage =
        failedTasks.length === 2
          ? "Failed to save AI settings"
          : `Failed to save ${failedTasks[0]} settings`;

      setToast({
        message: currencySaved && isAiDirty
          ? `${aiMessage}. Your currency preference was still saved.`
          : aiMessage,
        type: "error",
      });
    } else if (isAiDirty || isCurrencyDirty) {
      setToast({
        message:
          isAiDirty && isCurrencyDirty
            ? "Settings saved"
            : isCurrencyDirty
              ? "Display currency saved"
              : "AI settings saved",
        type: "success",
      });
    }

    setSavingAll(false);
  };

  return (
    <div className="space-y-8 pb-4 sm:space-y-10">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-gray-400">Manage app preferences and AI configuration</p>
      </div>

      <GeneralSettingsSection
        currency={localCurrency}
        onCurrencyChange={setLocalCurrency}
      />

      <section className="max-w-2xl space-y-4">
        <SettingsSectionHeader
          title="AI"
          description="Configure providers and models for each AI task"
        />

        {error ? (
          <ErrorMessage
            message="Unable to load AI settings."
            onRetry={() => void refetch()}
          />
        ) : loading || !config ? (
          <div className="flex flex-col gap-6">
            <Skeleton variant="card" className="h-52 rounded-xl" />
            <Skeleton variant="card" className="h-52 rounded-xl" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <AiProviderCard
              title="Chat"
              task="chat"
              config={localChat}
              lmModels={lmModels}
              groqModels={groqModels}
              lmStatus={lmStatus}
              groqStatus={groqStatus}
              onRetryConnectivity={() => void refetchProviderModels()}
              onChange={handleChatChange}
            />
            <AiProviderCard
              title="Weekly Summary"
              task="summary"
              config={localSummary}
              lmModels={lmModels}
              groqModels={groqModels}
              lmStatus={lmStatus}
              groqStatus={groqStatus}
              onRetryConnectivity={() => void refetchProviderModels()}
              note="Groq (llama3-70b-8192) is recommended for the best summary quality."
              onChange={handleSummaryChange}
            />
          </div>
        )}
      </section>

      {isDirty ? (
        <UnsavedChangesBar
          saving={savingAll}
          canSave={canSave}
          validationHint={
            isAiDirty && !aiConfigValid
              ? "Choose a model for each AI task before saving."
              : undefined
          }
          onSave={() => void handleSaveAll()}
          onDiscard={handleDiscard}
        />
      ) : null}

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
