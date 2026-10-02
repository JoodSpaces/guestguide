import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * One place to write the admin audit trail (the `audit_log` table). It never throws: a failed audit write must not break
 * the action it describes. It never stores secrets: anything that looks like a password, token, hash or key is dropped.
 * The Control Tower reads this trail (logins, team changes, property and service edits) to spot unusual access.
 */
const SECRET_KEY = /pass(word)?|token|hash|secret|key|otp|code/i;

export function cleanMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta ?? {})) {
    if (SECRET_KEY.test(k)) { out[k] = "[withheld]"; continue; }
    out[k] = typeof v === "string" ? v.slice(0, 200) : v;
  }
  return out;
}

export interface AuditInput {
  actorType: "admin" | "anon" | "system";
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}

export async function auditAdmin(supabase: SupabaseClient, a: AuditInput): Promise<void> {
  try {
    await supabase.from("audit_log").insert({
      actor_type: a.actorType, actor_id: a.actorId ?? null, action: a.action, entity: a.entity, entity_id: a.entityId ?? "-", meta: cleanMeta(a.meta),
    });
  } catch (err) {
    console.error("[audit] could not write", a.action, err);
  }
}
