import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import Link from "next/link";

import "./globals.css";
import { NavScrollEffect } from "@/components/nav-scroll-effect";

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
  description:
    "Acheron the opensource ai gateway for all your LLM needs.",
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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen overflow-x-hidden bg-[#09090b] text-[#fafafa] antialiased">
        <NavScrollEffect />
        <div>
          <nav className="nav fixed inset-x-0 top-0 z-[100] border-b border-transparent transition-all duration-200 [&.is-scrolled]:border-white/10 [&.is-scrolled]:bg-[#09090b]/75 [&.is-scrolled]:backdrop-blur-[14px] [&.is-scrolled]:backdrop-saturate-150">
            <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between px-8 max-[820px]:px-5">
              <Link href="/" className="flex items-center gap-2.5" aria-label="Acheron Home here">
                <span className="text-[15px] font-semibold tracking-[-0.02em]">Acheron</span>
              </Link>
              <div className="flex items-center gap-3.5">
                <a
                  className="inline-flex items-center gap-1.5 text-[13px] text-zinc-400 transition hover:text-zinc-50"
                  href="https://github.com/bhanreddy1973/LLM-Inference-Gateway"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>GitHub</span>
                </a>
                <a
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-zinc-50 px-[18px] py-2.5 text-sm font-semibold text-[#09090b] transition hover:-translate-y-px hover:bg-white active:translate-y-0"
                  href="#download"
                >
                  Sign In
                </a>
              </div>
            </div>
          </nav>

          <main>{children}</main>

          <footer className="border-t border-white/10 bg-[#09090b] py-7 text-xs text-zinc-500">
            <div className="mx-auto flex max-w-[1240px] items-center justify-between px-8 max-[820px]:px-5">
              <div className="flex items-center gap-2.5">
                <span>&copy; {new Date().getFullYear()} Built with love</span>
              </div>
              <div className="flex gap-[18px]">
                <a
                  className="transition hover:text-zinc-50"
                  href="https://github.com/bhanreddy1973/LLM-Inference-Gateway"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
