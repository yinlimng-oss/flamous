import { NextRequest, NextResponse } from "next/server";
import { callEdgeFunction } from "@/lib/review/edge";

export const runtime = "nodejs";

// Proxies to the "generate-review" Edge Function (named "generate" here on
// our side to read naturally as /api/review/generate).
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { status, data } = await callEdgeFunction("generate-review", body);
  return NextResponse.json(data, { status });
}
