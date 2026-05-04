"use client";

import { useEffect } from "react";

import { refreshToken } from "@/lib/auth";

export default function TokenRefresher() {
  useEffect(() => {
    // Refresh the token once on mount - resets the 24h expiry window
    // If it fails (token already expired) the next API call will handle the redirect
    refreshToken().catch(() => {});
  }, []);

  return null;
}
