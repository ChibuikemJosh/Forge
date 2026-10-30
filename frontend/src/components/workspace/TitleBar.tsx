import { PROJECT } from "./data";

interface Props {
  leftOpen: boolean;
  rightOpen: boolean;
  bottomOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onToggleBottom: () => void;
  onHome: () => void;
  mode?: "security" | "overview";
  onModeChange?: (m: "security" | "overview") => void;
}

const btn = (active: boolean) =>
  `grid size-7 place-items-center rounded-md text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-ide-blue ${
    active ? "bg-ide-active text-zinc-100" : "text-zinc-500 hover:bg-ide-hover hover:text-zinc-300"
  }`;

export function TitleBar({ leftOpen, rightOpen, bottomOpen, onToggleLeft, onToggleRight, onToggleBottom, onHome, mode, onModeChange }: Props) {
  return (
    <header className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-line bg-ide-bar px-2">
      <button type="button" onClick={onHome} className="ml-1 rounded px-1.5 py-1 font-mono text-[11px] font-semibold tracking-widest text-ember-bright hover:bg-ide-hover focus-visible:outline-2 focus-visible:outline-ide-blue">FORGE</button>
      <nav className="hidden items-center gap-0.5 text-[12px] text-zinc-400 md:flex" aria-label="Menu">
        {["File", "Edit", "View", "Go", "Run"].map((m) => (
          <button key={m} type="button" className="rounded px-2 py-1 hover:bg-ide-hover hover:text-zinc-200">{m}</button>
        ))}
      </nav>
      <span className="text-zinc-600" aria-hidden>← →</span>
      <div className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-md border border-line bg-panel px-3 py-1 text-[12px] text-zinc-500">
        <span aria-hidden>⌕</span><span className="truncate">{PROJECT.name} — Search files, nodes, findings…</span>
      </div>
      {mode && onModeChange ? (
        <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Workspace mode">
          <button type="button" aria-pressed={mode === "security"} onClick={() => onModeChange("security")} title="orders-api — a sample FastAPI app with a planted authorization bug that AI coding tools often write. Controlled demo of one rule, not a general scanner." className={`rounded px-2 py-1 font-mono text-[10px] focus-visible:outline-2 focus-visible:outline-ide-blue ${mode === "security" ? "bg-ember text-white" : "text-zinc-400 hover:bg-ide-hover"}`}>Security flow</button>
          <button type="button" aria-pressed={mode === "overview"} onClick={() => onModeChange("overview")} className={`rounded px-2 py-1 font-mono text-[10px] focus-visible:outline-2 focus-visible:outline-ide-blue ${mode === "overview" ? "bg-ide-active text-zinc-100" : "text-zinc-400 hover:bg-ide-hover"}`}>Overview</button>
          <span className="hidden max-w-[220px] truncate font-mono text-[9px] text-zinc-600 xl:block" title="orders-api — a sample FastAPI app with a planted authorization bug that AI coding tools often write. This is a controlled demo of one rule (&quot;Authenticated customers may access only their own orders&quot;), not a general scanner.">controlled demo · one rule · not a general scanner</span>
        </div>
      ) : null}
      <span className="hidden font-mono text-[10px] text-zinc-600 lg:block">{PROJECT.branch}*</span>
      <div className="flex items-center gap-0.5" role="group" aria-label="Toggle panels">
        <button type="button" className={btn(leftOpen)} onClick={onToggleLeft} aria-pressed={leftOpen} title="Toggle Primary Side Bar (Explorer)">▥</button>
        <button type="button" className={btn(bottomOpen)} onClick={onToggleBottom} aria-pressed={bottomOpen} title="Toggle Panel (Problems / Tests / Terminal)">▤</button>
        <button type="button" className={btn(rightOpen)} onClick={onToggleRight} aria-pressed={rightOpen} title="Toggle Secondary Side Bar (Findings)">▦</button>
      </div>
    </header>
  );
}
