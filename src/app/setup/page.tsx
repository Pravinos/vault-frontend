"use client";

import { Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SetupPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/setup`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }
      );

      if (response.ok) {
        router.push("/dashboard");
        return;
      }

      if (response.status === 409) {
        setError("Password already set — redirecting to login…");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
        return;
      }

      if (response.status === 429) {
        setError("Too many attempts. Please wait 15 minutes and try again.");
        return;
      }

      if (response.status === 400) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? "Invalid request");
        return;
      }

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setError(body.error ?? "Something went wrong");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-950 p-8 shadow-2xl shadow-black/20">
        <div className="mb-6 flex items-center justify-center gap-2 text-white">
          <Wallet className="h-6 w-6" />
          <span className="text-lg font-semibold">Vault</span>
        </div>

        <h1 className="text-center text-2xl font-semibold text-white">Welcome to Vault</h1>
        <p className="mt-2 text-center text-sm text-gray-400">
          Set a password to protect your data
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none ring-emerald-500/40 transition focus:ring"
              required
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-sm text-gray-300">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none ring-emerald-500/40 transition focus:ring"
              required
            />
          </div>

          <p className="min-h-5 text-sm text-red-400">{error ?? ""}</p>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Setting Password..." : "Set Password"}
          </button>
        </form>
      </div>
    </div>
  );
}