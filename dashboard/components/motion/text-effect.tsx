"use client";

import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface TextEffectProps {
  children: string;
  per?: "word" | "char";
  delay?: number;
  className?: string;
  as?: "p" | "h1" | "h2" | "h3" | "span";
  preset?: "fade" | "slide" | "blur" | "scale";
}

const PRESETS: Record<string, { hidden: object; visible: object }> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  slide: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  },
  blur: {
    hidden: { opacity: 0, filter: "blur(8px)" },
    visible: { opacity: 1, filter: "blur(0px)" },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
};

/**
 * TextEffect — inspired by motion-primitives (ibelick/motion-primitives)
 * Animate text content with per-word or per-character effects.
 */
export function TextEffect({
  children,
  per = "word",
  delay = 0,
  className,
  as: Tag = "p",
  preset = "blur",
}: TextEffectProps) {
  const variants = PRESETS[preset];

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: per === "char" ? 0.03 : 0.08,
        delayChildren: delay,
      },
    },
  };

  const itemVariants = {
    hidden: variants.hidden,
    visible: {
      ...variants.visible,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
    },
  } as unknown as Variants;

  const segments = per === "char" ? children.split("") : children.split(" ");

  return (
    <motion.span
      className={cn("inline-flex flex-wrap", className)}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      aria-label={children}
    >
      {segments.map((segment, i) => (
        <motion.span
          key={`${segment}-${i}`}
          variants={itemVariants}
          className="inline-block"
          style={{ whiteSpace: "pre" }}
        >
          {segment}
          {per === "word" && i < segments.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </motion.span>
  );
}
