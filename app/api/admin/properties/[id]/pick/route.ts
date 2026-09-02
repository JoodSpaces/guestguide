import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden } from "@/lib/admin-auth";

const schema = z.object({
  host_pick: z.string().max(300).nullish(),
  host_pick_ar: z.string().max(300).nullish(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession(req, ["admin"]))) return forbidden();
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("properties")
    .update({
      host_pick: parsed.data.host_pick ?? null,
      host_pick_ar: parsed.data.host_pick_ar ?? null,
    })
    .eq("id", id)
    .select("id, host_pick, host_pick_ar")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
