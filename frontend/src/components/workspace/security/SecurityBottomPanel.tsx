import { useState } from "react";
import type { SecState } from "../../../hooks/useSecurityWorkflow";
type Tab = "exploit" | "verification" | "output";
export function SecurityBottomPanel({ state, onClose }: { state: SecState; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("exploit");
  const v = state.analysis?.verification;
  const tabs: { id: Tab; label: string }[] = [{ id: "exploit", label: "Exploit" }, { id: "verification", label: "Verification" }, { id: "output", label: "Output" }];
  return (
    <section className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-line bg-panel font-ui" aria-label="Security bottom panel">
      <div className="flex items-center gap-1 border-b border-line px-2 py-1.5" role="tablist" aria-label="Panel tabs">
        {tabs.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`rounded px-2.5 py-1 text-[11.5px] focus-visible:outline-2 focus-visible:outline-ide-blue ${tab === t.id ? "bg-ide-active font-semibold text-zinc-50" : "text-zinc-500 hover:text-zinc-300"}`}>{t.label}</button>)}
        <button type="button" onClick={onClose} aria-label="Close panel" className="ml-auto grid size-7 place-items-center rounded text-zinc-500 hover:bg-ide-hover focus-visible:outline-2 focus-visible:outline-ide-blue">✕</button>
      </div>
      <div className="workspace-scroll min-h-0 flex-1 overflow-auto p-3">
        {tab === "exploit" ? (state.exploits.length ? <ul className="space-y-2">{state.exploits.map((e) => <li key={e.id} className="rounded border border-line bg-ide-bar p-2 font-mono text-[10.5px]"><span className={e.status === 200 ? "text-sev-critical" : e.status === 403 ? "text-test-pass" : "text-zinc-300"}>{e.kind} · {e.status}</span> <span className="text-zinc-500">{e.at} · {e.durationMs}ms · GET /api/demo/vulnerable/orders/order-bob · x-customer-id: customer-alice</span><pre className="mt-1 whitespace-pre-wrap text-zinc-200">{JSON.stringify(e.body, null, 2)}</pre></li>)}</ul> : <p className="font-mono text-[11px] text-zinc-500">No requests yet.</p>) : null}
        {tab === "verification" ? (v || state.application ? <div className="space-y-1 font-mono text-[11px] text-zinc-300">
          {v ? <><div>tested: {v.tested}</div><div>summary: {v.summary}</div><div>executed: {String(v.executed)} · passed: {String(v.passed)} · status: {v.status}</div>{v.error ? <div className="text-sev-critical">error: {v.error}</div> : null}</> : null}
          {state.application ? <><div className="pt-2 text-zinc-500">Reference verification</div><div>command: {state.application.verification_command}</div><div>application: {state.application.application_status} · verification: {state.application.verification_status}</div>{state.application.verification_output ? <pre className="whitespace-pre-wrap">{state.application.verification_output}</pre> : null}</> : null}
        </div> : <p className="font-mono text-[11px] text-zinc-500">No verification yet.</p>) : null}
        {tab === "output" ? (state.logs.length ? <ul className="space-y-0.5 font-mono text-[10.5px]">{state.logs.map((l) => <li key={l.id} className="flex gap-2"><span className="text-zinc-600">{l.at}</span><span className="text-zinc-200">{l.method} {l.path}</span><span className={l.status === 200 ? "text-test-pass" : "text-sev-critical"}>{l.status}</span><span className="text-zinc-500">{l.durationMs}ms</span></li>)}</ul> : <p className="font-mono text-[11px] text-zinc-500">No API calls yet.</p>) : null}
      </div>
    </section>
  );
}
