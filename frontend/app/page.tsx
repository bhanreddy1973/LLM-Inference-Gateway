import type { ComponentType, SVGProps } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Claude } from "@/components/svgs/claude";
import { DeepSeek } from "@/components/svgs/deepseek";
import { Gemini } from "@/components/svgs/gemini";
import { GithubDark } from "@/components/svgs/githubDark";
import { OpenAI } from "@/components/svgs/openai";
import { Button } from "@/components/ui/button";
import { FeaturesBentoGrid } from "@/components/features-bento-grid";
import Image from "next/image";

export const metadata: Metadata = {
  title: "AI Gateway",
  description:
    "Manage models, teams, budgets, rate limits, analytics, and security policies from one unified gateway.",
};

type FloatingMark = {
  title: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  className: string;
};

const floatingMarks: FloatingMark[] = [
  {
    title: "Claude",
    Icon: Claude,
    className:
      "left-[7%] top-[8%] -rotate-[8deg] bg-[radial-gradient(circle_at_30%_25%,rgba(217,119,87,0.22),rgba(20,20,24,0.92)_65%)] [animation-delay:0s] max-[1180px]:left-[3%] max-[1180px]:top-[4%] max-[820px]:left-2.5 max-[820px]:top-11 max-[820px]:-rotate-[10deg]",
  },
  {
    title: "OpenAI",
    Icon: OpenAI,
    className:
      "right-[7%] top-[6%] rotate-[6deg] bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.08),rgba(20,20,24,0.92)_65%)] [animation-delay:-2.5s] max-[1180px]:right-[3%] max-[1180px]:top-[2%] max-[820px]:right-2.5 max-[820px]:top-11 max-[820px]:rotate-[8deg]",
  },
  {
    title: "Gemini",
    Icon: Gemini,
    className:
      "left-[5%] top-[32%] rotate-[4deg] bg-[radial-gradient(circle_at_30%_25%,rgba(66,133,244,0.18),rgba(20,20,24,0.92)_65%)] [animation-delay:-5s] max-[1180px]:left-[2%] max-[1180px]:top-[26%] max-[820px]:left-1 max-[820px]:top-[474px] max-[820px]:-rotate-[6deg]",
  },
  {
    title: "DeepSeek",
    Icon: DeepSeek,
    className:
      "right-[5%] top-[30%] -rotate-[5deg] bg-[radial-gradient(circle_at_30%_25%,rgba(77,107,254,0.2),rgba(20,20,24,0.92)_65%)] [animation-delay:-7s] max-[1180px]:right-[2%] max-[1180px]:top-[24%] max-[820px]:right-1 max-[820px]:top-[474px] max-[820px]:rotate-[7deg]",
  },
];

export default function Page() {
  return (
    <>
      <section className="relative overflow-hidden border-t-0 bg-[#09090b] px-0 pb-[60px] pt-[72px] text-[#fafafa] max-[820px]:pt-32">
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[length:48px_48px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_40%,black_40%,transparent_100%)]"
          aria-hidden="true"
        />

        <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
          {floatingMarks.map(({ Icon, ...mark }) => (
            <span
              key={mark.title}
              className={`absolute grid size-24 place-items-center rounded-3xl border border-white/10 bg-[#141418]/90 shadow-[0_20px_48px_-16px_rgba(0,0,0,0.65),0_2px_0_0_rgba(255,255,255,0.04)_inset] backdrop-blur-[10px] max-[1180px]:size-[76px] max-[1180px]:rounded-[20px] max-[820px]:size-[78px] ${mark.className}`}
              title={mark.title}
            >
              <Icon aria-hidden="true" className="size-[54px] max-[1180px]:size-[42px] max-[820px]:size-11" />
            </span>
          ))}
        </div>

        <div className="relative z-[2] mx-auto w-full max-w-[1240px] px-8 text-center max-[820px]:px-5">
          <h1 className="mx-auto mb-[22px] mt-7 max-w-[20ch] text-balance text-[clamp(38px,5.6vw,76px)] font-medium leading-[1.05] tracking-[-0.035em] max-[820px]:mt-3.5 max-[820px]:text-[clamp(40px,11vw,56px)]">
            Your AI Stack Needs a
            <br />
            Control Plane.
          </h1>

          <div className="mb-14 flex flex-wrap justify-center gap-2.5 max-[820px]:mb-24">
            <Button id="download-btn" className="h-auto rounded-[10px] px-[22px] py-3.5 text-[15px] font-semibold">
              Try out now
            </Button>
            <Link
              href="https://github.com/bhanreddy1973/LLM-Inference-Gateway"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-white/10 px-[22px] py-3.5 text-[15px] font-medium text-zinc-400 transition hover:border-white/15 hover:bg-white/[0.02] hover:text-zinc-50"
            >
              <GithubDark />
              Star on GitHub
            </Link>
          </div>

          <div className="mx-auto max-w-[1180px] p-2 sm:p-4 rounded-2xl bg-white/5 border border-slate-700 backdrop-blur-xl ring-1 ring-white/10 transition-transform duration-500 [transform:perspective(2000px)_rotateX(2deg)] hover:[transform:perspective(2000px)_rotateX(0deg)] max-[960px]:w-[min(860px,calc(100vw-24px))] max-[960px]:[transform:perspective(1600px)_rotateX(1.5deg)] max-[960px]:hover:[transform:perspective(1600px)_rotateX(0deg)] max-[820px]:hidden">
            <figure className="relative aspect-[2508/1682] overflow-hidden rounded-[14px] bg-[#0a0a0c] shadow-[0_28px_64px_-28px_rgba(0,0,0,0.75)]">
              <Image
                src="/dashboard.png"
                alt="Dashboard of the LLM Gateway showing analytics and model management features"
                width={2508}
                height={1682}
                loading="eager"
                decoding="async"
                className="-m-0.5 h-[calc(100%+4px)] w-[calc(100%+4px)] object-cover object-top"
              />
            </figure>
          </div>
        </div>
      </section>

      <section id="harnesses" className="relative border-t border-white/10 bg-[#09090b] px-0 py-24 text-[#fafafa] max-[820px]:py-16">
        <div className="mx-auto w-full max-w-[1240px] px-8 max-[820px]:px-5">
          <div className="mb-14 max-w-[720px]">
            <h2 className="mb-[18px] text-[clamp(32px,4vw,48px)] font-medium leading-[1.05] tracking-[-0.035em]">
              Fastest Path Between Your App and Any LLM.
            </h2>
            <p className="max-w-[620px] text-lg tracking-[-0.005em] text-zinc-400">
              Manage models, teams, budgets, rate limits, analytics, and security policies from one unified gateway.
            </p>
          </div>

          <FeaturesBentoGrid />
        </div>
      </section>

      <section id="download" className="relative overflow-hidden border-t border-white/10 bg-[#09090b] px-0 py-[120px] text-center text-[#fafafa] before:pointer-events-none before:absolute before:bottom-[-50%] before:left-0 before:right-0 before:h-[60%] before:bg-[radial-gradient(ellipse_at_center,oklch(0.68_0.17_250/0.15)_0%,transparent_60%)] before:opacity-60 max-[820px]:py-24">
        <div className="relative mx-auto w-full max-w-[1240px] px-8 max-[820px]:px-5">
          <h2 className="text-[clamp(40px,6vw,72px)] font-medium leading-[1.05] tracking-[-0.035em]">
            Your AI stack deserves better than provider lock-in.
          </h2>
          <p className="mx-auto mb-9 mt-5 max-w-[560px] text-lg leading-[1.55] tracking-[-0.005em] text-zinc-400">
            Unified APIs, smart routing, observability, and failover for every major LLM provider — through a single gateway.
          </p>
          <div className="mb-6 flex flex-wrap justify-center gap-2.5">
            <Button variant="default" className="h-auto rounded-[10px] px-[22px] py-3.5 text-[15px] font-semibold">
              Try out now
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
