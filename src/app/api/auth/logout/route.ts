import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out" }, { status: 200 });
  response.cookies.set("vault_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}