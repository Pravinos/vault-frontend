"use client";

import { useCallback, useState } from "react";

import { useGenerateSummaryMutation } from "@/lib/hooks/useSummaryMutations";
import type { WeeklySummary } from "@/types";

type GenerateToast = {
  message: string;
  type: "success" | "error";
};

export function useGenerateSummary(onSuccess?: (summary: WeeklySummary) => void) {
  const [toast, setToast] = useState<GenerateToast | null>(null);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  const mutation = useGenerateSummaryMutation()

  const generate = useCallback(async () => {
    try {
      const summary = await mutation.mutateAsync(undefined)
      setToast({ message: "Weekly summary generated", type: "success" });
      onSuccess?.(summary);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Summary generation failed:", error);
      }
      setToast({
        message: "Summary generation failed - check your AI provider settings",
        type: "error",
      });
    }
  }, [mutation, onSuccess]);

  return { generate, isGenerating: mutation.isPending, toast, clearToast };
}
