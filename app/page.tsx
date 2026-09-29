import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WEBSITE_URL } from "@/lib/site";

// Staff who are signed in go straight to the admin. Everyone else — a guest who trimmed their
// link, someone who hit "Return home" on a 404 — lands on a plain page, not a staff login.
export default async function RootPage() {
  const jar = await cookies();
  if (jar.get("jood_admin")?.value) redirect("/admin");

  return (
    <main
      className="min-h-dvh flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: "var(--jood-ground)", color: "var(--jood-ink)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/jood-logo-dark.png" alt="JOOD" style={{ height: "26px", marginBottom: "36px", opacity: 0.7 }} />
      <h1 className="font-display" style={{ fontSize: "clamp(1.6rem, 5vw, 2.4rem)", marginBottom: "12px" }}>
        Your stay lives at your personal link
      </h1>
      <p style={{ color: "var(--jood-ink-muted)", maxWidth: "34ch", lineHeight: 1.6, marginBottom: "6px" }}>
        Open the link we emailed you when you booked.
      </p>
      <p dir="rtl" style={{ color: "var(--jood-ink-muted)", maxWidth: "34ch", lineHeight: 1.7, marginBottom: "32px" }}>
        افتح الرابط الذي أرسلناه إليك عند الحجز.
      </p>
      <a
        href={WEBSITE_URL}
        style={{
          display: "inline-block", padding: "12px 28px", border: "1px solid var(--jood-line)",
          borderRadius: "var(--radius-pill)", color: "var(--jood-ink)", textDecoration: "none", fontSize: "0.9375rem",
        }}
      >
        Visit JOOD
      </a>
    </main>
  );
}
