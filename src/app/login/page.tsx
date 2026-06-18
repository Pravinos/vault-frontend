"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import AuthPageShell, { AuthErrorAlert } from "@/components/auth/AuthPageShell";
import {
  completeAuthSession,
  GENERIC_ERROR,
  getRetryAfterMinutes,
  MISCONFIGURED_ERROR,
  parseJsonBody,
  SERVER_UNREACHABLE,
  trimPassword,
} from "@/lib/auth-forms";

function LoginForm() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmed = trimPassword(password);
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: trimmed }),
      });

      if (res.ok) {
        const data = await parseJsonBody<{ token?: string }>(res);
        await completeAuthSession(data);
        return;
      }

      if (res.status === 401) {
        setError("Wrong password. Please try again.");
        return;
      }

      if (res.status === 403) {
        setError("Vault hasn't been set up yet.");
        return;
      }

      if (res.status === 429) {
        const minutes = getRetryAfterMinutes(res);
        setError(`Too many attempts. Please wait ${minutes} minute(s) and try again.`);
        return;
      }

      if (res.status === 503) {
        setError(SERVER_UNREACHABLE);
        return;
      }

      if (res.status === 500) {
        setError(MISCONFIGURED_ERROR);
        return;
      }

      setError(GENERIC_ERROR);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell
      banner={
        reason === "expired" ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <span className="mt-0.5 text-lg leading-none">⏱</span>
            <div>
              <p className="font-semibold">Your session has expired</p>
              <p className="mt-0.5 text-xs text-amber-300/70">
                For your security, sessions last 24 hours. Enter your password to continue.
              </p>
            </div>
          </div>
        ) : null
      }
      footer={
        <p className="pb-4 text-center text-xs text-gray-600">
          🔒 Your data is private and protected by your password
        </p>
      }
    >
      <div className="rounded-3xl border border-white/10 bg-[#111c2a]/80 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-10">
        <div className="mb-8 flex flex-col items-center">
          <img src="/vault-logo.svg" alt="Vault" className="mb-6 h-auto w-34" />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {reason === "expired" ? "Session Expired" : "Welcome back"}
          </h1>
          <p className="mt-1 text-center text-sm text-gray-400">
            {reason === "expired"
              ? "Re-enter your password to unlock Vault"
              : "Enter your password to access your Vault"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-300">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-base text-white placeholder-gray-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 transition-colors hover:text-gray-300"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <AuthErrorAlert message={error} />

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="mt-2 w-full rounded-xl bg-emerald-500 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all duration-150 hover:bg-emerald-400 active:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Verifying...
              </span>
            ) : (
              "Enter Vault"
            )}
          </button>

          <p className="text-center text-xs text-gray-600">
            Forgot your password?{" "}
            <Link
              href="/reset-password"
              className="text-gray-500 underline-offset-2 transition-colors hover:text-gray-300 hover:underline"
            >
              Reset it
            </Link>
          </p>
        </form>
      </div>
    </AuthPageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
