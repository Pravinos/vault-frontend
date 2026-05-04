import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL;

async function isConfigured(): Promise<boolean> {
  try {
    const res = await fetch(`${API}/api/v1/auth/status`, {
      cache: "no-store",
    });
    const data = await res.json();
    return data.configured === true;
  } catch {
    return false;
  }
}

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  try {
    // Forward all cookies from the incoming request to the backend verify call
    const res = await fetch(`${API}/api/v1/auth/verify`, {
      cache: "no-store",
      credentials: "include",
      headers: {
        cookie: req.headers.get("cookie") ?? "",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const configured = await isConfigured();

  if (!configured) {
    if (pathname === "/setup") return NextResponse.next();
    return NextResponse.redirect(new URL("/setup", req.url));
  }

  // App is configured - check if the session is valid
  const authenticated = await isAuthenticated(req);

  if (!authenticated) {
    if (pathname === "/login") return NextResponse.next();
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Authenticated - don't let them see login/setup pages
  if (pathname === "/login" || pathname === "/setup") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};