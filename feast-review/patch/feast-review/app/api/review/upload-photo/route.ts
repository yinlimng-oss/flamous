import { NextRequest, NextResponse } from "next/server";
import { callEdgeFunctionForm } from "@/lib/review/edge";

export const runtime = "nodejs";

// The Edge Function expects multipart/form-data (session_token + photo file),
// so we forward the incoming FormData as-is rather than JSON-encoding it.
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 }
    );
  }
  const { status, data } = await callEdgeFunctionForm("upload-photo", form);
  return NextResponse.json(data, { status });
}
