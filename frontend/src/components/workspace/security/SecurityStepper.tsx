import { motion } from "motion/react";
export const STEPS = ["Exploit", "Scan", "Understand", "Review", "Apply", "Prove"] as const;
export function SecurityStepper({ step, maxReached, onGo }: { step: number; maxReached: number; onGo: (n: number) => void }) {
  return (
    <ol className="flex items-center gap-1 rounded-lg border border-line bg-ide-bar px-2 py-1.5 font-ui" aria-label="Security workflow steps">
      {STEPS.map((label, i) => {
        const done = i < step || i <= maxReached && i < step;
        const active = i === step;
        const reachable = i <= maxReached;
        return (
          <li key={label} className="relative">
            <button type="button" disabled={!reachable} onClick={() => onGo(i)} aria-current={active ? "step" : undefined}
              className={`relative rounded-md px-2.5 py-1.5 text-[11px] focus-visible:outline-2 focus-visible:outline-ide-blue disabled:opacity-40 ${active ? "text-white" : done ? "text-test-pass" : "text-zinc-400 hover:text-zinc-200"}`}>
              {active ? <motion.span layoutId="step-pill" className="absolute inset-0 rounded-md bg-ember" transition={{ type: "spring", stiffness: 400, damping: 32 }} /> : null}
              <span className="relative flex items-center gap-1.5"><span className="font-mono text-[9px]">{done ? "✓" : i}</span>{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
