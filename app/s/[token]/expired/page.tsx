import { getTranslations } from "next-intl/server";

export default async function ExpiredPage() {
  const t = await getTranslations("expired");

  return (
    <main
      className="min-h-dvh flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: "var(--jood-ground)", color: "var(--jood-ink)" }}
    >
      <h1
        className="font-display animate-reveal"
        style={{ fontSize: "clamp(1.8rem, 5vw, 2.8rem)", marginBottom: "1rem" }}
      >
        {t("title")}
      </h1>
      <p
        className="animate-reveal"
        style={{
          color: "var(--jood-ink-muted)",
          maxWidth: "32ch",
          animationDelay: "80ms",
        }}
      >
        {t("body")}
      </p>
      <div
        className="animate-reveal flex flex-col gap-3 w-full mt-8"
        style={{ maxWidth: "320px", animationDelay: "160ms" }}
      >
        <a
          href="#review"
          style={{
            display: "block",
            padding: "14px 24px",
            border: "1px solid var(--jood-line)",
            borderRadius: "var(--radius-pill)",
            color: "var(--jood-ink)",
            textDecoration: "none",
            fontSize: "0.9375rem",
          }}
        >
          {t("review_cta")}
        </a>
        <a
          href="#book-direct"
          style={{
            display: "block",
            padding: "14px 24px",
            backgroundColor: "var(--jood-ink)",
            borderRadius: "var(--radius-pill)",
            color: "var(--jood-ground)",
            textDecoration: "none",
            fontSize: "0.9375rem",
          }}
        >
          {t("book_direct")}
        </a>
      </div>
    </main>
  );
}
