import { useState } from "react";
import { FILE_BY_ID, FINDINGS, LAYER_BY_ID, type Severity } from "./data";

type Tab = "findings" | "inspector";
const sevClass: Record<Severity, string> = { critical: "text-sev-critical border-sev-critical/40 bg-sev-critical/10", warning: "text-sev-warning border-sev-warning/40 bg-sev-warning/10", info: "text-sev-info border-sev-info/40 bg-sev-info/10" };
const sevDot: Record<Severity, string> = { critical: "bg-sev-critical", warning: "bg-sev-warning", info: "bg-sev-info" };

interface Props {
  selectedFileId: string | null;
  selectedFindingId: string | null;
  applied: ReadonlySet<string>;
  onSelectFinding: (findingId: string, fileId: string) => void;
  onApply: (findingId: string) => void;
  onClearFile: () => void;
}

// Right sidebar: Findings + Remediation, and an Inspector for the selected file. 
export function InspectorPanel({ selectedFileId, selectedFindingId, applied, onSelectFinding, onApply, onClearFile }: Props) {
  const [tab, setTab] = useState<Tab>("findings");
  const file = selectedFileId ? FILE_BY_ID[selectedFileId] : null;
  const active = FINDINGS.find((x) => x.id === selectedFindingId) ?? FINDINGS[0];
  const fileFindings = file ? FINDINGS.filter((x) => x.fileId === file.id) : [];

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-line bg-panel font-ui" aria-label="Findings and remediation">
      <div className="flex items-center gap-1 px-2 pt-2" role="tablist" aria-label="Right sidebar">
        {(["findings", "inspector"] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold tracking-wider focus-visible:outline-2 focus-visible:outline-ide-blue ${tab === t ? "bg-ide-active text-zinc-50" : "text-zinc-500 hover:text-zinc-300"}`}>
            {t === "findings" ? `FINDINGS ${FINDINGS.length}` : "INSPECTOR"}
          </button>
        ))}
        <span className="ml-auto px-1 font-mono text-[10px] text-zinc-600">mock</span>
      </div>

      {tab === "findings" ? (
        <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto p-2.5">
          <div className="space-y-2" role="list" aria-label="Findings">
            {FINDINGS.map((finding) => {
              const target = FILE_BY_ID[finding.fileId];
              const isActive = finding.id === active.id;
              return (
                <button key={finding.id} type="button" role="listitem" onClick={() => onSelectFinding(finding.id, finding.fileId)}
                  className={`block w-full rounded-lg border p-3 text-left focus-visible:outline-2 focus-visible:outline-ide-blue ${isActive ? "border-ember/70 bg-panel-2" : "border-line bg-ide-bar hover:border-zinc-600"}`}>
                  <span className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${sevDot[finding.severity]}`} aria-hidden />
                    <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${sevClass[finding.severity]}`}>{finding.severity}</span>
                    <span className="font-mono text-[10px] text-zinc-500">{finding.id}</span>
                    {applied.has(finding.id) ? <span className="ml-auto font-mono text-[9px] font-bold text-test-pass">APPLIED ✓</span> : null}
                  </span>
                  <span className="mt-2 block font-display text-[13px] font-semibold leading-snug text-zinc-100">{finding.title}</span>
                  <span className="mt-1 block truncate font-mono text-[10.5px] text-ide-blue">{target.path}:{finding.line}</span>
                </button>
              );
            })}
          </div>

          <section className="mt-3 rounded-lg border border-line bg-ide-bar p-3" aria-label="Remediation">
            <h3 className="font-mono text-[10px] font-bold tracking-[0.14em] text-ember-bright">REMEDIATION — {active.id}</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-400">{active.detail}</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-300">{active.remediation}</p>
            <div className="mt-3 overflow-hidden rounded-md border border-line font-mono text-[11px] leading-relaxed">
              <p className="bg-sev-critical/10 px-2.5 py-1.5 text-red-200"><span className="text-sev-critical">− </span>{active.diff.removed}</p>
              <p className="bg-test-pass/10 px-2.5 py-1.5 text-green-100"><span className="text-test-pass">+ </span>{active.diff.added}</p>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={applied.has(active.id)} onClick={() => onApply(active.id)}
                className="flex-1 rounded-md bg-ember px-3 py-2 font-display text-[12px] font-semibold text-white hover:bg-ember-soft disabled:cursor-default disabled:bg-ide-active disabled:text-test-pass focus-visible:outline-2 focus-visible:outline-ide-blue">
                {applied.has(active.id) ? "Applied (mock)" : "Apply fix"}
              </button>
              <button type="button" className="rounded-md border border-line px-3 py-2 text-[12px] text-zinc-300 hover:bg-ide-hover focus-visible:outline-2 focus-visible:outline-ide-blue">Dismiss</button>
            </div>
            <p className="mt-2 font-mono text-[9.5px] text-zinc-600">Mock only — nothing is written to disk.</p>
          </section>
        </div>
      ) : (
        <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto p-3">
          {file ? (
            <>
              <p className="font-mono text-[10px] tracking-[0.14em] text-ide-blue">FILE · {LAYER_BY_ID[file.layerId].name.toUpperCase()}</p>
              <h3 className="mt-1.5 font-display text-[16px] font-bold text-zinc-50">{file.name}</h3>
              <p className="mt-0.5 break-all font-mono text-[11px] text-zinc-500">{file.path}</p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-zinc-400">{file.desc}</p>
              <dl className="mt-3 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between rounded bg-ide-bar px-2 py-1.5"><dt className="text-zinc-500">complexity</dt><dd className="text-zinc-200">{file.complexity}</dd></div>
                <div className="flex justify-between rounded bg-ide-bar px-2 py-1.5"><dt className="text-zinc-500">imports</dt><dd className="text-zinc-200">{file.imports.length}</dd></div>
                <div className="flex justify-between rounded bg-ide-bar px-2 py-1.5"><dt className="text-zinc-500">findings</dt><dd className="text-zinc-200">{fileFindings.length}</dd></div>
              </dl>
              {file.imports.length ? (<><h4 className="mt-4 font-mono text-[10px] font-bold tracking-widest text-zinc-500">IMPORTS</h4><ul className="mt-1.5 space-y-1">{file.imports.map((id) => <li key={id} className="truncate rounded bg-ide-bar px-2 py-1.5 font-mono text-[10.5px] text-zinc-400">{FILE_BY_ID[id]?.path ?? id}</li>)}</ul></>) : null}
              <button type="button" onClick={onClearFile} className="mt-4 w-full rounded-md border border-line py-2 text-[12px] text-zinc-300 hover:bg-ide-hover focus-visible:outline-2 focus-visible:outline-ide-blue">Clear selection</button>
            </>
          ) : <p className="text-[12.5px] leading-relaxed text-zinc-500">Select a file node in the graph or a file in the Explorer to inspect it here. Findings for it will be highlighted.</p>}
        </div>
      )}
    </aside>
  );
}
