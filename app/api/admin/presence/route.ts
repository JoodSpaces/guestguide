import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("admin_presence")
    .select("name, role, last_seen_at")
    .gte("last_seen_at", cutoff)
    .order("last_seen_at", { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "missing_name" }, { status: 400 });

  const supabase = createServiceClient();
  await supabase.from("admin_presence").upsert(
    { name: body.name, role: body.role ?? "admin", last_seen_at: new Date().toISOString() },
    { onConflict: "name" }
  );
  return NextResponse.json({ ok: true });
}
