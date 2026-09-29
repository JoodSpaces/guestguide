/**
 * Property scope for server components. Middleware sets `x-admin-props` on every
 * /admin request (it overwrites anything the client sent): "" means the member
 * may see all properties, otherwise it is a JSON array of property ids.
 * Malformed input fails closed (no properties).
 */
export function scopeFromHeaders(h: { get(name: string): string | null }): string[] | null {
  const raw = h.get("x-admin-props");
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
