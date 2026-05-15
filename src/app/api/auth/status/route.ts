import { NextResponse } from "next/server";

export async function GET() {
  try {
    const backendRes = await fetch(`${process.env.API_URL}/api/v1/auth/status`, {
      cache: "no-store",
    });
    const data = await backendRes.json();
    // If backend returned a non-OK status, propagate as unavailable so
    // the frontend can treat it as a cold-start rather than "not configured".
    if (!backendRes.ok) {
      return NextResponse.json({ error: "backend_unreachable" }, { status: 503 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 503 });
  }
}