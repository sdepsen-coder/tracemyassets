import type { Metadata } from "next";
import { Geist, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";

import { Analytics } from "@/components/Analytics";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ICON_FONT_HREF } from "@/lib/iconFont";
import {
  SEARCH_CONSOLE_TOKEN,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-heading",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

/**
 * Loads the icon font stylesheet without holding up the first paint: a
 * stylesheet added by a script does not block rendering. Until the font is in,
 * icons are an invisible 1em box (see globals.css), then "icons-ready" on
 * <html> shows them. Without JavaScript the <noscript> link below loads it the
 * normal way.
 */
const LOAD_ICON_FONT = `(function(){var d=document,e=d.documentElement;function r(){e.classList.add("icons-ready")}var l=d.createElement("link");l.rel="stylesheet";l.href=${JSON.stringify(
  ICON_FONT_HREF,
)};l.onload=function(){(d.fonts&&d.fonts.load?d.fonts.load('24px "Material Symbols Outlined"'):Promise.resolve()).then(r,r)};l.onerror=r;d.head.appendChild(l);setTimeout(r,4000)})();`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — find possible online copies of your artwork`,
    template: "%s",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — find possible online copies of your artwork`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — find possible online copies of your artwork`,
    description: SITE_DESCRIPTION,
  },
  ...(SEARCH_CONSOLE_TOKEN
    ? { verification: { google: SEARCH_CONSOLE_TOKEN } }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: LOAD_ICON_FONT }} />
        <noscript>
          <link rel="stylesheet" href={ICON_FONT_HREF} />
          <style>{".material-symbols-outlined{color:inherit!important}"}</style>
        </noscript>
      </head>

      <body
        className={[
          geist.variable,
          plexSans.variable,
          jetbrainsMono.variable,
          "font-sans",
        ].join(" ")}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}