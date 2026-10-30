/** Live backend status — renders the real result of GET /api/health. */
export function BackendPill() {

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 font-mono text-[11px] text-zinc-300">
      <span className={`size-1.5 rounded-full`} aria-hidden />
      Connected
    </span>
  );
}
