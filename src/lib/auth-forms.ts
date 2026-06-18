import { setToken } from "@/lib/auth";

export const GENERIC_ERROR = "Something went wrong. Please try again.";
export const SERVER_UNREACHABLE = "Cannot reach the server. Please try again shortly.";
export const MISCONFIGURED_ERROR =
  "Server is misconfigured. Check deployment environment variables.";

export function trimPassword(password: string): string {
  return password.trim();
}

export function getRetryAfterMinutes(res: Response, defaultMinutes = 15): number {
  const retryAfter = res.headers.get("Retry-After") || String(defaultMinutes * 60);
  return Math.ceil(Number(retryAfter) / 60) || defaultMinutes;
}

export async function parseJsonBody<T>(res: Response): Promise<T> {
  return (await res.json().catch(() => ({}))) as T;
}

export function storeAuthToken(data: { token?: string }): void {
  if (data.token) {
    setToken(data.token);
  }
}

export async function syncAuthCookie(token: string): Promise<void> {
  await fetch("/api/auth/refresh-cookie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

export async function completeAuthSession(data: { token?: string }): Promise<void> {
  if (data.token) {
    setToken(data.token);
    await syncAuthCookie(data.token);
  }
  redirectToDashboard();
}

export function redirectToDashboard(): void {
  window.location.href = "/dashboard";
}
