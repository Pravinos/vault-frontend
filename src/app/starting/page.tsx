"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StartingPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Checking backend status...");
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 30; // ~90 seconds total
    let intervalId: number | undefined;

    const check = async () => {
      try {
        const res = await fetch("/api/auth/status", { cache: "no-store" });
        if (!res.ok) throw new Error("Backend not ready");

        const data = await res.json();

        if (data.configured === true) {
          router.replace("/login");
          return;
        }
        if (data.configured === false) {
          router.replace("/setup");
          return;
        }
        throw new Error("Unexpected response");
      } catch {
        attempts++;
        if (attempts >= maxAttempts) {
          if (intervalId !== undefined) clearInterval(intervalId);
          setStatus("Backend is taking too long to respond.");
          setShowRetry(true);
        } else {
          setStatus(`Waiting for backend... (${attempts}/${maxAttempts})`);
        }
      }
    };

    check(); // immediate first check
    intervalId = window.setInterval(check, 3000);

    return () => {
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Vault is starting up</h1>
        <p className="text-muted-foreground">{status}</p>
        {showRetry && (
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
