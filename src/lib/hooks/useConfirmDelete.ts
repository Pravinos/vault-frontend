"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useConfirmDelete() {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleDelete = useCallback(
    (id: string, onConfirm: () => void) => {
      if (pendingId === id) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setPendingId(null);
        onConfirm();
      } else {
        if (timerRef.current) clearTimeout(timerRef.current);
        setPendingId(id);
        timerRef.current = setTimeout(() => setPendingId(null), 3000);
      }
    },
    [pendingId]
  );

  const isPendingConfirm = useCallback(
    (id: string) => pendingId === id,
    [pendingId]
  );

  return { handleDelete, isPendingConfirm };
}
