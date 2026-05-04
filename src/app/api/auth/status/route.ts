import { NextResponse } from "next/server";

export async function GET() {
  try {
    const backendRes = await fetch(`${process.env.API_URL}/api/v1/auth/status`, {
      cache: "no-store",
    });
    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ configured: false });
  }
}