export const TOKEN_KEY = "vault_token";

function normalizeTokenValue(token: string): string {
  let normalized = token.trim();

  if (normalized.startsWith('"') && normalized.endsWith('"')) {
    normalized = normalized.slice(1, -1);
  }

  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Ignore malformed encoding and keep original token value.
  }

  if (normalized.toLowerCase().startsWith("bearer ")) {
    normalized = normalized.slice(7).trim();
  }

  return normalized;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(TOKEN_KEY);
  if (!stored) return null;

  const normalized = normalizeTokenValue(stored);
  if (!normalized) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }

  if (normalized !== stored) {
    localStorage.setItem(TOKEN_KEY, normalized);
  }

  return normalized;
}

export function setToken(token: string): void {
  const normalized = normalizeTokenValue(token);
  if (!normalized) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }

  localStorage.setItem(TOKEN_KEY, normalized);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function logout(): Promise<void> {
  clearToken();
  await fetch("/api/auth/logout", { method: "POST" });
}