"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.2, 0.7, 0.2, 1] as const;

/**
 * FadeUp — section scroll-in. Fade + translate 16px up, 320ms.
 * Triggered at 20% viewport entry. Reduced-motion fallback: pure fade.
 */
export function FadeUp({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "article" | "header" | "footer";
}) {
  const reduce = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE, delay } },
  };
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={variants}
    >
      {children}
    </MotionTag>
  );
}

/**
 * StaggeredWords — each word fades + translates 8px up with a 60ms stagger.
 * Used on the hero H1 and other display moments.
 *
 * Renders inline so the headline word breaks remain controlled by the
 * caller's grid / flow. Accepts an array of word-or-node children for
 * mixing italic spans into the cascade.
 */
export function StaggeredWords({
  words,
  className,
  highlightIndex,
}: {
  words: (string | ReactNode)[];
  className?: string;
  highlightIndex?: number;
}) {
  const reduce = useReducedMotion();
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
  };
  const word: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  };
  const highlight: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 10, scale: reduce ? 1 : 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.7, ease: EASE, delay: words.length * 0.06 },
    },
  };

  return (
    <motion.span
      className={className}
      initial="hidden"
      animate="show"
      variants={container}
      style={{ display: "inline-block" }}
    >
      {words.map((w, i) => (
        <motion.span
          key={i}
          variants={i === highlightIndex ? highlight : word}
          style={{ display: "inline-block", whiteSpace: "pre" }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </motion.span>
  );
}

/**
 * StaggeredStack — vertical staggered entry. Used for the XL Wordmark
 * masthead (wordmark → rule → tagline) and similar small composed moments.
 */
export function StaggeredStack({
  children,
  className,
  delayChildren = 0.05,
  stagger = 0.1,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delayChildren?: number;
  stagger?: number;
  as?: "div" | "section";
}) {
  const reduce = useReducedMotion();
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  };
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      variants={container}
    >
      {Array.isArray(children)
        ? children.map((c, i) => (
            <motion.div key={i} variants={item}>
              {c}
            </motion.div>
          ))
        : <motion.div variants={item}>{children}</motion.div>}
    </MotionTag>
  );
}

/**
 * ParallaxNumeral — small (4-6px) parallax shift on a mono numeral as the
 * Process section scrolls. Wraps a child; the child renders normally and
 * we apply translateY proportional to scroll-into-view progress.
 */
export { ParallaxNumeral } from "./ParallaxNumeral";
