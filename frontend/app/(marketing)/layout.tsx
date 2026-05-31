import Link from "next/link";
import { NavScrollEffect } from "@/components/nav-scroll-effect";
import { GithubDark } from "@/components/svgs/githubDark";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavScrollEffect />
      <nav className="nav fixed inset-x-0 top-0 z-[100] border-b border-transparent transition-all duration-200 [&.is-scrolled]:border-white/10 [&.is-scrolled]:bg-[#09090b]/75 [&.is-scrolled]:backdrop-blur-[14px] [&.is-scrolled]:backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between px-8 max-[820px]:px-5">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Acheron Home">
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Acheron</span>
          </Link>
          <div className="flex items-center gap-3.5">
            <a
              className="inline-flex items-center gap-1.5 text-[13px] text-zinc-400 transition hover:text-zinc-50"
              href="https://github.com/bhanreddy1973/LLM-Inference-Gateway"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GithubDark />
              <span>GitHub</span>
            </a>
            <Link
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-white/10 px-[18px] py-2.5 text-sm font-medium text-zinc-300 transition hover:border-white/15 hover:bg-white/[0.02] hover:text-zinc-50"
              href="/register"
            >
              Sign Up
            </Link>
            <Link
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-zinc-50 px-[18px] py-2.5 text-sm font-semibold text-[#09090b] transition hover:-translate-y-px hover:bg-white active:translate-y-0"
              href="/login"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <main>{children}</main>

      <footer className="border-t border-white/10 bg-[#09090b] py-7 text-xs text-zinc-500">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-8 max-[820px]:px-5">
          <span>&copy; {new Date().getFullYear()} Built with love</span>
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
    </>
  );
}
