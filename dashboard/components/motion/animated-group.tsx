"use client";

import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { Children, type ReactNode } from "react";

interface AnimatedGroupProps {
  children: ReactNode;
  className?: string;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
  preset?: "fade" | "slide" | "scale" | "blur";
}

const PRESETS: Record<string, { container: Variants; item: Variants }> = {
  fade: {
    container: {
      hidden: {},
      visible: { transition: { staggerChildren: 0.05 } },
    },
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.3 } },
    },
  },
  slide: {
    container: {
      hidden: {},
      visible: { transition: { staggerChildren: 0.06 } },
    },
    item: {
      hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
      visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", damping: 20, stiffness: 100 } },
    },
  },
  scale: {
    container: {
      hidden: {},
      visible: { transition: { staggerChildren: 0.05 } },
    },
    item: {
      hidden: { opacity: 0, scale: 0.95 },
      visible: { opacity: 1, scale: 1, transition: { type: "spring", damping: 20, stiffness: 100 } },
    },
  },
  blur: {
    container: {
      hidden: {},
      visible: { transition: { staggerChildren: 0.07 } },
    },
    item: {
      hidden: { opacity: 0, filter: "blur(8px)", y: 8 },
      visible: { opacity: 1, filter: "blur(0px)", y: 0, transition: { duration: 0.4 } },
    },
  },
};

/**
 * AnimatedGroup — inspired by motion-primitives (ibelick/motion-primitives)
 * Wrapper that adds staggered animated transitions to children.
 */
export function AnimatedGroup({
  children,
  className,
  variants,
  preset = "slide",
}: AnimatedGroupProps) {
  const presetVariants = PRESETS[preset];
  const containerVariants = variants?.container ?? presetVariants.container;
  const itemVariants = variants?.item ?? presetVariants.item;

  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {Children.map(children, (child) => (
        <motion.div variants={itemVariants}>{child}</motion.div>
      ))}
    </motion.div>
  );
}
