import { useState } from "react";
import { FINDINGS, TERMINAL_LINES, TEST_RESULTS, FILE_BY_ID } from "./data";

export type BottomTab = "problems" | "tests" | "terminal" | "output";
const TABS: { id: BottomTab; label: string }[] = [
  { id: "problems", label: "Problems" },
  { id: "tests", label: "Tests & Verification" },
  { id: "terminal", label: "Terminal" },
  { id: "output", label: "Output" },
];

/** Bottom panel (VS Code Panel) — toggled from the title bar. Mock results. */
export function BottomPanel({
  onClose,
  onSelectFinding,
}: {
  onClose: () => void;
  onSelectFinding: (findingId: string, fileId: string) => void;
}) {
  const [tab, setTab] = useState<BottomTab>("tests");
  const passed = TEST_RESULTS.filter((t) => t.status === "passed").length;
  const failed = TEST_RESULTS.filter((t) => t.status === "failed").length;
  return (
    <section
      className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-line bg-panel font-ui"
      aria-label="Bottom panel"
    >
      <div
        className="flex items-center gap-1 border-b border-line px-2 py-1.5"
        role="tablist"
        aria-label="Panel tabs"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded px-2.5 py-1 text-[11.5px] focus-visible:outline-2 focus-visible:outline-ide-blue ${tab === t.id ? "bg-ide-active font-semibold text-zinc-50" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            {t.label}
            {t.id === "problems" ? (
              <span className="ml-1.5 rounded-full bg-sev-critical/20 px-1.5 font-mono text-[9px] font-bold text-sev-critical">
                {FINDINGS.length}
              </span>
            ) : null}
          </button>
        ))}
        <span className="ml-2 hidden font-mono text-[10px] text-zinc-600 sm:block">
          pytest · {passed} passed · {failed} failed
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="ml-auto grid size-7 place-items-center rounded text-zinc-500 hover:bg-ide-hover hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-ide-blue"
        >
          ✕
        </button>
      </div>
      <div className="workspace-scroll min-h-0 flex-1 overflow-x-auto overflow-y-auto p-3">
        {tab === "problems" ? (
          <ul className="space-y-1">
            {FINDINGS.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={() => onSelectFinding(x.id, x.fileId)}
                  className="flex w-full items-baseline gap-3 rounded px-2 py-1.5 text-left text-[12px] hover:bg-ide-hover focus-visible:outline-2 focus-visible:outline-ide-blue"
                >
                  <span
                    className={
                      x.severity === "critical"
                        ? "text-sev-critical"
                        : x.severity === "warning"
                          ? "text-sev-warning"
                          : "text-sev-info"
                    }
                    aria-hidden
                  >
                    {x.severity === "info" ? "ℹ" : "⚠"}
                  </span>
                  <span className="text-zinc-200">{x.title}</span>
                  <span className="ml-auto truncate font-mono text-[10.5px] text-zinc-500">
                    {FILE_BY_ID[x.fileId].path}:{x.line}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {tab === "tests" ? (
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="font-mono text-[10px] tracking-wider text-zinc-500">
                <th className="pb-2 pr-3 font-medium">RESULT</th>
                <th className="pb-2 pr-3 font-medium">TEST</th>
                <th className="pb-2 pr-3 font-medium">FILE</th>
                <th className="pb-2 font-medium">TIME</th>
              </tr>
            </thead>
            <tbody>
              {TEST_RESULTS.map((t) => (
                <tr key={t.id} className="border-t border-line/60">
                  <td className="py-1.5 pr-3">
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[9.5px] font-bold ${t.status === "passed" ? "bg-test-pass/15 text-test-pass" : t.status === "failed" ? "bg-sev-critical/15 text-sev-critical" : "bg-zinc-500/15 text-zinc-400"}`}
                    >
                      {t.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-[11px] text-zinc-200">
                    {t.name}
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-[11px] text-zinc-500">
                    {t.file}
                  </td>
                  <td className="py-1.5 font-mono text-[11px] text-zinc-500">
                    {t.duration}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {tab === "terminal" ? (
          <pre className="whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-zinc-400">
            {TERMINAL_LINES.join("\n")}
            <span className="text-zinc-200">
              {"\n"}kennycen@KC orders-api %{" "}
              <span className="animate-pulse">▊</span>
            </span>
          </pre>
        ) : null}
        {tab === "output" ? (
          <pre className="whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-zinc-500">
            [Forge] mock workspace loaded — orders-api (Python){`\n`}[Graph] 6
            layers · 27 files · 10 layer edges{`\n`}[Tests] last run 1.27s — see
            Tests &amp; Verification tab
          </pre>
        ) : null}
      </div>
    </section>
  );
}
