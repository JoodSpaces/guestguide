import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/AdminHeader";

export const metadata: Metadata = {
  title: "JOOD Admin",
  robots: "noindex, nofollow",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      dir="ltr"
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--jood-ground)",
        color: "var(--jood-ink)",
      }}
    >
      <AdminHeader />

      <main style={{ padding: "32px 24px", maxWidth: "900px", margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
