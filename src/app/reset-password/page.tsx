"use client";


import Link from "next/link";
import { FormEvent, useState } from "react";
import { setToken } from "@/lib/auth";

export default function ResetPasswordPage() {
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });

      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { token?: string };
        if (data.token) {
          setToken(data.token);
        }
        setDone(true);
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
        setError("Too many attempts. Please wait 15 minutes.");
        return;
      }

      if (res.status === 503) {
        setError("Cannot reach the server. Please try again shortly.");
        return;
      }

      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Something went wrong.");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0d1520]">
      <div className="pointer-events-none absolute left-[-10%] top-[-20%] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-teal-500/8 blur-[140px]" />
      <div className="pointer-events-none absolute right-[20%] top-[40%] h-[300px] w-[300px] rounded-full bg-emerald-400/5 blur-[100px]" />

      <div className="relative z-10 mx-4 w-full max-w-md">
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

          {done ? (
            <div className="space-y-4 text-center">
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-300">
                <span className="text-2xl">✓</span>
                <div>
                  <p className="font-semibold text-base">Password reset successfully</p>
                  <p className="mt-1 text-xs text-emerald-300/70">
                    Your new password is active. You can now log in.
                  </p>
                </div>
              </div>
              <Link
                href="/login"
                className="block w-full rounded-xl bg-emerald-500 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all duration-150 hover:bg-emerald-400"
              >
                Go to Login
              </Link>
            </div>
          ) : (
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
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {error ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading || !resetToken || !newPassword || !confirm}
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
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          <Link href="/login" className="hover:text-gray-400 transition-colors">
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
