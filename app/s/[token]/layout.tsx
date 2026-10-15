import type { Metadata, Viewport } from "next";

/**
 * Everything a phone needs to treat a stay link as an app: its own manifest (so "Add to Home Screen" opens THIS stay,
 * not the front page), a dark status bar that runs under the notch, and the dark theme colour.
 */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  return {
    manifest: /^[A-Za-z0-9_-]{22}$/.test(token) ? `/s/${token}/manifest.webmanifest` : "/manifest.json",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "JOOD" },
    icons: { apple: "/icons/icon-192.png" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0807",
};

export default function StayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
