import { motion, useReducedMotion } from "motion/react";

const ITEMS = [
  "data → values, port to port",
  "execution → control flow, ordered",
  "dependency → definitions, checked",
  "nodes = real components",
  "AI proposes · you approve",
  "one model · code + graph",
] as const;

/** Slow mono ticker between hero and capabilities. Paused for reduced motion. */
export function Ticker() {
  const reduceMotion = useReducedMotion();
  const row = [...ITEMS, ...ITEMS];

  return (
    <div className="overflow-hidden border-t border-line bg-panel/60 py-3" aria-hidden>
      <motion.div
        className="flex w-max items-center gap-10 pr-10"
        animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 36, ease: "linear", repeat: Infinity }}
      >
        {row.map((item, index) => (
          <span key={`${item}-${index}`} className="flex items-center gap-10 whitespace-nowrap font-mono text-[11px] tracking-[0.08em] text-zinc-500">
            {item}
            <span className="size-1 rounded-full bg-ember" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}
