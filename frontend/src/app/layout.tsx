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
        <link rel="stylesheet" href={ICON_FONT_HREF} />
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