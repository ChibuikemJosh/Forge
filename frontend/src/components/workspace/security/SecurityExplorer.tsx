import type { OutlineSymbol } from "../../../features/security/sourceOutline";
interface Props { outline: OutlineSymbol[]; selectedSymbol: string | null; onSelect: (name: string, line: number) => void; hasFinding: boolean; fixed: boolean }
export function SecurityExplorer({ outline, selectedSymbol, onSelect, hasFinding, fixed }: Props) {
  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-line bg-panel font-ui" aria-label="Explorer">
      <div className="border-b border-line px-3 py-2">
        <div className="font-mono text-[9px] tracking-wider text-zinc-500">EXPLORER · orders-api (controlled demo)</div>
        <p className="mt-1 text-[10px] leading-snug text-zinc-500" title="orders-api — a sample FastAPI app with a planted authorization bug that AI coding tools often write. Controlled demo of one rule, not a general scanner.">Sample FastAPI app with a planted authorization bug that AI coding tools often write. One rule only — not a general scanner.</p>
      </div>
      <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto p-2 text-[12px]">
        <div className="text-zinc-400">▾ backend/app</div>
        <div className="ml-3 mt-0.5 flex items-center gap-2 text-zinc-200"><span>▾</span><span className="font-mono text-[11px]">security_demo.py</span>{hasFinding ? <span className="rounded-full bg-sev-critical/20 px-1.5 font-mono text-[9px] text-sev-critical">●1</span> : fixed ? <span className="font-mono text-[9px] text-test-pass">✓</span> : null}</div>
        <ul className="ml-6 mt-1 space-y-0.5">
          {outline.map((s) => (
            <li key={s.name}>
              <button type="button" onClick={() => onSelect(s.name, s.line)} className={`flex w-full items-baseline gap-2 rounded px-1.5 py-1 text-left focus-visible:outline-2 focus-visible:outline-ide-blue ${selectedSymbol === s.name ? "bg-ide-active" : "hover:bg-ide-hover"}`}>
                <span className="truncate font-mono text-[11px] text-zinc-200">{s.name}</span>
                {s.name === "vulnerable_get_order" ? (fixed ? <span className="font-mono text-[9px] text-test-pass">✓ fixed</span> : <span className="font-mono text-[9px] text-sev-critical">● high</span>) : null}
                <span className="ml-auto truncate font-mono text-[9px] text-zinc-600">{s.note}</span>
                <span className="font-mono text-[9px] text-zinc-600">:{s.line}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-line px-3 py-1.5 font-mono text-[9px] text-zinc-600">backend/app/security_demo.py · scanned file (build-time snapshot)</div>
    </aside>
  );
}
