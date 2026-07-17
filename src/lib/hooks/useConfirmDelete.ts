"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useConfirmDelete() {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const pendingIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    pendingIdRef.current = null;
    setPendingId(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleDelete = useCallback(
    (id: string, onConfirm: () => void) => {
      if (pendingIdRef.current === id) {
        if (timerRef.current) clearTimeout(timerRef.current);
        clearPending();
        onConfirm();
        return;
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      pendingIdRef.current = id;
      setPendingId(id);
      timerRef.current = setTimeout(() => {
        clearPending();
      }, 3000);
    },
    [clearPending]
  );

  const isPendingConfirm = useCallback(
    (id: string) => pendingId === id,
    [pendingId]
  );

  return { handleDelete, isPendingConfirm };
}
