import { NextRequest, NextResponse } from "next/server";

const VALID_LOCALES = ["en", "ar"] as const;
type Locale = (typeof VALID_LOCALES)[number];

/** Tiny route that sets the jood_locale cookie then redirects back.
 *  Called by the stay page when booking.guest_lang differs from the
 *  current cookie, ensuring next-intl serves the correct language. */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lang = searchParams.get("lang") ?? "";
  const returnTo = searchParams.get("return") ?? "/";

  if (!(VALID_LOCALES as readonly string[]).includes(lang)) {
    return NextResponse.redirect(new URL(returnTo, req.url));
  }

  // Validate returnTo is a relative path to prevent open-redirect
  if (!returnTo.startsWith("/") || returnTo.includes("//")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const res = NextResponse.redirect(new URL(returnTo, req.url));
  res.cookies.set("jood_locale", lang as Locale, {
    path: "/",
    sameSite: "lax",
    httpOnly: false, // must be readable by client locale toggle too
    maxAge: 365 * 24 * 60 * 60,
  });
  return res;
}
