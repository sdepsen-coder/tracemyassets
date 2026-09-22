import type { Metadata } from "next";
import {
  Inter,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "TraceMyAssets",
  description:
    "Register artwork, create protected copies, and review technical image verification signals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>

      <body
        className={[
          inter.variable,
          plusJakartaSans.variable,
          jetbrainsMono.variable,
          "font-sans",
        ].join(" ")}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}