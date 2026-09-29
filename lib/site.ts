/** The public website guests came from (booking, contact). Overridable per environment. */
export const WEBSITE_URL = (process.env.NEXT_PUBLIC_WEBSITE_URL ?? "https://joodspaces.com").replace(/\/$/, "");
