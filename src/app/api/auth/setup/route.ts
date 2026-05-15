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
    // Ignore malformed encoding and keep original token value.
  }

  if (normalized.toLowerCase().startsWith("bearer ")) {
    normalized = normalized.slice(7).trim();
  }

  return normalized;
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Retry a couple times on 503 (backend cold start). Setup is only used once,
  // but retrying a few times helps during short backend restarts.
  let backendRes: Response | null = null;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      backendRes = await fetch(`${process.env.API_URL}/api/v1/auth/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      backendRes = null;
    }

    if (!backendRes) {
      if (attempt === maxAttempts) break;
      await new Promise((r) => setTimeout(r, 500 * attempt));
      continue;
    }

    if (backendRes.status === 503 && attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      continue;
    }

    break;
  }

  if (!backendRes) {
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
    return NextResponse.json(data, { status: backendRes.status });
  }

  const tokenFromCookie = getTokenFromSetCookie(backendRes.headers.get("set-cookie"));
  const rawToken = data.token ?? tokenFromCookie;
  const token = rawToken ? normalizeTokenValue(rawToken) : null;

  if (!token) {
    return NextResponse.json(
      { error: "Backend response missing token." },
      { status: 502 }
    );
  }

  const response = NextResponse.json({ token }, { status: 200 });

  response.cookies.set("vault_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return response;
}