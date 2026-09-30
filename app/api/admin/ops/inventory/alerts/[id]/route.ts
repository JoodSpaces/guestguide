import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden, checkPropertyAccess } from "@/lib/admin-auth";

// Dismiss an inventory alert ("I have seen it / dealt with it"). It closes the alert, nothing else: no stock changes.
// If the cause is still there the next damage report or stock change raises it again, so dismissing is safe.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(req, ["admin", "ops"]);
  if (!session) return forbidden();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: alert } = await supabase
    .from("inventory_alerts").select("id, property_id").eq("id", id).is("resolved_at", null)
    .maybeSingle<{ id: string; property_id: string }>();
  if (!alert) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!checkPropertyAccess(session, alert.property_id)) return forbidden();

  const { error } = await supabase.from("inventory_alerts").update({ resolved_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: "update_failed", message: "Could not dismiss the alert." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
