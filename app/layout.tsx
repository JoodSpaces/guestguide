import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { UI_COOKIE, STAY_HEADER, parseUiMode } from "@/lib/ui-mode";
import { UiModeProvider } from "@/components/ui/UiMode";
import "./globals.css";

export const metadata: Metadata = {
  title: "JOOD",
  description: "Your stay, your way.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JOOD",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F5F4ED",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";
  // The new look is the default on stay links only; admin and other pages stay classic whatever the cookie says.
  const isStay = (await headers()).get(STAY_HEADER) === "1";
  const ui = isStay ? parseUiMode((await cookies()).get(UI_COOKIE)?.value) : "classic";

  return (
    <html lang={locale} dir={dir} data-ui={ui}>
      <head>
        {/* Prevent flash-of-wrong-theme: apply stored theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('jood-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');else if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}`,
          }}
        />
      </head>
      <body>
        <UiModeProvider mode={ui}>
          <NextIntlClientProvider messages={messages} locale={locale}>
            {children}
          </NextIntlClientProvider>
        </UiModeProvider>
      </body>
    </html>
  );
}
