import { NextRequest, NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

async function isConfigured(req: NextRequest): Promise<boolean | null> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
    const res = await fetchWithTimeout(
      new URL("/api/auth/status", appUrl).toString(),
      { cache: "no-store" },
      2500
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (data.configured === false) return false;
    return true;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("vault_token")?.value;
  const configured = await isConfigured(req);

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

  if (pathname === "/login" || pathname === "/setup" || pathname === "/reset-password") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};