import { NextRequest, NextResponse } from "next/server";

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
    const target = `${process.env.API_URL}/api/v1/auth/reset-password`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    // If an API admin token is configured, use it to authenticate the proxy call.
    if (process.env.API_ADMIN_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.API_ADMIN_TOKEN}`;
    } else if (provided) {
      // Otherwise forward the provided reset token in a header so backends
      // that validate server-side can use it.
      headers["x-reset-token"] = provided;
    }

    backendRes = await fetch(target, {
      method: "POST",
      headers,
      body: JSON.stringify({ newPassword }),
    });
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
    return NextResponse.json({ success: true, token: null });
  }

  const response = NextResponse.json({ success: true, token: sessionToken });
  response.cookies.set("vault_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return response;
}
