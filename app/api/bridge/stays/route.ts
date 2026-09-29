import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { hashToken } from "@/lib/token";
import { deriveBridgeToken, BRIDGE_REF_RE } from "@/lib/bridge-token";
import { cairoToUtcIso } from "@/lib/cairo-time";
import { createScheduledTurnover } from "@/lib/ops-turnover";
import type { PropertySpecs } from "@/lib/ops-checklist";
import { readBridgeRequest } from "@/lib/bridge-request";

/**
 * POST /api/bridge/stays — the website tells us a booking is paid.
 *
 * Creates the stay (booking + guest link + scheduled turnover) or, if we already
 * have it, returns the same link again. Idempotent by booking ref, so the website
 * can retry freely. Never sets a door code: the host does that in the admin.
 *
 *   200 { created, bookingId, link, linkActive }
 *   404 property_not_found   the house isn't mapped to a property here
 *   409 date_conflict        another confirmed stay overlaps (a paid guest is NEVER dropped
 *                            silently: the website flags it for staff)
 *   409 cancelled            this ref was cancelled here earlier; cancellation is final
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const schema = z.object({
  ref: z.string().regex(BRIDGE_REF_RE),
  propertySlug: z.string().min(1).max(80),
  guest: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email().max(200).nullish(),
    phone: z.string().max(30).nullish(),
    lang: z.enum(["en", "ar"]),
  }),
  guestCount: z.number().int().min(1).max(50),
  checkIn: z.string().regex(DATE),
  checkOut: z.string().regex(DATE),
});

function appUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (configured && !configured.includes("localhost")) return configured.replace(/\/$/, "");
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd}`;
  return configured || "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  const auth = await readBridgeRequest(req);
  if (!auth.ok) return auth.res;

  let parsed;
  try {
    parsed = schema.safeParse(JSON.parse(auth.raw));
  } catch {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }
  if (!parsed.success || parsed.data.checkOut <= parsed.data.checkIn) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }
  const d = parsed.data;

  let plaintext: string;
  try {
    plaintext = deriveBridgeToken(process.env.BRIDGE_TOKEN_KEY, d.ref);
  } catch (e) {
    console.error("[bridge]", (e as Error).message);
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }
  const hash = hashToken(plaintext);
  const link = `${appUrl()}/s/${plaintext}`;
  const supabase = createServiceClient();

  const { data: property } = await supabase
    .from("properties")
    .select("id, specs, checkin_time, checkout_time")
    .eq("slug", d.propertySlug)
    .maybeSingle<{ id: string; specs: PropertySpecs | null; checkin_time: string; checkout_time: string }>();
  if (!property) return NextResponse.json({ error: "property_not_found" }, { status: 404 });

  const findExisting = () =>
    supabase
      .from("bookings")
      .select("id, status, check_out")
      .eq("source", "direct")
      .eq("external_ref", d.ref)
      .maybeSingle<{ id: string; status: string; check_out: string }>();

  // Make sure the derived link exists for this booking; report whether it is usable.
  const ensureToken = async (bookingId: string, checkOutIso: string): Promise<boolean> => {
    const { data: tok } = await supabase
      .from("stay_tokens")
      .select("id, revoked_at")
      .eq("token_hash", hash)
      .maybeSingle<{ id: string; revoked_at: string | null }>();
    if (tok) return !tok.revoked_at;
    const { error } = await supabase.from("stay_tokens").insert({
      booking_id: bookingId,
      token_hash: hash,
      issued_at: new Date().toISOString(),
      expires_at: new Date(new Date(checkOutIso).getTime() + 48 * 60 * 60 * 1000).toISOString(),
    });
    if (error && error.code !== "23505") {
      console.error("[bridge] token insert failed", error);
      throw new Error("token_insert_failed");
    }
    return true;
  };

  try {
    let { data: existing } = await findExisting();
    let created = false;

    if (!existing) {
      const checkInIso = cairoToUtcIso(d.checkIn, property.checkin_time);
      const checkOutIso = cairoToUtcIso(d.checkOut, property.checkout_time);

      const { data: overlaps } = await supabase
        .from("bookings")
        .select("id, check_in, check_out")
        .eq("property_id", property.id)
        .in("status", ["confirmed", "completed"])
        .lt("check_in", checkOutIso)
        .gt("check_out", checkInIso)
        .limit(1)
        .returns<{ id: string; check_in: string; check_out: string }[]>();
      if (overlaps && overlaps.length > 0) {
        return NextResponse.json(
          {
            error: "date_conflict",
            message: `Overlaps a confirmed stay here (${overlaps[0].check_in.slice(0, 10)} → ${overlaps[0].check_out.slice(0, 10)})`,
          },
          { status: 409 },
        );
      }

      const { data: inserted, error: insErr } = await supabase
        .from("bookings")
        .insert({
          property_id: property.id,
          external_ref: d.ref,
          source: "direct",
          guest_first_name: d.guest.firstName,
          guest_last_name: d.guest.lastName,
          guest_phone: d.guest.phone ? encrypt(d.guest.phone) : null,
          guest_email: d.guest.email ?? null,
          guest_lang: d.guest.lang,
          guest_count: d.guestCount,
          check_in: checkInIso,
          check_out: checkOutIso,
          door_code_encrypted: null,
          status: "confirmed",
        })
        .select("id, status, check_out")
        .single<{ id: string; status: string; check_out: string }>();

      if (insErr?.code === "23505") {
        // A concurrent retry created it between our read and insert (needs migration 028's unique index).
        ({ data: existing } = await findExisting());
      } else if (insErr || !inserted) {
        console.error("[bridge] booking insert failed", insErr);
        return NextResponse.json({ error: "booking_creation_failed" }, { status: 500 });
      } else {
        existing = inserted;
        created = true;
        await supabase.from("audit_log").insert({
          actor_type: "system",
          actor_id: null,
          action: "booking_created",
          entity: "bookings",
          entity_id: inserted.id,
          meta: { source: "direct", via: "website_bridge", ref: d.ref },
        });
        await createScheduledTurnover(supabase, inserted.id, property.id, property.specs);
      }
    }

    if (!existing) return NextResponse.json({ error: "booking_creation_failed" }, { status: 500 });
    if (existing.status === "cancelled") return NextResponse.json({ error: "cancelled" }, { status: 409 });

    const linkActive = await ensureToken(existing.id, existing.check_out);
    return NextResponse.json({ created, bookingId: existing.id, link, linkActive });
  } catch (e) {
    console.error("[bridge] unexpected", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
