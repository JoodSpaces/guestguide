import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden, checkPropertyAccess } from "@/lib/admin-auth";
import { aiEnabled } from "@/lib/ai";
import { allow } from "@/lib/rate-limit";
import { runTurnoverReview } from "@/lib/photo-review";

/** Re-run the photo review for one turnover (the automatic run happens when the cleaner marks the job done). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(req, ["admin", "ops", "housekeeping"]);
  if (!session) return forbidden();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  if (!aiEnabled()) return NextResponse.json({ error: "ai_not_enabled" }, { status: 503 });
  if (!(await allow({ name: "photo-review", limit: 6, windowSec: 3600 }, id))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const supabase = createServiceClient();
  const { data: task } = await supabase.from("turnover_tasks").select("property_id").eq("id", id).single<{ property_id: string }>();
  if (!task) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!checkPropertyAccess(session, task.property_id)) return forbidden();

  const review = await runTurnoverReview(supabase, id);
  if (!review) return NextResponse.json({ error: "no_photos_or_failed" }, { status: 422 });
  return NextResponse.json({ review });
}
