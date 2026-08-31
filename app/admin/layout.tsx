import type { Metadata } from "next";
import { headers } from "next/headers";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { LiveFeedPanel } from "@/components/admin/LiveFeedPanel";
import { NavigationProgress } from "@/components/admin/NavigationProgress";
import { Toaster } from "@/components/admin/Toaster";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "JOOD Admin",
  robots: "noindex, nofollow",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const role = (h.get("x-admin-role") ?? "admin") as "admin" | "ops" | "housekeeping" | "maintenance" | "concierge";
  const name = h.get("x-admin-name") ?? "";
  const authenticated = !!name;

  if (!authenticated) {
    return (
      <div dir="ltr" style={{ minHeight: "100dvh", backgroundColor: "var(--jood-ground)", color: "var(--jood-ink)" }}>
        {children}
      </div>
    );
  }

  return (
    <div dir="ltr" style={{ minHeight: "100dvh", backgroundColor: "var(--jood-ground)", color: "var(--jood-ink)" }}>
      <NavigationProgress />
      <AdminHeader role={role} name={name} />
      <main style={{ padding: "32px 24px", maxWidth: "900px", margin: "0 auto" }}>
        {children}
      </main>
      <LiveFeedPanel />
      <Toaster />
    </div>
  );
}
