import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden } from "@/lib/admin-auth";

const schema = z.object({
  propertyId: z.string().uuid(),
  bookingId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.enum(["plumbing", "electrical", "ac", "appliance", "furniture", "pool", "structural", "general"]),
  priority: z.enum(["urgent", "normal", "low"]),
  assignedTo: z.string().max(100).optional(),
  photoUrls: z.array(z.string().url()).max(10).default([]),
});

export async function GET(req: NextRequest) {
  if (!(await requireSession(req, ["admin", "ops", "maintenance"]))) return forbidden();
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");
  const status = searchParams.get("status");

  const supabase = createServiceClient();
  let query = supabase
    .from("maintenance_tickets")
    .select("id, title, category, priority, status, assigned_to, created_at, updated_at, properties(id, name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (propertyId) query = query.eq("property_id", propertyId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!(await requireSession(req, ["admin", "ops", "maintenance"]))) return forbidden();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error", issues: parsed.error.issues }, { status: 400 });

  const d = parsed.data;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("maintenance_tickets")
    .insert({
      property_id: d.propertyId,
      booking_id: d.bookingId ?? null,
      title: d.title,
      description: d.description ?? null,
      category: d.category,
      priority: d.priority,
      assigned_to: d.assignedTo ?? null,
      photo_urls: d.photoUrls,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) return NextResponse.json({ error: error?.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
