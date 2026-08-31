import { NextRequest, NextResponse } from "next/server";
import { classifyGuestRequest } from "@/lib/classify-request";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";

  if (text.length < 10) {
    return NextResponse.json({ category: "other", urgency: "normal" });
  }

  try {
    const result = await classifyGuestRequest(text);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ category: "other", urgency: "normal" });
  }
}
