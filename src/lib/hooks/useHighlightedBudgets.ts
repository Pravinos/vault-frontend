"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  HIGHLIGHTED_BUDGETS_CHANGED_EVENT,
  HIGHLIGHTED_BUDGETS_KEY,
  MAX_HIGHLIGHTED_BUDGETS,
  readHighlightedBudgetIds,
  sortedCategoryIdsKey,
  toggleHighlightedBudgetId,
  writeHighlightedBudgetIds,
} from "@/lib/highlightedBudgets";

export function useHighlightedBudgets(month: string, validCategoryIds?: number[]) {
  const [highlightedIds, setHighlightedIds] = useState<number[]>([]);

  const validCategoryKey = useMemo(
    () => (validCategoryIds ? sortedCategoryIdsKey(validCategoryIds) : ""),
    [validCategoryIds]
  );

  const syncFromStorage = useCallback(() => {
    if (!month) {
      setHighlightedIds([]);
      return;
    }
    setHighlightedIds(readHighlightedBudgetIds(month));
  }, [month]);

  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === HIGHLIGHTED_BUDGETS_KEY || event.key === null) {
        syncFromStorage();
      }
    };

    const handleCustomChange = () => {
      syncFromStorage();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(HIGHLIGHTED_BUDGETS_CHANGED_EVENT, handleCustomChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(HIGHLIGHTED_BUDGETS_CHANGED_EVENT, handleCustomChange);
    };
  }, [syncFromStorage]);

  useEffect(() => {
    if (!month || !validCategoryIds || validCategoryIds.length === 0) return;

    const valid = new Set(validCategoryIds);
    const pruned = readHighlightedBudgetIds(month)
      .filter((id) => valid.has(id))
      .slice(0, MAX_HIGHLIGHTED_BUDGETS);

    const current = readHighlightedBudgetIds(month);
    if (
      pruned.length !== current.length ||
      pruned.some((id, index) => id !== current[index])
    ) {
      writeHighlightedBudgetIds(month, pruned);
      setHighlightedIds(pruned);
    }
  }, [month, validCategoryKey, validCategoryIds]);

  const setHighlights = useCallback(
    (ids: number[]) => {
      if (!month) return;
      writeHighlightedBudgetIds(month, ids);
      setHighlightedIds(ids.slice(0, MAX_HIGHLIGHTED_BUDGETS));
    },
    [month]
  );

  const toggleHighlight = useCallback(
    (categoryId: number) => {
      if (!month) return { ids: [] as number[] };

      const current = readHighlightedBudgetIds(month);
      const result = toggleHighlightedBudgetId(month, categoryId, current);
      setHighlightedIds(result.ids);
      return result;
    },
    [month]
  );

  return {
    highlightedIds,
    setHighlights,
    toggleHighlight,
    maxHighlights: MAX_HIGHLIGHTED_BUDGETS,
  };
}
