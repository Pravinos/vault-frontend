import { useCallback, useEffect, useState } from "react";

import { getGroqModels, getLmStudioModels } from "@/lib/api";

export type ProviderConnectivityStatus = "loading" | "connected" | "disconnected";

export function useAiProviderModels() {
  const [lmModels, setLmModels] = useState<string[]>([]);
  const [groqModels, setGroqModels] = useState<string[]>([]);
  const [lmStatus, setLmStatus] = useState<ProviderConnectivityStatus>("loading");
  const [groqStatus, setGroqStatus] = useState<ProviderConnectivityStatus>("loading");

  const loadModels = useCallback(async () => {
    setLmStatus("loading");
    setGroqStatus("loading");

    const [lmResult, groqResult] = await Promise.allSettled([
      getLmStudioModels(),
      getGroqModels(),
    ]);

    if (lmResult.status === "fulfilled") {
      setLmModels(lmResult.value);
      setLmStatus("connected");
    } else {
      setLmModels([]);
      setLmStatus("disconnected");
    }

    if (groqResult.status === "fulfilled") {
      setGroqModels(groqResult.value);
      setGroqStatus("connected");
    } else {
      setGroqModels([]);
      setGroqStatus("disconnected");
    }
  }, []);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  return {
    lmModels,
    groqModels,
    lmStatus,
    groqStatus,
    refetch: loadModels,
  };
}
