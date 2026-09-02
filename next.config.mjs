import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://prrsktmcbmorimfepehh.supabase.co https://*.tile.openstreetmap.org",
      "connect-src 'self' https://*.supabase.co https://api.open-meteo.com https://marine-api.open-meteo.com https://*.upstash.io wss://*.supabase.co https://*.sentry.io",
      "media-src 'self' blob: https://prrsktmcbmorimfepehh.supabase.co",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const config = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "prrsktmcbmorimfepehh.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

const nextIntlConfig = withNextIntl(config);

export default withSentryConfig(nextIntlConfig, {
  // Only upload source maps when SENTRY_AUTH_TOKEN is present
  silent: !process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
  // Disable source map upload when no auth token (local dev / CI without Sentry)
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  telemetry: false,
});
