export interface AdminSession {
  id: string;
  name: string;
  role: "admin" | "ops" | "housekeeping" | "maintenance" | "concierge";
  iat: number;
  exp: number;
}

// ─── Password hashing (PBKDF2 — works in Edge + Node) ───────────────────────

async function importPbkdf2Key(password: string) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
  const key = await importPbkdf2Key(password);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 },
    key,
    256
  );
  const hashHex = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2:${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "pbkdf2") return false;
  const salt = Uint8Array.from(parts[1].match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const expected = parts[2];
  const key = await importPbkdf2Key(password);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 },
    key,
    256
  );
  const actual = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
  let diff = actual.length ^ expected.length;
  for (let i = 0; i < Math.min(actual.length, expected.length); i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

// ─── Cookie signing (HMAC-SHA-256) ──────────────────────────────────────────

async function getHmacKey() {
  const secret = process.env.ADMIN_SECRET ?? "";
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function b64u(buf: ArrayBuffer | Uint8Array) {
  return Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).toString("base64url");
}

export async function signAdminCookie(session: AdminSession): Promise<string> {
  const payload = b64u(new TextEncoder().encode(JSON.stringify(session)));
  const key = await getHmacKey();
  const sig = b64u(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  return `${payload}.${sig}`;
}

export function decodeAdminCookie(cookie: string): AdminSession | null {
  try {
    const dot = cookie.lastIndexOf(".");
    const payload = cookie.slice(0, dot);
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as AdminSession;
  } catch {
    return null;
  }
}

export async function verifyAdminCookie(cookie: string): Promise<AdminSession | null> {
  try {
    const dot = cookie.lastIndexOf(".");
    const payload = cookie.slice(0, dot);
    const sig = cookie.slice(dot + 1);
    const key = await getHmacKey();
    const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
    if (!valid) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as AdminSession;
    if (Date.now() > session.exp) return null;
    return session;
  } catch {
    return null;
  }
}

export const ROLE_HOME: Record<string, string> = {
  admin:        "/admin",
  ops:          "/admin/ops",
  housekeeping: "/admin/ops",
  maintenance:  "/admin/ops/maintenance",
  concierge:    "/admin/requests",
};

export function isPathAllowed(pathname: string, role: string): boolean {
  if (role === "admin") return true;
  if (role === "ops") return pathname.startsWith("/admin/ops");
  if (role === "housekeeping") {
    return (
      pathname === "/admin/ops" ||
      pathname.startsWith("/admin/ops/turnover") ||
      pathname.startsWith("/admin/ops/inventory")
    );
  }
  if (role === "maintenance") {
    return pathname.startsWith("/admin/ops/maintenance");
  }
  if (role === "concierge") {
    return (
      pathname.startsWith("/admin/requests") ||
      pathname.startsWith("/admin/bookings")
    );
  }
  return false;
}
