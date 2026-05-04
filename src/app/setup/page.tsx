"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { setToken } from "@/lib/auth";

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
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { token?: string };
        if (data.token) {
          setToken(data.token);
        }
        window.location.assign("/dashboard");
        return;
      }

      if (res.status === 409) {
        setError("A password is already set. Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
        return;
      }

      if (res.status === 429) {
        setError("Too many attempts. Please wait 15 minutes.");
        return;
      }

      if (res.status === 400) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error ?? "Invalid password.");
        return;
      }

      if (res.status === 503) {
        setError("Cannot reach the server. Please try again shortly.");
        return;
      }

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      setError(body.error ?? "Something went wrong.");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const strength =
    password.length === 0
      ? null
      : password.length < 8
        ? "weak"
        : password.length < 12
          ? "fair"
          : "strong";

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0d1520] py-10">
      <div className="pointer-events-none absolute left-[-10%] top-[-20%] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-teal-500/8 blur-[140px]" />
      <div className="pointer-events-none absolute right-[20%] top-[40%] h-[300px] w-[300px] rounded-full bg-emerald-400/5 blur-[100px]" />

      <div className="relative z-10 mx-4 w-full max-w-lg space-y-4">
        <div className="rounded-3xl border border-white/10 bg-[#111c2a]/80 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/15">
              <span className="text-3xl">🏦</span>
            </div>
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

              {strength ? (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {["weak", "fair", "strong"].map((level, i) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all duration-300
                          ${strength === "weak" && i === 0 ? "bg-red-500" : ""}
                          ${strength === "fair" && i <= 1 ? "bg-amber-400" : ""}
                          ${strength === "strong" ? "bg-emerald-500" : ""}
                          ${(strength === "weak" && i > 0) ||
                          (strength === "fair" && i > 1)
                            ? "bg-white/10"
                            : ""}
                        `}
                      />
                    ))}
                  </div>
                  <span
                    className={`text-xs font-medium
                      ${strength === "weak" ? "text-red-400" : ""}
                      ${strength === "fair" ? "text-amber-400" : ""}
                      ${strength === "strong" ? "text-emerald-400" : ""}
                    `}
                  >
                    {strength.charAt(0).toUpperCase() + strength.slice(1)}
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
                  ${confirm && confirm !== password
                    ? "border-red-500/50"
                    : confirm && confirm === password
                      ? "border-emerald-500/50"
                      : "border-white/10"
                  }`}
              />
              {confirm && confirm === password ? (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-400">
                  <span>✓</span> Passwords match
                </p>
              ) : null}
            </div>

            {error ? (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || password.length < 8 || password !== confirm}
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

        <p className="pb-4 text-center text-xs text-gray-600">
          🔒 Password is stored as a BCrypt hash - never in plain text
        </p>
      </div>
    </div>
  );
}