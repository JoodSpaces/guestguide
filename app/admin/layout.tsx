import type { Metadata } from "next";
import { headers } from "next/headers";
import { AdminHeader } from "@/components/admin/AdminHeader";

export const metadata: Metadata = {
  title: "JOOD Admin",
  robots: "noindex, nofollow",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const role = (h.get("x-admin-role") ?? "admin") as "admin" | "ops" | "concierge";
  const name = h.get("x-admin-name") ?? "";

  return (
    <div dir="ltr" style={{ minHeight: "100dvh", backgroundColor: "var(--jood-ground)", color: "var(--jood-ink)" }}>
      <AdminHeader role={role} name={name} />
      <main style={{ padding: "32px 24px", maxWidth: "900px", margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
