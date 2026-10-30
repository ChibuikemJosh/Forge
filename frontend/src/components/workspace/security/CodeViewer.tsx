import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { demoSource, sha256Hex } from "../../../features/security/demoSource";
import { applyUnifiedDiff, addedLineNumbers } from "../../../features/security/applyUnifiedDiff";
import { DiffCompare } from "./DiffCompare";
const ShikiLines = lazy(() => import("./ShikiLines"));
interface Props { highlight: { start: number; end: number } | null; selectedSymbol: string | null; outline: { name: string; line: number }[]; expectedHash: string | null; diff: string | null; applied: boolean; onSelectSymbol: (s: string) => void }
export function CodeViewer({ highlight, selectedSymbol, outline, expectedHash, diff, applied, onSelectSymbol }: Props) {
  const [view, setView] = useState<"before" | "after">("before");
  const [compareOpen, setCompareOpen] = useState(false);
  const [hashState, setHashState] = useState<"checking" | "match" | "mismatch" | "na">("na");
  const scrollRef = useRef<HTMLDivElement>(null);
  const patched = useMemo(() => applyUnifiedDiff(demoSource, diff), [diff]);
  const added = useMemo(() => addedLineNumbers(demoSource, diff), [diff]);
  const code = view === "after" && diff ? patched : demoSource;
  const lines = useMemo(() => code.split("\n"), [code]);
  const targetLine = highlight?.start ?? (selectedSymbol ? outline.find((o) => o.name === selectedSymbol)?.line : undefined);
  useEffect(() => { if (applied && diff) setView("after"); }, [applied, diff]);
  useEffect(() => {
    if (!expectedHash) { setHashState("na"); return; }
    setHashState("checking");
    sha256Hex(demoSource).then((h) => setHashState(h === expectedHash ? "match" : "mismatch")).catch(() => setHashState("mismatch"));
  }, [expectedHash]);
  useEffect(() => {
    if (!targetLine || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-line="${targetLine}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [targetLine, view]);
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-[#0d0d0f] font-ui" aria-label="Code viewer">
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1.5">
        <span className="font-mono text-[10px] text-zinc-300">{view === "after" && diff ? "security_demo.py — after fix (from approved diff)" : "security_demo.py"}</span>
        {hashState === "match" ? <span className="rounded bg-test-pass/15 px-1.5 py-0.5 font-mono text-[9px] text-test-pass">Snapshot matches scanned source ✓</span> : hashState === "mismatch" ? <span className="rounded bg-sev-warning/15 px-1.5 py-0.5 font-mono text-[9px] text-sev-warning">Snapshot differs from what the backend scanned.</span> : hashState === "checking" ? <span className="font-mono text-[9px] text-zinc-500">checking hash…</span> : null}
        <div className="ml-auto flex gap-1">
          <button type="button" onClick={() => setView("before")} aria-pressed={view === "before"} className={`rounded px-2 py-1 font-mono text-[10px] focus-visible:outline-2 focus-visible:outline-ide-blue ${view === "before" ? "bg-ide-active text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>Before</button>
          <button type="button" disabled={!diff} onClick={() => setView("after")} aria-pressed={view === "after"} className={`rounded px-2 py-1 font-mono text-[10px] focus-visible:outline-2 focus-visible:outline-ide-blue disabled:opacity-40 ${view === "after" ? "bg-ide-active text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>After</button>
          <button type="button" disabled={!diff} onClick={() => setCompareOpen(true)} className="rounded bg-ember px-2.5 py-1 font-mono text-[10px] font-semibold text-white hover:bg-ember-soft disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ide-blue">⇔ Compare code</button>
        </div>
      </div>
      <div ref={scrollRef} className="workspace-scroll min-h-0 flex-1 overflow-auto py-2">
        <Suspense fallback={<PlainLines lines={lines} highlight={highlight} added={view === "after" ? added : undefined} />}>
          <ShikiLines code={code} highlight={highlight} added={view === "after" ? added : undefined} />
        </Suspense>
      </div>
      <div className="flex gap-1 overflow-x-auto border-t border-line px-2 py-1">
        {outline.map((o) => (
          <button key={o.name} type="button" onClick={() => onSelectSymbol(o.name)} className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] focus-visible:outline-2 focus-visible:outline-ide-blue ${selectedSymbol === o.name ? "bg-ide-active text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>{o.name}:{o.line}</button>
        ))}
      </div>
      <DiffCompare open={compareOpen} onClose={() => setCompareOpen(false)} before={demoSource} after={patched} diff={diff} highlight={highlight} />
    </section>
  );
}
export function PlainLines({ lines, highlight, added }: { lines: string[]; highlight: { start: number; end: number } | null; added?: Set<number> }) {
  return <>{lines.map((l, i) => { const n = i + 1; const hl = highlight && n >= highlight.start && n <= highlight.end; const add = added?.has(n); return (
    <div key={n} data-line={n} className={`flex font-mono text-[11px] leading-[1.6] ${add ? "bg-test-pass/12" : hl ? "bg-sev-critical/10" : ""}`}><span className="w-10 shrink-0 select-none pr-2 text-right text-zinc-600">{n}</span><span className={`w-1 shrink-0 ${hl ? "bg-sev-critical" : add ? "bg-test-pass" : ""}`} aria-hidden /><pre className={`whitespace-pre pr-4 ${add ? "text-test-pass" : "text-zinc-200"}`}>{l || " "}</pre></div>); })}</>;
}
