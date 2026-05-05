import { NextRequest, NextResponse } from "next/server";

async function isConfigured(req: NextRequest): Promise<boolean> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
    const res = await fetch(new URL("/api/auth/status", appUrl), {
      cache: "no-store",
    });
    const data = await res.json();
    return data.configured === true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("vault_token")?.value;

  const configured = await isConfigured(req);

  if (!configured) {
    if (pathname === "/setup") return NextResponse.next();
    return NextResponse.redirect(new URL("/setup", req.url));
  }

  if (!token) {
    if (pathname === "/login") return NextResponse.next();
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("reason", "expired");
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated - don't let them see login/setup pages
  if (pathname === "/login" || pathname === "/setup") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};