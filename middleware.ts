import { NextRequest, NextResponse } from "next/server";

async function isConfigured(req: NextRequest): Promise<boolean | null> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
    const res = await fetch(new URL("/api/auth/status", appUrl), {
      cache: "no-store",
    });
    const data = await res.json();
    // Explicitly not-configured only when backend definitively says so.
    if (data.configured === false) return false;
    return true;
  } catch {
    // Backend unreachable (cold start / redeployment) — return null so
    // middleware can redirect to a lightweight "starting" page instead
    // of letting full pages mount and trigger many API calls.
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("vault_token")?.value;

  const configured = await isConfigured(req);

  // Backend unreachable: redirect users to a lightweight status page that
  // avoids mounting heavy pages which would fire many API calls.
  if (configured === null) {
    if (pathname === "/starting") return NextResponse.next();
    return NextResponse.redirect(new URL("/starting", req.url));
  }

  if (!configured) {
    if (pathname === "/setup") return NextResponse.next();
    return NextResponse.redirect(new URL("/setup", req.url));
  }

  if (!token) {
    if (pathname === "/login" || pathname === "/reset-password") return NextResponse.next();
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("reason", "expired");
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated - don't let them see login/setup/reset pages
  if (pathname === "/login" || pathname === "/setup" || pathname === "/reset-password") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};