import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE_OUT } from "./motion";
import { Reveal } from "./Reveal";

type WorkflowTab = "code" | "graph" | "ai";

const TABS: readonly { id: WorkflowTab; label: string }[] = [
  { id: "code", label: "1 · Edit code" },
  { id: "graph", label: "2 · See the graph" },
  { id: "ai", label: "3 · Approve AI change" },
];

const HEALTH_CODE = `# app/api/health.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/api/health")
def health():
    return {"status": "ok", "service": "forge-api"}`;

export function WorkflowTabs() {
  const [tab, setTab] = useState<WorkflowTab>("code");

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Forge workflow">
        {TABS.map((item) => {
          const isActive = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(item.id)}
              className={`relative rounded-sm border px-4 py-2.5 text-[15px] font-bold focus-visible:outline-2 focus-visible:outline-ember ${
                isActive ? "border-ember text-white" : "border-line bg-panel text-zinc-300 hover:border-zinc-600 hover:text-white"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="workflow-tab-pill"
                  className="absolute inset-0 bg-ember"
                  transition={{ type: "spring", stiffness: 480, damping: 38 }}
                />
              )}
              <span className="relative z-10">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="relative mt-4 overflow-hidden rounded-md border border-line bg-panel" role="tabpanel">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 22 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -22 }}
            transition={{ duration: 0.32, ease: EASE_OUT }}
          >
        {tab === "code" && (
          <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-zinc-300">
            <code>{HEALTH_CODE}</code>
          </pre>
        )}

        {tab === "graph" && (
          <div className="p-5 sm:p-6">
            <p className="text-[17px] leading-relaxed text-zinc-200">
              The same endpoint, as a node. Its <span className="font-mono text-[14px] text-ember-bright">data</span> edge
              feeds the frontend client, its <span className="font-mono text-[14px] text-ember-bright">dependency</span>{" "}
              edge is covered by <span className="font-mono text-[14px]">test_health</span>.
            </p>
            <p className="mt-4 font-mono text-[12px] leading-loose text-zinc-400">
              GET /api/health ──data──▶ fetchBackendHealth()
              <br />
              GET /api/health ──dependency──▶ test_health ✓ passing
            </p>
          </div>
        )}

        {tab === "ai" && (
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-sm bg-ember px-2 py-0.5 font-mono text-[10px] font-semibold text-white">PROPOSAL</span>
              <span className="font-mono text-[12px] text-zinc-300">Add GET /api/projects</span>
            </div>
            <ul className="mt-4 space-y-2 text-[16px] leading-relaxed text-zinc-300">
              <li>
                + New node <span className="font-mono text-[13px]">Projects API</span> — touches{" "}
                <span className="font-mono text-[13px]">app/api/projects.py</span>
              </li>
              <li>
                + Data edge → <span className="font-mono text-[13px]">ForgeProject</span> schema · no existing edges removed
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className="rounded-sm bg-ember px-4 py-2.5 text-[14px] font-bold text-white hover:bg-ember-soft focus-visible:outline-2 focus-visible:outline-white">
                Approve proposal
              </button>
              <button type="button" className="rounded-sm border border-line px-4 py-2.5 text-[14px] font-bold text-zinc-200 hover:border-zinc-500 focus-visible:outline-2 focus-visible:outline-ember">
                Request changes
              </button>
            </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function WorkflowSection() {
  return (
    <section id="workflow" className="scroll-mt-16 border-t border-line bg-panel/40">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <h2 className="font-display text-[32px] font-light leading-[1.1] tracking-[-0.03em]">
              One project,
              <span className="block font-light text-zinc-400">two views.</span>
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-zinc-300">
              Write Python as usual. Forge keeps the graph honest — and puts a human approval gate between an AI
              suggestion and your source files.
            </p>
            <p className="mt-5 font-mono text-[12px] text-zinc-500">Try the three tabs →</p>
          </Reveal>
          <Reveal className="lg:col-span-8" delay={0.1}>
            <WorkflowTabs />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
