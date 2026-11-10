import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src") ?? process.env.CATALOG_API_URL ?? "";
  const key =
    request.headers.get("x-api-key") ??
    request.nextUrl.searchParams.get("key") ??
    process.env.CATALOG_API_KEY ??
    "";

  if (!src) {
    return NextResponse.json({ status: "error", message: "No catalog API URL" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(src);
  } catch {
    return NextResponse.json({ status: "error", message: "Invalid catalog API URL" }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ status: "error", message: "Catalog URL must be http or https" }, { status: 400 });
  }

  if (key && !target.searchParams.has("key")) {
    target.searchParams.set("key", key);
  }

  try {
    const res = await fetch(target.toString(), {
      headers: {
        Accept: "application/json",
        ...(key ? { "X-API-Key": key } : {}),
      },
      cache: "no-store",
    });
    const text = await res.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: res.status });
    } catch {
      return NextResponse.json(
        { status: "error", message: "Catalog API did not return JSON", body: text.slice(0, 300) },
        { status: 502 },
      );
    }
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : "Could not reach catalog API" },
      { status: 502 },
    );
  }
}
