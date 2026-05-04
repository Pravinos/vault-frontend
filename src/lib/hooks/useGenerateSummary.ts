"use client";

import { useCallback, useState } from "react";

import { generateWeeklySummary } from "@/lib/api";
import type { WeeklySummary } from "@/types";

type GenerateToast = {
  message: string;
  type: "success" | "error";
};

export function useGenerateSummary(onSuccess: (summary: WeeklySummary) => void) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<GenerateToast | null>(null);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  const generate = useCallback(async () => {
    setIsGenerating(true);

    try {
      const summary = await generateWeeklySummary();
      setToast({ message: "Weekly summary generated", type: "success" });
      onSuccess(summary);
    } catch {
      setToast({
        message: "Summary generation failed - check your AI provider settings",
        type: "error",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [onSuccess]);

  return { generate, isGenerating, toast, clearToast };
}
