import { NextRequest, NextResponse } from "next/server";

function buildBackendUrl(req: NextRequest, path: string[]): string {
  const base = (process.env.API_URL ?? "").replace(/\/$/, "");
  const endpoint = path.join("/");
  const search = req.nextUrl.search;
  return `${base}/api/v1/${endpoint}${search}`;
}

async function forward(req: NextRequest, path: string[]) {
  if (!process.env.API_URL) {
    return NextResponse.json(
      { error: "API_URL is not configured." },
      { status: 500 }
    );
  }

  const token = req.cookies.get("vault_token")?.value;
  const backendUrl = buildBackendUrl(req, path);

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (token) {
    headers.set("cookie", `vault_token=${encodeURIComponent(token)}`);
  }

  const method = req.method;
  const body = method === "GET" || method === "HEAD" ? undefined : await req.text();

  let backendRes: Response;
  try {
    backendRes = await fetch(backendUrl, {
      method,
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach backend service." },
      { status: 503 }
    );
  }

  const responseText = await backendRes.text();
  const responseContentType = backendRes.headers.get("content-type") ?? "application/json";

  return new NextResponse(responseText, {
    status: backendRes.status,
    headers: {
      "content-type": responseContentType,
    },
  });
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(req, path);
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(req, path);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(req, path);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(req, path);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(req, path);
}