"use client";

import Link from "next/link";
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

export default function ResetPasswordPage() {
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const trimmedPassword = trimPassword(newPassword);
    const trimmedConfirm = trimPassword(confirm);
    const trimmedToken = trimPassword(resetToken);

    if (trimmedPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken: trimmedToken, newPassword: trimmedPassword }),
      });

      if (res.ok) {
        const data = await parseJsonBody<{ token?: string }>(res);
        await completeAuthSession(data);
        return;
      }

      if (res.status === 401) {
        setError("Invalid reset token. Check the value set in your deployment environment.");
        return;
      }

      if (res.status === 404) {
        setError("PASSWORD_RESET_TOKEN must be set in your environment and be at least 16 characters long.");
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

      const body = await parseJsonBody<{ error?: string }>(res);
      setError(body.error ?? GENERIC_ERROR);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const trimmedPassword = trimPassword(newPassword);
  const trimmedConfirm = trimPassword(confirm);

  return (
    <AuthPageShell
      footer={
        <p className="pb-4 text-center text-xs text-gray-600">
          <Link href="/login" className="transition-colors hover:text-gray-400">
            ← Back to login
          </Link>
        </p>
      }
    >
      <div className="rounded-3xl border border-white/10 bg-[#111c2a]/80 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-10">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/15">
            <span className="text-2xl">🔑</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Reset Password</h1>
          <p className="mt-1 text-center text-sm text-gray-400">
            Enter the reset token from your deployment environment
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-300/80">
            Set <code className="font-mono text-amber-200">PASSWORD_RESET_TOKEN</code> to a long
            random string in your deployment environment variables, then paste it below.
          </div>

          <div>
            <label htmlFor="resetToken" className="mb-2 block text-sm font-medium text-gray-300">
              Reset Token
            </label>
            <input
              id="resetToken"
              type="password"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              placeholder="Paste your reset token"
              required
              autoFocus
              autoComplete="off"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="mb-2 block text-sm font-medium text-gray-300">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                autoComplete="new-password"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder-gray-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 transition-colors hover:text-gray-300"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm" className="mb-2 block text-sm font-medium text-gray-300">
              Confirm New Password
            </label>
            <input
              id="confirm"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat new password"
              required
              autoComplete="new-password"
              className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                ${
                  confirm && trimmedConfirm !== trimmedPassword
                    ? "border-red-500/50"
                    : confirm && trimmedConfirm === trimmedPassword
                      ? "border-emerald-500/50"
                      : "border-white/10"
                }`}
            />
            {confirm && trimmedConfirm === trimmedPassword ? (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-400">
                <span>✓</span> Passwords match
              </p>
            ) : null}
          </div>

          <AuthErrorAlert message={error} />

          <button
            type="submit"
            disabled={loading || !resetToken.trim() || trimmedPassword.length < 8 || trimmedPassword !== trimmedConfirm}
            className="mt-2 w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all duration-150 hover:bg-emerald-400 active:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Resetting...
              </span>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>
      </div>
    </AuthPageShell>
  );
}
