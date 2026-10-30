import { FINDINGS, PROJECT, TEST_RESULTS } from "./data";
interface SecProps { backendOk: boolean | null; outcome: string | null; reviewStatus: string | null; applicationStatus: string | null; verificationStatus: string | null }
export function StatusBar({ layerName, fileName, security }: { layerName: string | null; fileName: string | null; security?: SecProps }) {
  const failed = TEST_RESULTS.filter((t) => t.status === "failed").length;
  const critical = FINDINGS.filter((x) => x.severity === "critical").length;
  if (security) {
    return (
      <footer className="flex h-7 shrink-0 items-center gap-3 overflow-x-auto rounded-lg border border-line bg-ember-deep px-3 font-ui text-[11px] text-orange-100" aria-label="Status bar">
        <span className="font-mono">⎇ {PROJECT.branch}</span>
        <span aria-live="polite">{security.backendOk === null ? "backend: checking…" : security.backendOk ? "backend: connected" : "backend: unreachable"}</span>
        <span>outcome: {security.outcome ?? "—"}</span>
        <span className="hidden md:inline">review: {security.reviewStatus ?? "—"} · apply: {security.applicationStatus ?? "—"}</span>
        <span className="ml-auto">verification: {security.verificationStatus ?? "—"}</span>
        <span className="hidden lg:inline">{PROJECT.framework}</span><span>{PROJECT.language}</span>
      </footer>
    );
  }
  return (
    <footer className="flex h-7 shrink-0 items-center gap-3 rounded-lg border border-line bg-ember-deep px-3 font-ui text-[11px] text-orange-100" aria-label="Status bar">
      <span className="font-mono">⎇ {PROJECT.branch}</span>
      <span>⟳</span>
      <span className="flex items-center gap-1"><span aria-hidden>⊘</span> {critical} <span aria-hidden>⚠</span> {FINDINGS.length - critical}</span>
      <span className="hidden sm:inline">{layerName ?? "Project overview"}{fileName ? ` › ${fileName}` : ""}</span>
      <span className="ml-auto flex items-center gap-3">
        <span className={failed ? "text-red-200" : "text-green-200"}>Tests: {failed ? `${failed} failed` : "passing"}</span>
        <span className="hidden md:inline">{PROJECT.framework}</span>
        <span>{PROJECT.language}</span>
        <span aria-hidden>◔</span>
      </span>
    </footer>
  );
}
