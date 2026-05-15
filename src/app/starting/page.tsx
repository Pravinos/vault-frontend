"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function StartingPage() {
  const router = useRouter();
  const [statusMsg, setStatusMsg] = useState("Waiting for backend...");
  const attemptsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      attemptsRef.current += 1;
      try {
        const res = await fetch("/api/auth/status", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.configured !== false) {
            // backend is ready — go to root
            router.replace("/");
            return;
          }
          if (!cancelled) setStatusMsg("Backend reachable but not configured. Redirecting to setup...");
          router.replace("/setup");
          return;
        }
      } catch {
        // ignore and retry
      }

      if (cancelled) return;

      const attempt = attemptsRef.current;
      const delay = Math.min(5000, 800 * attempt);
      setStatusMsg(`Backend still starting — retrying in ${Math.round(delay / 1000)}s`);
      setTimeout(check, delay);
    };

    // Start the checks
    check();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0d1520]">
      <div className="pointer-events-none absolute left-[-10%] top-[-20%] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-teal-500/8 blur-[140px]" />

      <div className="relative z-10 mx-4 w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-[#111c2a]/80 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-10">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/15">
              <span className="text-2xl">⏳</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Starting up</h1>
            <p className="mt-1 text-center text-sm text-gray-400">The backend is still starting. This page will auto-refresh.</p>
          </div>

          <div className="space-y-4 text-center">
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              <span>⚠</span>
              <span>{statusMsg}</span>
            </div>

            <div className="flex gap-2">
              <a href="/" className="flex-1 rounded-xl bg-white/5 py-2 text-sm text-white text-center hover:bg-white/10">
                Retry
              </a>
              <a href="/login" className="flex-1 rounded-xl border border-white/6 py-2 text-sm text-white text-center hover:bg-white/5">
                Go to Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
