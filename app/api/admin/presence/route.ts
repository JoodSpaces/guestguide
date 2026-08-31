import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await requireSession(req))) return forbidden();
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
  const session = await requireSession(req);
  if (!session) return forbidden();

  const supabase = createServiceClient();
  await supabase.from("admin_presence").upsert(
    { name: session.name, role: session.role, last_seen_at: new Date().toISOString() },
    { onConflict: "name" }
  );
  return NextResponse.json({ ok: true });
}
