import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { Analytics } from "@/components/Analytics";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import {
  SEARCH_CONSOLE_TOKEN,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";
import "./globals.css";

// Body text.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

// Headings.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-heading",
});

// Small labels, numbers and codes.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const viewport: Viewport = {
  themeColor: "#0a0e17",
  colorScheme: "dark light",
};

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
        {/* The icon font is served from this site (see globals.css). */}
        <link
          rel="preload"
          href="/fonts/material-symbols-subset.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>

      <body
        className={[
          inter.variable,
          jakarta.variable,
          jetbrainsMono.variable,
          "font-sans",
        ].join(" ")}
      >
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}