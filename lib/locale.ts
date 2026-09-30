/**
 * The stay page opens in the language the guest booked in — but only until they choose one themselves.
 * The language toggle writes the same `jood_locale` cookie, so "a cookie exists" means "the guest (or an
 * earlier visit) already decided". Forcing the booking language on every load undid the guest's choice
 * whenever they came back to the home screen.
 */
export function shouldSyncLocale(cookieValue: string | undefined, bookingLang: "en" | "ar"): boolean {
  if (cookieValue === "en" || cookieValue === "ar") return false; // already chosen: leave it
  return bookingLang !== "en";                                     // first visit: default is English
}
