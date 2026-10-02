import type { SupabaseClient } from "@supabase/supabase-js";

/** Cleaning photos are staff-only: private bucket, never a public URL. Older photos keep their public https URL. */
export const PRIVATE_PHOTO_BUCKET = "ops-photos-private";
const SIGN_SECONDS = 60 * 60;

/** Where new turnover photos live inside the private bucket (and the only shape the item API accepts as a path). */
export const PRIVATE_PATH_RE = /^turnover\/[A-Za-z0-9_.-]{1,120}$/;
export const isPrivatePath = (v: string | null | undefined): v is string => !!v && PRIVATE_PATH_RE.test(v);

export function privatePhotoPath(originalName: string, now = Date.now(), rand = Math.random().toString(36).slice(2)): string {
  const ext = (originalName.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  return `turnover/${now}-${rand}.${ext}`;
}

/** A link a person can open now: a signed URL for a private path, or the legacy public URL unchanged. */
export async function viewableUrl(supabase: SupabaseClient, stored: string | null): Promise<string | null> {
  if (!stored) return null;
  if (!isPrivatePath(stored)) return stored;
  const { data } = await supabase.storage.from(PRIVATE_PHOTO_BUCKET).createSignedUrl(stored, SIGN_SECONDS);
  return data?.signedUrl ?? null;
}
