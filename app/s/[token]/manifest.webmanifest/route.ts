import { NextResponse } from "next/server";

/** The app manifest for one stay link: it opens this stay, dark, full screen. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) return new NextResponse("Not found", { status: 404 });
  const start = `/s/${token}`;
  const body = {
    id: start,
    name: "JOOD",
    short_name: "JOOD",
    description: "Your stay, your way.",
    start_url: start,
    scope: start,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0B0807",
    theme_color: "#0B0807",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
    shortcuts: [
      { name: "Door code", url: `${start}/arrival` },
      { name: "Contact the team", url: `${start}/requests` },
    ],
  };
  return new NextResponse(JSON.stringify(body), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "private, max-age=3600" },
  });
}
