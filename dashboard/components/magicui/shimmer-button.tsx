"use client";

import { cn } from "@/lib/utils";
import { type ComponentPropsWithoutRef } from "react";

interface ShimmerButtonProps extends ComponentPropsWithoutRef<"button"> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
}

/**
 * ShimmerButton — inspired by MagicUI (magicuidesign/magicui)
 * A button with a shimmering light which travels around the perimeter.
 */
export function ShimmerButton({
  shimmerColor = "rgba(255,255,255,0.12)",
  shimmerSize = "0.08em",
  shimmerDuration = "2.5s",
  borderRadius = "12px",
  background = "linear-gradient(135deg, rgba(139,92,246,0.9), rgba(99,52,216,1))",
  className,
  children,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      className={cn(
        "group relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap px-6 py-3 font-semibold text-sm text-white transition-all duration-300",
        "hover:shadow-[0_0_30px_rgba(139,92,246,0.35)] hover:scale-[1.02] active:scale-[0.98]",
        className,
      )}
      style={{ borderRadius, background }}
      {...props}
    >
      {/* Shimmer traveling around the border */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ borderRadius }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `conic-gradient(from 0deg, transparent 0%, ${shimmerColor} 10%, transparent 20%)`,
            animation: `spin-slow ${shimmerDuration} linear infinite`,
          }}
        />
      </div>

      {/* Inner background to mask the shimmer except at edges */}
      <div
        className="absolute"
        style={{
          inset: shimmerSize,
          borderRadius,
          background,
        }}
      />

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </button>
  );
}
