import { NextRequest, NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

export async function POST(req: NextRequest) {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    console.error(`API_URL is not set — ${req.url} proxy cannot forward request`);
    return NextResponse.json({ error: "API_URL not configured" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const backendRes = await fetchWithTimeout(
      `${apiUrl}/api/v1/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
          "X-Real-IP": req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "unknown",
        },
        body: JSON.stringify(body),
      },
      8000
    );

    const text = await backendRes.text().catch(() => "");
    const contentType = backendRes.headers.get("content-type") || "";

    let response: NextResponse;
    if (contentType.includes("application/json")) {
      const json = text ? JSON.parse(text) : {};
      response = NextResponse.json(json, { status: backendRes.status });
    } else {
      response = new NextResponse(text, { status: backendRes.status });
    }

    const cookies = (backendRes.headers as any).getSetCookie?.() || [];
    cookies.forEach((cookie: string) => response.headers.append("Set-Cookie", cookie));
    if (cookies.length === 0) {
      const singleCookie = backendRes.headers.get("set-cookie");
      if (singleCookie) response.headers.set("Set-Cookie", singleCookie);
    }

    return response;
  } catch (error) {
    console.error("Auth proxy error:", error);
    return NextResponse.json({ error: "backend_unreachable" }, { status: 503 });
  }
}