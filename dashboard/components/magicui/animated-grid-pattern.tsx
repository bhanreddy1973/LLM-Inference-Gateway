"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedGridPatternProps {
  width?: number;
  height?: number;
  numSquares?: number;
  maxOpacity?: number;
  duration?: number;
  className?: string;
}

/**
 * AnimatedGridPattern — inspired by MagicUI & pattern-craft
 * Animated dot grid where squares randomly light up.
 */
export function AnimatedGridPattern({
  width = 32,
  height = 32,
  numSquares = 30,
  maxOpacity = 0.3,
  duration = 3,
  className,
}: AnimatedGridPatternProps) {
  const id = useId();
  const containerRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const resize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const cols = Math.ceil(dimensions.width / width);
  const rows = Math.ceil(dimensions.height / height);

  const squares = Array.from({ length: numSquares }, (_, i) => ({
    col: Math.floor(Math.random() * cols),
    row: Math.floor(Math.random() * rows),
    delay: Math.random() * duration,
    key: i,
  }));

  return (
    <svg
      ref={containerRef}
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      aria-hidden
    >
      <defs>
        <pattern
          id={`grid-${id}`}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={width / 2} cy={height / 2} r={1} fill="currentColor" opacity={0.08} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#grid-${id})`} />
      {squares.map((sq) => (
        <rect
          key={sq.key}
          x={sq.col * width}
          y={sq.row * height}
          width={width - 1}
          height={height - 1}
          rx={4}
          fill="currentColor"
          className="text-violet-400"
          style={{
            opacity: 0,
            animation: `grid-fade ${duration}s ease-in-out ${sq.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes grid-fade {
          0%, 100% { opacity: 0; }
          50% { opacity: ${maxOpacity}; }
        }
      `}</style>
    </svg>
  );
}
