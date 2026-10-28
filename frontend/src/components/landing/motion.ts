import type { Variants } from "motion/react";

/** Shared Motion vocabulary for the landing page. Keep effects varied —
 *  masked line reveals and HUD sweeps, not the same fade-up everywhere.
 *  `MotionConfig reducedMotion="user"` in Home.tsx honours the OS setting. */

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Masked line reveal for hero headlines (line slides up inside a clip). */
export const lineReveal: Variants = {
  hidden: { y: "110%" },
  visible: (delay: number = 0) => ({
    y: "0%",
    transition: { duration: 0.85, ease: EASE_OUT, delay },
  }),
};

/** Section entrance: short rise, used sparingly (once per section). */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: EASE_OUT, delay },
  }),
};

/** Stagger container for index rows / list items. */
export const staggerParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, x: -18 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

/** whileInView defaults shared by Reveal. */
export const VIEWPORT_ONCE = { once: true, margin: "-80px" } as const;
