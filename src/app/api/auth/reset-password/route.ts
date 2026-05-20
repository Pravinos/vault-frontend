import { NextRequest, NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

function getTokenFromSetCookie(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/(?:^|,\s*)vault_token=([^;]+)/);
  return match?.[1] ?? null;
}

function normalizeTokenValue(token: string): string {
  let normalized = token.trim();
  if (normalized.startsWith('"') && normalized.endsWith('"')) {
    normalized = normalized.slice(1, -1);
  }
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // ignore
  }
  if (normalized.toLowerCase().startsWith("bearer ")) {
    normalized = normalized.slice(7).trim();
  }
  return normalized;
}

export async function POST(req: NextRequest) {
  const resetToken = process.env.PASSWORD_RESET_TOKEN;

  if (!resetToken || resetToken.trim().length < 16) {
    return NextResponse.json(
      { error: "PASSWORD_RESET_TOKEN must be set in your environment and be at least 16 characters long." },
      { status: 404 }
    );
  }

  let body: { resetToken?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { resetToken: provided, newPassword } = body;

  // Constant-time-ish string comparison to avoid timing attacks
  const expectedBuf = Buffer.from(resetToken);
  const providedBuf = Buffer.from(provided ?? "");
  const tokensMatch =
    expectedBuf.length === providedBuf.length &&
    expectedBuf.every((b, i) => b === providedBuf[i]);

  if (!tokensMatch) {
    return NextResponse.json({ error: "Invalid reset token." }, { status: 401 });
  }

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 }
    );
  }

  let backendRes: Response;
  try {
    const apiUrl = process.env.API_URL;
    if (!apiUrl) {
      console.error(`API_URL is not set — ${req.url} proxy cannot forward request`);
      return NextResponse.json({ error: "API_URL not configured" }, { status: 500 });
    }

    const target = `${apiUrl}/api/v1/auth/reset-password`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    // If an API admin token is configured, use it to authenticate the proxy call.
    if (process.env.API_ADMIN_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.API_ADMIN_TOKEN}`;
    } else if (provided) {
      // Otherwise forward the provided reset token in a header so backends
      // that validate server-side can use it.
      headers["x-reset-token"] = provided;
    }

    backendRes = await fetchWithTimeout(
      target,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ newPassword }),
      },
      8000
    );
  } catch {
    return NextResponse.json(
      { error: "Could not reach the backend." },
      { status: 503 }
    );
  }

  const data = (await backendRes.json().catch(() => ({}))) as {
    token?: string;
    error?: string;
  };

  if (!backendRes.ok) {
    return NextResponse.json(
      { error: data.error ?? "Failed to reset password." },
      { status: backendRes.status }
    );
  }

  // Log the user in with the new session token returned by the backend
  const tokenFromCookie = getTokenFromSetCookie(backendRes.headers.get("set-cookie"));
  const rawToken = data.token ?? tokenFromCookie;
  const sessionToken = rawToken ? normalizeTokenValue(rawToken) : null;

  if (!sessionToken) {
    // Reset succeeded but no token — redirect to login
    const resp = NextResponse.json({ success: true, token: null });
    // Still try to forward set-cookie headers from backend if present
    const cookies = (backendRes.headers as any).getSetCookie?.() || [];
    cookies.forEach((cookie: string) => resp.headers.append("Set-Cookie", cookie));
    if (cookies.length === 0) {
      const singleCookie = backendRes.headers.get("set-cookie");
      if (singleCookie) resp.headers.set("Set-Cookie", singleCookie);
    }
    return resp;
  }

  const response = NextResponse.json({ success: true, token: sessionToken });
  // Prefer forwarding backend cookies if any
  const cookies = (backendRes.headers as any).getSetCookie?.() || [];
  cookies.forEach((cookie: string) => response.headers.append("Set-Cookie", cookie));
  if (cookies.length === 0) {
    // If backend didn't set cookies but returned token, set a proxy cookie
    response.cookies.set("vault_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }
  return response;
}
