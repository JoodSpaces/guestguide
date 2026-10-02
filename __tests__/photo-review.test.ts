import { describe, expect, it } from "vitest";
import { parseReviewFlags, mediaTypeFor, isOwnStorageUrl, reviewTurnoverPhotos } from "@/lib/photo-review";
import { isPrivatePath, privatePhotoPath } from "@/lib/ops-photos";
import type { SupabaseClient } from "@supabase/supabase-js";

const photos = [
  { item_id: "a", room: "bathroom", label: "Counter" },
  { item_id: "b", room: "bedroom", label: "Bed" },
];

describe("parseReviewFlags", () => {
  it("keeps known photos and kinds, trims notes", () => {
    const raw = 'Here you go: {"flags":[{"id":"a","kind":"clutter","note":"  items   on the counter "},{"id":"b","kind":"unmade_bed","note":"duvet on the floor"}]}';
    expect(parseReviewFlags(raw, photos)).toEqual([
      { item_id: "a", room: "bathroom", label: "Counter", kind: "clutter", note: "items on the counter" },
      { item_id: "b", room: "bedroom", label: "Bed", kind: "unmade_bed", note: "duvet on the floor" },
    ]);
  });
  it("drops ids it was not shown, maps unknown kinds to other, caps note length", () => {
    const raw = JSON.stringify({ flags: [{ id: "zzz", kind: "stain", note: "x" }, { id: "a", kind: "approved!", note: "y".repeat(500) }] });
    const out = parseReviewFlags(raw, photos);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("other");
    expect(out[0].note.length).toBe(140);
  });
  it("returns nothing for garbage instead of throwing", () => {
    expect(parseReviewFlags("not json", photos)).toEqual([]);
    expect(parseReviewFlags('{"flags":"nope"}', photos)).toEqual([]);
  });
});

describe("photo references", () => {
  it("only reviews formats the vision API takes", () => {
    expect(mediaTypeFor("turnover/1-a.jpg")).toBe("image/jpeg");
    expect(mediaTypeFor("turnover/1-a.PNG")).toBe("image/png");
    expect(mediaTypeFor("turnover/1-a.heic")).toBeNull();
  });
  it("builds safe private paths", () => {
    const p = privatePhotoPath("../../evil name.JPG", 1000, "abc");
    expect(p).toBe("turnover/1000-abc.jpg");
    expect(isPrivatePath(p)).toBe(true);
    expect(isPrivatePath("../etc/passwd")).toBe(false);
    expect(isPrivatePath("https://x.test/a.jpg")).toBe(false);
  });
  it("fetches legacy URLs only from our own storage host", () => {
    const env = "https://abc.supabase.co";
    expect(isOwnStorageUrl("https://abc.supabase.co/storage/v1/object/public/ops-photos/a.jpg", env)).toBe(true);
    expect(isOwnStorageUrl("https://evil.test/a.jpg", env)).toBe(false);
    expect(isOwnStorageUrl("http://abc.supabase.co/a.jpg", env)).toBe(false);
  });
});

describe("reviewTurnoverPhotos", () => {
  it("skips unreviewable photos and makes no model call when none are usable", async () => {
    const r = await reviewTurnoverPhotos({} as SupabaseClient, [
      { item_id: "a", room: "bathroom", label: "Counter", ref: "turnover/1-a.heic" },
      { item_id: "b", room: "bedroom", label: "Bed", ref: "https://evil.test/x.jpg" },
    ]);
    expect(r.photos_received).toBe(2);
    expect(r.photos_reviewed).toBe(0);
    expect(r.flags).toEqual([]);
    expect(r.skipped.map((s) => s.item_id)).toEqual(["a", "b"]);
  });
});
