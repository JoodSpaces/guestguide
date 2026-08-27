import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { encrypt } from "@/lib/crypto";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z
  .object({
    doorCode: z.string().max(20).nullable().optional(),
    status: z.enum(["confirmed", "cancelled", "completed"]).optional(),
  })
  .refine((d) => d.doorCode !== undefined || d.status !== undefined, {
    message: "At least one field required",
  });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = createServiceClient();
  const updates: Record<string, unknown> = {};

  if (parsed.data.doorCode !== undefined) {
    updates.door_code_encrypted = parsed.data.doorCode ? encrypt(parsed.data.doorCode) : null;
  }
  if (parsed.data.status !== undefined) {
    updates.status = parsed.data.status;
  }

  const { error } = await supabase.from("bookings").update(updates).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
