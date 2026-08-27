import { createHash } from "crypto";
import { nanoid } from "nanoid";

const PEPPER = process.env.TOKEN_PEPPER ?? "";

/**
 * Generate a 22-char URL-safe token (nanoid).
 * Returns the plaintext token — store only the hash.
 */
export function generateToken(): string {
  return nanoid(22);
}

/**
 * Hash a plaintext token for storage.
 * SHA-256(token + pepper) — pepper is a server-side secret,
 * so a database breach alone cannot reverse tokens.
 */
export function hashToken(plaintext: string): string {
  return createHash("sha256")
    .update(plaintext + PEPPER)
    .digest("hex");
}

export type Phase =
  | "anticipation"
  | "preparation"
  | "arrival"
  | "settling"
  | "living"
  | "departure"
  | "afterglow";

export type TokenPayload = {
  bookingId: string;
  propertyId: string;
  propertyName: string;
  propertyNameAr: string;
  guestFirstName: string;
  guestLang: "en" | "ar";
  checkIn: string;   // ISO timestamptz
  checkOut: string;  // ISO timestamptz
  phase: Phase;
  arrivalUnlocked: boolean;  // now >= checkIn - 48h
  isExpired: boolean;        // now > checkOut + 48h
};

/**
 * Compute the guest's current phase relative to now.
 * All comparisons in UTC — caller responsible for passing UTC strings.
 */
export function computePhase(checkIn: string, checkOut: string): Phase {
  const now = Date.now();
  const inMs = new Date(checkIn).getTime();
  const outMs = new Date(checkOut).getTime();
  const h = 60 * 60 * 1000;
  const d = 24 * h;

  if (now > outMs + 48 * h)   return "afterglow";
  if (now > outMs - 24 * h)   return "departure";
  if (now > inMs + 3 * h)     return "living";
  if (now > inMs)              return "settling";
  if (now > inMs - 48 * h)    return "arrival";
  if (now > inMs - 7 * d)     return "preparation";
  return "anticipation";
}

export function isArrivalUnlocked(checkIn: string): boolean {
  return Date.now() >= new Date(checkIn).getTime() - 48 * 60 * 60 * 1000;
}

export function isTokenExpired(checkOut: string): boolean {
  return Date.now() > new Date(checkOut).getTime() + 48 * 60 * 60 * 1000;
}
