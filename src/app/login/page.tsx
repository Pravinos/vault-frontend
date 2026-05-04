"use client";

import { Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsSetupLink, setNeedsSetupLink] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // nothing to clear - token is HttpOnly, managed by the browser
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError(null);
    setNeedsSetupLink(false);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`,
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

      if (response.status === 401) {
        setError("Wrong password. Try again.");
        return;
      }

      if (response.status === 403) {
        setError("App not set up yet.");
        setNeedsSetupLink(true);
        return;
      }

      if (response.status === 429) {
        setError("Too many attempts. Please wait 15 minutes and try again.");
        return;
      }

      setError("Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
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

        <h1 className="text-center text-2xl font-semibold text-white">Welcome back</h1>
        <p className="mt-2 text-center text-sm text-gray-400">
          Enter your password to continue
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

          <div className="min-h-5 text-sm text-red-400">
            {error}
            {needsSetupLink ? (
              <>
                {" "}
                <Link href="/setup" className="font-medium text-emerald-400 hover:text-emerald-300">
                  Go to setup
                </Link>
              </>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entering Vault..." : "Enter Vault"}
          </button>
        </form>
      </div>
    </div>
  );
}