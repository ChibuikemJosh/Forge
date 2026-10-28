import { useBackendHealth } from "../../hooks/useBackendHealth";

const DOT_BY_STATE = {
  connected: "bg-emerald-400",
  loading: "bg-amber-400 animate-pulse",
  error: "bg-red-400",
} as const;

/** Live backend status — renders the real result of GET /api/health. */
export function BackendPill() {
  const { state, serviceName } = useBackendHealth();
  const label =
    state === "connected"
      ? `${serviceName} connected`
      : state === "loading"
        ? "Checking backend"
        : "Backend unreachable";

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 font-mono text-[11px] text-zinc-300">
      <span className={`size-1.5 rounded-full ${DOT_BY_STATE[state]}`} aria-hidden />
      {label}
    </span>
  );
}
