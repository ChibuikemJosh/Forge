import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { SecState } from "../../../hooks/useSecurityWorkflow";
import { DiffViewer } from "./DiffViewer";
import { DiffCompare } from "./DiffCompare";
import { demoSource } from "../../../features/security/demoSource";
import { applyUnifiedDiff } from "../../../features/security/applyUnifiedDiff";

interface Actions { tryExploit: () => void; analyze: () => void; reanalyze: () => void; replay: () => void; review: (d: "approved" | "rejected", r: string, reason?: string) => void; apply: () => void; rollback: () => void; goStep: (n: number) => void; setReviewer: (v: string) => void; retry: () => void }
const outcomeStyle: Record<string, string> = { confirmed: "bg-sev-critical/15 text-sev-critical border-sev-critical/40", satisfied: "bg-test-pass/15 text-test-pass border-test-pass/40", inconclusive: "bg-sev-warning/15 text-sev-warning border-sev-warning/40", failed: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40" };
function Evidence({ ev }: { ev: NonNullable<SecState["analysis"]>["finding"] extends infer F ? F extends { evidence: infer E } ? E : never : never }) {
  const e = ev as unknown as { authenticated_customer: boolean; retrieves_order: boolean; checks_order_ownership: boolean; ownership_expression: string | null; explanation: string };
  const rows = [
    { label: "authenticated_customer", ok: e.authenticated_customer },
    { label: "retrieves_order", ok: e.retrieves_order },
    { label: "checks_order_ownership", ok: e.checks_order_ownership },
  ];
  return <ul className="space-y-1">{rows.map((r, i) => (
    <motion.li key={r.label} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.18 }} className="flex items-center gap-2 font-mono text-[11px]">
      <span className={r.ok ? "text-test-pass" : "text-sev-critical"}>{r.ok ? "✓" : "✗"}</span><span className="text-zinc-300">{r.label}</span>
    </motion.li>))}
    {e.ownership_expression ? <li className="pt-1 font-mono text-[10px] text-zinc-400">ownership: <span className="text-zinc-200">{e.ownership_expression}</span></li> : null}
    <li className="pt-1 text-[11px] text-zinc-500">{e.explanation}</li>
  </ul>;
}

export function SecurityInspector({ state, actions, onCompare }: { state: SecState; actions: Actions; onCompare?: () => void }) {
  const { step, analysis, proposal, busy, error } = state;
  const [reason, setReason] = useState("");
  const [compareOpen, setCompareOpen] = useState(false);
  const finding = analysis?.finding ?? null;
  const patched = proposal?.unified_diff ? applyUnifiedDiff(demoSource, proposal.unified_diff) : demoSource;
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Enter" && (e.target as HTMLElement)?.tagName !== "INPUT" && (e.target as HTMLElement)?.tagName !== "TEXTAREA") { /* primary via button focus; no global hijack */ } }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []);
  const primaryBtn = "w-full rounded-md bg-ember px-3 py-2 text-[12px] font-semibold text-white hover:bg-ember-soft disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ide-blue";
  const quietBtn = "rounded-md px-2.5 py-1.5 text-[11px] text-zinc-400 hover:bg-ide-hover hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-ide-blue disabled:opacity-40";
  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-line bg-panel font-ui" aria-label="Security inspector">
      {analysis ? (
        <div className="border-b border-line p-3">
          <div className="font-mono text-[9px] tracking-wider text-zinc-500">RULE</div>
          <div className="mt-1 text-[12px] font-semibold text-zinc-100">{analysis.rule.title}</div>
          <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{analysis.rule.invariant}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${outcomeStyle[analysis.outcome]}`}>{analysis.outcome}</span>
            {analysis.outcome === "inconclusive" ? <span className="text-[10px] text-sev-warning">Fix detected in source; runtime confirmation pending.</span> : null}
            {analysis.status === "failed" && analysis.error ? <span className="text-[10px] text-sev-critical">{analysis.error}</span> : null}
          </div>
        </div>
      ) : (
        <div className="border-b border-line p-3"><div className="font-mono text-[9px] tracking-wider text-zinc-500">RULE</div><p className="mt-1 text-[11px] text-zinc-400">Authenticated customers may access only their own orders</p></div>
      )}
      <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto p-3">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
            {step === 0 ? <div className="space-y-2 text-[12px] text-zinc-400"><p>As <span className="font-mono text-zinc-200">customer-alice</span>, request Bob&apos;s order from the vulnerable endpoint.</p><p className="font-mono text-[10px]">GET /api/demo/vulnerable/orders/order-bob<br />x-customer-id: customer-alice</p>{state.exploits[0] ? <pre className="rounded border border-line bg-ide-bar p-2 font-mono text-[10px]">{state.exploits[0].status} {JSON.stringify(state.exploits[0].body)}</pre> : null}</div> : null}
            {step === 1 ? <div className="space-y-2 text-[12px] text-zinc-400"><p>Run the deterministic analyzer against the scanned source.</p>{analysis ? <p className="font-mono text-[10px]">outcome: {analysis.outcome} · nodes {analysis.graph.nodes.length} · edges {analysis.graph.edges.length}</p> : null}</div> : null}
            {step === 2 ? (finding ? <div className="space-y-3">
              <div><span className="rounded border border-sev-critical/40 bg-sev-critical/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-sev-critical">{finding.severity}</span> <span className="font-mono text-[10px] text-zinc-500">{finding.finding_id}</span><h3 className="mt-1.5 text-[13px] font-semibold text-zinc-100">{finding.title}</h3><p className="mt-1 text-[11.5px] text-zinc-400">{finding.description}</p></div>
              <div className="text-[11px]"><span className="font-mono text-[9px] text-zinc-500">CONFIDENCE {finding.confidence.toUpperCase()}</span><p className="text-zinc-400">{finding.confidence_rationale}</p><p className="mt-1 text-zinc-500">{finding.severity_rationale}</p></div>
              <div className="text-[11px]"><span className="font-mono text-[9px] text-zinc-500">IMPACT</span><p className="text-zinc-300">{finding.impact}</p><p className="mt-1 font-mono text-[10px] text-ide-blue">{finding.affected_route}</p><p className="font-mono text-[10px] text-zinc-500">{finding.source.file_path} · {finding.source.symbol}:{finding.source.line_start}-{finding.source.line_end}</p></div>
              <div><span className="font-mono text-[9px] text-zinc-500">EVIDENCE</span><div className="mt-1"><Evidence ev={finding.evidence as never} /></div></div>
            </div> : <p className="text-[12px] text-zinc-400">No finding. {analysis?.outcome === "inconclusive" ? "Fix detected in source; runtime confirmation pending." : "Run Analyze first."}</p>) : null}
            {step === 3 ? (proposal ? <div className="space-y-3">
              <DiffViewer diff={proposal.unified_diff} />
              <button type="button" onClick={() => { setCompareOpen(true); onCompare?.(); }} className="w-full rounded-md border border-ember/60 px-3 py-2 font-mono text-[11px] font-semibold text-ember-bright hover:bg-ember/10 focus-visible:outline-2 focus-visible:outline-ide-blue">⇔ Compare code — original vs proposed fix</button>
              <p className="text-[11.5px] text-zinc-400">{proposal.explanation}</p>
              <p className="rounded border border-sev-warning/30 bg-sev-warning/5 p-2 text-[11px] text-sev-warning">{proposal.limitations}</p>
              <label className="block text-[11px] text-zinc-400">Reviewer name (required)<input value={state.reviewer} onChange={(e) => actions.setReviewer(e.target.value)} className="mt-1 w-full rounded border border-line bg-ide-bar px-2 py-1.5 font-mono text-[11px] text-zinc-100 focus-visible:outline-2 focus-visible:outline-ide-blue" placeholder="e.g. kenny" /></label>
              <label className="block text-[11px] text-zinc-400">Reason (optional)<input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded border border-line bg-ide-bar px-2 py-1.5 font-mono text-[11px] text-zinc-100 focus-visible:outline-2 focus-visible:outline-ide-blue" /></label>
              {proposal.review_status !== "pending" ? <p className="font-mono text-[10px] text-zinc-400">review_status: {proposal.review_status}</p> : null}
            </div> : <p className="text-[12px] text-zinc-400">No proposal yet — run Analyze.</p>) : null}
            {step === 4 ? <div className="space-y-2 text-[12px] text-zinc-400"><p>Proposal approved. Apply writes the approved diff to <span className="font-mono text-zinc-200">backend/app/security_demo.py</span> on the backend.</p>{proposal ? <p className="font-mono text-[10px]">review: {proposal.review_status} · application: {proposal.application_status}</p> : null}</div> : null}
            {step === 5 ? <div className="space-y-2 text-[12px] text-zinc-400">
              {state.application ? <div className="space-y-1 font-mono text-[10.5px]"><div>application_status: <span className="text-zinc-100">{state.application.application_status}</span></div><div>verification_status: <span className="text-zinc-100">{state.application.verification_status}</span></div><div className="text-zinc-500">Reference verification</div><div className="break-all text-zinc-300">{state.application.verification_command}</div>{state.application.verification_output ? <pre className="whitespace-pre-wrap rounded border border-line bg-ide-bar p-2">{state.application.verification_output}</pre> : null}</div> : null}
              <p>{state.hasReanalyzed ? "Now replay the attack — the ending is decided by the real HTTP status." : "Re-analyze to see the graph morph, then replay the attack."}</p>
              {state.attackStatus !== null && state.hasReanalyzed ? <p className="font-mono text-[11px]">Last replay: {state.attackStatus} {JSON.stringify(state.attackBody)}</p> : null}
            </div> : null}
            {error ? <div className="mt-3 rounded border border-sev-critical/40 bg-sev-critical/10 p-2 text-[11px] text-sev-critical" role="alert">{error}<button type="button" onClick={actions.retry} className="ml-2 underline">Dismiss</button></div> : null}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="space-y-1.5 border-t border-line p-3">
        <div aria-live="polite">
          {step === 0 ? <button type="button" disabled={busy} onClick={actions.tryExploit} className={primaryBtn}>Try as Alice → Bob&apos;s order</button> : null}
          {step === 1 ? <button type="button" disabled={busy} onClick={actions.analyze} className={primaryBtn}>{busy ? "Analyzing…" : "Analyze"}</button> : null}
          {step === 2 ? <button type="button" disabled={!finding} onClick={() => actions.goStep(3)} className={primaryBtn}>Review fix →</button> : null}
          {step === 3 ? <button type="button" disabled={busy || !state.reviewer.trim() || proposal?.review_status !== "pending"} onClick={() => actions.review("approved", state.reviewer, reason || undefined)} className={primaryBtn}>Approve as human reviewer</button> : null}
          {step === 4 ? <button type="button" disabled={busy} onClick={actions.apply} className={primaryBtn}>{busy ? "Applying…" : "Apply fix"}</button> : null}
          {step === 5 && !state.hasReanalyzed ? <button type="button" disabled={busy} onClick={actions.reanalyze} className={primaryBtn}>{busy ? "Re-analyzing…" : "Re-analyze"}</button> : null}
          {step === 5 && state.hasReanalyzed ? <button type="button" disabled={busy} onClick={actions.replay} className={primaryBtn}>Replay attack</button> : null}
        </div>
        <div className="flex flex-wrap gap-1">
          {step === 0 && state.exploits.length > 0 ? <button type="button" onClick={() => actions.goStep(1)} className={quietBtn}>Next: Scan →</button> : null}
          {step === 1 && analysis ? <button type="button" onClick={() => actions.goStep(2)} className={quietBtn}>Next: Understand →</button> : null}
          {step === 3 ? <button type="button" disabled={busy || !state.reviewer.trim()} onClick={() => actions.review("rejected", state.reviewer, reason || undefined)} className={quietBtn}>Reject</button> : null}
          {(proposal?.rollback_available || state.application?.rollback_available) ? <button type="button" disabled={busy} onClick={actions.rollback} className={quietBtn}>Rollback</button> : null}
          {step === 5 && state.hasReanalyzed ? <button type="button" disabled={busy} onClick={actions.replay} className={quietBtn}>Replay again</button> : null}
        </div>
      </div>
      <DiffCompare open={compareOpen} onClose={() => setCompareOpen(false)} before={demoSource} after={patched} diff={proposal?.unified_diff ?? null} highlight={finding ? { start: finding.source.line_start ?? 1, end: finding.source.line_end ?? 1 } : null} />
    </aside>
  );
}
