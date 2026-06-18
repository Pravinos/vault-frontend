"use client";

import { FormEvent, useState } from "react";

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

const WHY_ITEMS = [
  {
    icon: "🌐",
    title: "You're self-hosting this app",
    description:
      "Vault is designed to be deployed on your own server or a cloud platform like Render. Anyone with your URL can reach it - a password keeps your data yours.",
  },
  {
    icon: "🔒",
    title: "No accounts, no tracking",
    description:
      "There's no user registration, no email, no third-party auth. Just one password that only you know, stored as a secure hash - never in plain text.",
  },
  {
    icon: "📊",
    title: "Your financial data stays private",
    description:
      "Expenses, income, accounts, goals - all of it is personal. This password gate ensures only you can view or manage it.",
  },
];

export default function SetupPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");

    const trimmed = trimPassword(password);
    const trimmedConfirm = trimPassword(confirm);

    if (trimmed.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (trimmed !== trimmedConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: trimmed }),
      });

      if (res.ok) {
        const data = await parseJsonBody<{ token?: string }>(res);
        await completeAuthSession(data);
        return;
      }

      if (res.status === 409) {
        setError("A password is already set. Redirecting to login...");
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
        return;
      }

      if (res.status === 429) {
        const minutes = getRetryAfterMinutes(res);
        setError(`Too many attempts. Please wait ${minutes} minute(s) before trying again.`);
        return;
      }

      if (res.status === 400) {
        const body = await parseJsonBody<{ error?: string }>(res);
        setError(body.error ?? "Invalid password.");
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

      const body = await parseJsonBody<{ error?: string }>(res);
      setError(body.error ?? GENERIC_ERROR);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const trimmed = trimPassword(password);
  const trimmedConfirm = trimPassword(confirm);

  const lengthHint =
    password.length === 0
      ? null
      : trimmed.length < 8
        ? "weak"
        : trimmed.length < 12
          ? "fair"
          : "strong";

  return (
    <AuthPageShell
      maxWidth="lg"
      footer={
        <p className="pb-4 text-center text-xs text-gray-600">
          🔒 Password is stored as a BCrypt hash - never in plain text
        </p>
      }
    >
      <div className="rounded-3xl border border-white/10 bg-[#111c2a]/80 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/vault-logo.svg" alt="Vault" className="mb-6 h-auto w-34" />
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Welcome to Vault</h1>
          <p className="mt-2 max-w-xs text-sm text-gray-400">
            Your personal finance assistant is ready. Let&apos;s secure it first.
          </p>
        </div>

        <div className="mb-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Why do I need a password?
          </p>
          {WHY_ITEMS.map((item) => (
            <div key={item.title} className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 p-4">
              <span className="mt-0.5 shrink-0 text-xl">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8 border-t border-white/5" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Set your password
          </p>

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
                placeholder="Min. 8 characters"
                required
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

            {lengthHint ? (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {["weak", "fair", "strong"].map((level, i) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-all duration-300
                          ${lengthHint === "weak" && i === 0 ? "bg-red-500" : ""}
                          ${lengthHint === "fair" && i <= 1 ? "bg-amber-400" : ""}
                          ${lengthHint === "strong" ? "bg-emerald-500" : ""}
                          ${(lengthHint === "weak" && i > 0) ||
                          (lengthHint === "fair" && i > 1)
                            ? "bg-white/10"
                            : ""}
                        `}
                    />
                  ))}
                </div>
                <span
                  className={`text-xs font-medium
                      ${lengthHint === "weak" ? "text-red-400" : ""}
                      ${lengthHint === "fair" ? "text-amber-400" : ""}
                      ${lengthHint === "strong" ? "text-emerald-400" : ""}
                    `}
                >
                  {lengthHint.charAt(0).toUpperCase() + lengthHint.slice(1)} length
                </span>
              </div>
            ) : null}
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-gray-300">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              required
              className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-base text-white placeholder-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                  ${
                    confirm && trimmedConfirm !== trimmed
                      ? "border-red-500/50"
                      : confirm && trimmedConfirm === trimmed
                        ? "border-emerald-500/50"
                        : "border-white/10"
                  }`}
            />
            {confirm && trimmedConfirm === trimmed ? (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-400">
                <span>✓</span> Passwords match
              </p>
            ) : null}
          </div>

          <AuthErrorAlert message={error} />

          <button
            type="submit"
            disabled={loading || trimmed.length < 8 || trimmed !== trimmedConfirm}
            className="mt-2 w-full rounded-xl bg-emerald-500 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all duration-150 hover:bg-emerald-400 active:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Setting up...
              </span>
            ) : (
              "Secure & Enter Vault"
            )}
          </button>
        </form>
      </div>
    </AuthPageShell>
  );
}
