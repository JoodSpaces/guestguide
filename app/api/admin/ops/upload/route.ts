import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden } from "@/lib/admin-auth";
import { PRIVATE_PHOTO_BUCKET, privatePhotoPath } from "@/lib/ops-photos";

export async function POST(req: NextRequest) {
  if (!(await requireSession(req, ["admin", "ops", "housekeeping", "maintenance"]))) return forbidden();
  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 });

  const maxMb = 8;
  if (file.size > maxMb * 1024 * 1024) {
    return NextResponse.json({ error: `File too large (max ${maxMb}MB)` }, { status: 413 });
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // Cleaning photos are staff-only: private bucket, returned as a path plus a short-lived signed link.
  if (formData.get("private") === "1") {
    const supabasePriv = createServiceClient();
    await supabasePriv.storage.createBucket(PRIVATE_PHOTO_BUCKET, { public: false }).catch(() => null);
    const privPath = privatePhotoPath(file.name);
    const { error: privErr } = await supabasePriv.storage
      .from(PRIVATE_PHOTO_BUCKET)
      .upload(privPath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (privErr) return NextResponse.json({ error: privErr.message }, { status: 500 });
    const { data: signed } = await supabasePriv.storage.from(PRIVATE_PHOTO_BUCKET).createSignedUrl(privPath, 3600);
    return NextResponse.json({ path: privPath, url: signed?.signedUrl ?? null });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const supabase = createServiceClient();

  // Ensure bucket exists
  const { error: bucketErr } = await supabase.storage.createBucket("ops-photos", { public: true }).catch(() => ({ error: null }));
  void bucketErr;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { data, error } = await supabase.storage
    .from("ops-photos")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from("ops-photos").getPublicUrl(data.path);
  return NextResponse.json({ url: publicUrl });
}
