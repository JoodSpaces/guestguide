import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden, checkPropertyAccess } from "@/lib/admin-auth";

const schema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
  priority: z.enum(["urgent", "normal", "low"]).optional(),
  assigned_to: z.string().max(100).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  resolution_notes: z.string().max(2000).nullable().optional(),
  resolved_by: z.string().max(100).optional(),
  photo_urls: z.array(z.string().url()).max(10).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(req, ["admin", "ops", "maintenance"]);
  if (!session) return forbidden();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("maintenance_tickets")
    .select("*, properties(id, name)")
    .eq("id", id)
    .single<{ property_id: string } & Record<string, unknown>>();

  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!checkPropertyAccess(session, data.property_id)) return forbidden();
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(req, ["admin", "ops", "maintenance"]);
  if (!session) return forbidden();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const supabase = createServiceClient();

  // Verify property access before updating
  const { data: ticket } = await supabase
    .from("maintenance_tickets")
    .select("property_id")
    .eq("id", id)
    .single<{ property_id: string }>();
  if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!checkPropertyAccess(session, ticket.property_id)) return forbidden();

  const updates: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
  if (parsed.data.status === "resolved") updates.resolved_at = new Date().toISOString();

  const { error } = await supabase.from("maintenance_tickets").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
