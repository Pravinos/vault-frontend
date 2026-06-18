"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AuthPageShell from "@/components/auth/AuthPageShell";

export default function StartingPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Checking backend status...");
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    let attempts = 0;
    let redirected = false;
    const maxAttempts = 30;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const stopPolling = () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const check = async () => {
      if (redirected) return;

      try {
        const res = await fetch("/api/auth/status", { cache: "no-store" });
        if (!res.ok) throw new Error("Backend not ready");

        const data = await res.json();

        if (data.configured === true) {
          redirected = true;
          stopPolling();
          router.replace("/login");
          return;
        }
        if (data.configured === false) {
          redirected = true;
          stopPolling();
          router.replace("/setup");
          return;
        }
        throw new Error("Unexpected response");
      } catch {
        if (redirected) return;

        attempts++;
        if (attempts >= maxAttempts) {
          stopPolling();
          setStatus("Backend is taking too long to respond.");
          setShowRetry(true);
        } else {
          setStatus(`Waiting for backend... (${attempts}/${maxAttempts})`);
        }
      }
    };

    check();
    intervalId = setInterval(check, 3000);

    return stopPolling;
  }, [router]);

  return (
    <AuthPageShell>
      <div className="rounded-3xl border border-white/10 bg-[#111c2a]/80 p-8 text-center shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-10">
        <img src="/vault-logo.svg" alt="Vault" className="mx-auto mb-6 h-auto w-34" />
        <h1 className="text-2xl font-bold tracking-tight text-white">Vault is starting up</h1>
        <p className="mt-3 text-sm text-gray-400">{status}</p>
        {showRetry ? (
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all duration-150 hover:bg-emerald-400"
          >
            Retry
          </button>
        ) : (
          <div className="mt-6 flex justify-center">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
          </div>
        )}
      </div>
    </AuthPageShell>
  );
}
