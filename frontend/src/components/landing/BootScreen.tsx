import { motion } from "motion/react";
import { EASE_OUT } from "./motion";

const BOOT_LINES = ["graph · 4 nodes", "edges · data / execution / dependency", "backend · GET /api/health"] as const;

/**
 * Boot splash in the spirit of the reference's "INITIALIZING LIVE SCENE" —
 * a brief workspace load, then it wipes away. Skipped entirely when the
 * user prefers reduced motion (Home.tsx never mounts it in that case).
 */
export function BootScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-[60] grid place-items-center bg-coal"
      exit={{ y: "-100%" }}
      transition={{ duration: 0.7, ease: EASE_OUT }}
      role="status"
      aria-label="Forge workspace is loading"
    >
      <div className="w-[min(420px,84vw)]">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-sm bg-ember font-mono text-[15px] font-bold text-white">F</span>
          <span className="font-display text-[22px] font-light tracking-tight">Forge</span>
          <span className="ml-auto font-mono text-[10px] tracking-[0.18em] text-ember-bright">INITIALIZING WORKSPACE</span>
        </div>

        <div className="mt-7 h-px w-full overflow-hidden bg-line">
          <motion.div
            className="h-full bg-ember"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.15, ease: "easeInOut" }}
          />
        </div>

        <ul className="mt-5 space-y-1.5 font-mono text-[11px] text-zinc-500">
          {BOOT_LINES.map((line, index) => (
            <motion.li
              key={line}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 + index * 0.32 }}
            >
              <span className="text-ember-bright">✓</span> {line}
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
