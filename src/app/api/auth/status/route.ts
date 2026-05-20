import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

export async function GET() {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    console.error("API_URL is not set in environment");
    return NextResponse.json(
      { error: "backend_unreachable", configured: false },
      { status: 503 }
    );
  }

  try {
    const backendRes = await fetchWithTimeout(
      `${apiUrl}/api/v1/auth/status`,
      { cache: "no-store" },
      3000
    );

    if (!backendRes.ok) {
      return NextResponse.json({ error: "backend_unreachable" }, { status: 503 });
    }

    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Auth status proxy error:", err);
    return NextResponse.json({ error: "backend_unreachable" }, { status: 503 });
  }
}