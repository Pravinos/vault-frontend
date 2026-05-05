import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token } = (await req.json().catch(() => ({}))) as {
    token?: unknown;
  };

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const response = NextResponse.json({ message: "Cookie refreshed" });
  response.cookies.set("vault_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return response;
}