"use client";

import { useEffect } from "react";

import { getToken, setToken } from "@/lib/auth";

export default function TokenRefresher() {
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) return;

        const data = (await res.json().catch(() => ({}))) as { token?: string };
        if (!data.token) return;

        setToken(data.token);
        await fetch("/api/auth/refresh-cookie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: data.token }),
        });
      })
      .catch(() => {
        // Silent fail - next API call handles redirects if auth is invalid.
      });
  }, []);

  return null;
}
