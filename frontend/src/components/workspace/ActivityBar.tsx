export type ActivityId = "explorer" | "search" | "git" | "run" | "extensions";

const ITEMS: { id: ActivityId; label: string; glyph: string; badge?: number }[] = [
  { id: "explorer", label: "Explorer", glyph: "❏" },
  { id: "search", label: "Search", glyph: "⌕" },
  { id: "git", label: "Source Control", glyph: "⎇", badge: 3 },
  { id: "run", label: "Run and Debug", glyph: "▷" },
  { id: "extensions", label: "Extensions", glyph: "⊞" },
];

/** Far-left activity rail. Selecting Explorer/Search toggles the sidebar. */
export function ActivityBar({ active, onSelect }: { active: ActivityId; onSelect: (id: ActivityId) => void }) {
  return (
    <nav className="flex w-11 shrink-0 flex-col items-center gap-1 rounded-lg border border-line bg-ide-bar py-2" aria-label="Activity bar">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          title={item.label}
          aria-label={item.label}
          aria-pressed={active === item.id}
          onClick={() => onSelect(item.id)}
          className={`relative grid size-9 place-items-center rounded-md text-[17px] focus-visible:outline-2 focus-visible:outline-ide-blue ${
            active === item.id ? "bg-ide-active text-zinc-50 before:absolute before:-left-[9px] before:h-5 before:w-0.5 before:rounded before:bg-ember-bright" : "text-zinc-500 hover:text-zinc-200"
          }`}
        >
          {item.glyph}
          {item.badge ? <span className="absolute bottom-0.5 right-0.5 grid min-w-4 place-items-center rounded-full bg-ide-blue px-0.5 font-mono text-[9px] font-bold text-white">{item.badge}</span> : null}
        </button>
      ))}
      <div className="mt-auto flex flex-col items-center gap-1">
        <span className="grid size-8 place-items-center rounded-full bg-ember-deep font-display text-[11px] font-bold text-white" title="kennycen">K</span>
        <button type="button" title="Settings" aria-label="Settings" className="grid size-9 place-items-center rounded-md text-[16px] text-zinc-500 hover:text-zinc-200">⚙</button>
      </div>
    </nav>
  );
}
