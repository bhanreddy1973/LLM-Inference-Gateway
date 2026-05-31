import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Acheron",
  description: "Acheron — the open-source AI gateway for all your LLM needs.",
  icons: [
    { rel: "icon", url: "/favicon.ico", sizes: "48x48" },
    { rel: "icon", type: "image/png", url: "/favicon-32x32.png", sizes: "32x32" },
    { rel: "icon", type: "image/png", url: "/favicon-16x16.png", sizes: "16x16" },
    { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen overflow-x-hidden bg-[#09090b] text-[#fafafa] antialiased">
        {children}
      </body>
    </html>
  );
}
