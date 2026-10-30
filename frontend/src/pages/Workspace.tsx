import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ActivityBar, type ActivityId } from "../components/workspace/ActivityBar";
import { BottomPanel } from "../components/workspace/BottomPanel";
import { FileExplorer } from "../components/workspace/FileExplorer";
import { GraphCanvas } from "../components/workspace/GraphCanvas";
import { InspectorPanel } from "../components/workspace/InspectorPanel";
import { StatusBar } from "../components/workspace/StatusBar";
import { ResizeHandle } from "../components/workspace/ResizeHandle";
import { TitleBar } from "../components/workspace/TitleBar";
import { FILE_BY_ID, LAYER_BY_ID } from "../components/workspace/data";
import { useSecurityWorkflow } from "../hooks/useSecurityWorkflow";
import { SecurityStepper } from "../components/workspace/security/SecurityStepper";
import { SecurityExplorer } from "../components/workspace/security/SecurityExplorer";
import { SecurityFlowCanvas } from "../components/workspace/security/SecurityFlowCanvas";
import { CodeViewer } from "../components/workspace/security/CodeViewer";
import { SecurityInspector } from "../components/workspace/security/SecurityInspector";
import { SecurityBottomPanel } from "../components/workspace/security/SecurityBottomPanel";
import { demoSource } from "../features/security/demoSource";
import { buildOutline } from "../features/security/sourceOutline";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const LEFT = { def: 240, min: 180, max: 420 };
const RIGHT = { def: 340, min: 240, max: 560 };
const BOTTOM = { def: 224, min: 120, max: 520 };
type Mode = "security" | "overview";
type CenterTab = "graph" | "code" | "split";

export default function Workspace() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("security");
  const [activity, setActivity] = useState<ActivityId>("explorer");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [bottomOpen, setBottomOpen] = useState(false);
  const [layerId, setLayerId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [applied, setApplied] = useState<ReadonlySet<string>>(new Set());
  const [leftWidth, setLeftWidth] = useState(LEFT.def);
  const [rightWidth, setRightWidth] = useState(RIGHT.def);
  const [bottomHeight, setBottomHeight] = useState(BOTTOM.def);
  const [centerTab, setCenterTab] = useState<CenterTab>("split");
  const [splitPct, setSplitPct] = useState(52);
  const sec = useSecurityWorkflow();
  const { state, actions } = sec;
  const outline = useMemo(() => buildOutline(demoSource), []);
  const maxReached = useMemo(() => {
    if (state.application?.application_status === "applied" || state.phase === "applied") return 5;
    if (state.proposal?.review_status === "approved") return 4;
    if (state.analysis?.fix_proposal || state.proposal) return 3;
    if (state.analysis) return 2;
    if (state.exploits.length) return 1;
    return 0;
  }, [state]);

  useEffect(() => { actions.checkHealth(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (state.exploits.length === 1) setBottomOpen(true); }, [state.exploits.length]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") actions.clearSelection(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [actions]);

  const selectFile = useCallback((fileId: string) => { const file = FILE_BY_ID[fileId]; if (!file) return; setSelectedFileId(fileId); setLayerId(file.layerId); setRightOpen(true); }, []);
  const selectFinding = useCallback((findingId: string, fileId: string) => { setSelectedFindingId(findingId); selectFile(fileId); setRightOpen(true); }, [selectFile]);
  const handleActivity = useCallback((id: ActivityId) => { setActivity(id); if (id === "explorer" || id === "search") setLeftOpen(true); else setLeftOpen(false); }, []);
  const applyFix = useCallback((findingId: string) => { setApplied((prev) => new Set(prev).add(findingId)); }, []);

  const finding = state.analysis?.finding ?? null;
  const highlight = finding ? { start: finding.source.line_start ?? 1, end: finding.source.line_end ?? 1 } : state.selectedSymbol ? (() => { const o = outline.find((x) => x.name === state.selectedSymbol); return o ? { start: o.line, end: o.line + 6 } : null; })() : null;
  const fixed = !!state.analysis && !state.analysis.finding && state.hasReanalyzed;

  return (
    <div className="flex h-screen flex-col gap-1.5 bg-ide-bg p-1.5 font-ui text-zinc-100">
      <a href="#workspace-graph" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-ember focus:px-3 focus:py-2 focus:text-white">Skip to graph</a>
      <Toaster theme="dark" toastOptions={{ style: { background: "#1a1a1d", border: "1px solid #262629", color: "#f4f4f5" } }} position="bottom-right" />
      <div className="flex items-center gap-2 rounded-lg border border-sev-warning/30 bg-sev-warning/5 px-3 py-1 text-[11px] text-zinc-300" role="note">
        <span aria-hidden>⚠</span><span><strong className="text-zinc-100">orders-api</strong> — a sample FastAPI app with a planted authorization bug that AI coding tools often write. This is a controlled demo of one rule (“Authenticated customers may access only their own orders”), not a general scanner.</span>
      </div>
      <TitleBar leftOpen={leftOpen} rightOpen={rightOpen} bottomOpen={bottomOpen} onToggleLeft={() => setLeftOpen((v) => !v)} onToggleRight={() => setRightOpen((v) => !v)} onToggleBottom={() => setBottomOpen((v) => !v)} onHome={() => navigate("/")} mode={mode} onModeChange={setMode} />
      <div className="flex min-h-0 flex-1 gap-1.5">
        <ActivityBar active={activity} onSelect={handleActivity} />
        {leftOpen ? (<>
          <div className="shrink-0" style={{ width: leftWidth }}>
            {mode === "security" ? <SecurityExplorer outline={outline} selectedSymbol={state.selectedSymbol} hasFinding={!!finding} fixed={fixed} onSelect={(name) => { actions.selectSymbol(name); setCenterTab("split"); }} /> : <FileExplorer selectedFileId={selectedFileId} onSelectFile={selectFile} onSelectFindingFile={(fileId) => selectFile(fileId)} />}
          </div>
          <ResizeHandle axis="x" label="Resize Explorer sidebar" onResize={(d) => setLeftWidth((w) => clamp(w + d, LEFT.min, LEFT.max))} />
        </>) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5" id="workspace-graph">
          {mode === "security" ? (<>
            <SecurityStepper step={state.step} maxReached={Math.max(maxReached, state.step)} onGo={actions.goStep} />
            <div className="flex items-center gap-1 font-ui" role="tablist" aria-label="Center view">
              {([["graph", "Graph"], ["code", "security_demo.py"], ["split", "Split"]] as [CenterTab, string][]).map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={centerTab === id} onClick={() => setCenterTab(id)} className={`rounded px-2.5 py-1 font-mono text-[10px] focus-visible:outline-2 focus-visible:outline-ide-blue ${centerTab === id ? "bg-ide-active text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>{label}</button>
              ))}
              <span className="ml-auto hidden font-mono text-[9px] text-zinc-600 lg:block" aria-live="polite">{state.phase} · step {state.step + 1}/6</span>
            </div>
            <div className="flex min-h-0 flex-1 gap-1.5">
              {centerTab !== "code" ? <div className="min-w-0" style={centerTab === "split" ? { width: `${splitPct}%` } : { flex: 1 }}><SecurityFlowCanvas graph={state.analysis?.graph ?? null} hasAnalysis={!!state.analysis} selectedSymbol={state.selectedSymbol} selectedNodeId={state.selectedNodeId} onSelectNode={(id, sym) => { actions.selectNode(id, sym); if (id) setCenterTab("split"); }} attackStatus={state.attackStatus} attackBody={state.attackBody} replaying={state.replaying} replayNonce={state.replayNonce} /></div> : null}
              {centerTab === "split" ? <ResizeHandle axis="x" label="Resize graph/code split" onResize={(d) => setSplitPct((p) => clamp(p + d / 10, 25, 75))} /> : null}
              {centerTab !== "graph" ? <div className="min-w-0 flex-1"><CodeViewer highlight={highlight} selectedSymbol={state.selectedSymbol} outline={outline} expectedHash={state.proposal?.expected_source_hash ?? state.analysis?.fix_proposal?.expected_source_hash ?? null} diff={state.proposal?.unified_diff ?? state.analysis?.fix_proposal?.unified_diff ?? null} applied={state.proposal?.application_status === "applied" || state.application?.application_status === "applied"} onSelectSymbol={(s) => actions.selectSymbol(s)} /></div> : null}
            </div>
          </>) : (<>
            <GraphCanvas layerId={layerId} selectedFileId={selectedFileId} onDrill={(id) => { setLayerId(id); setSelectedFileId(null); }} onSelectFile={setSelectedFileId} onBack={() => { setLayerId(null); setSelectedFileId(null); }} />
          </>)}
          {bottomOpen ? (<>
            <ResizeHandle axis="y" label="Resize bottom panel" onResize={(d) => setBottomHeight((h) => clamp(h - d, BOTTOM.min, BOTTOM.max))} />
            <div className="shrink-0" style={{ height: bottomHeight }}>{mode === "security" ? <SecurityBottomPanel state={state} onClose={() => setBottomOpen(false)} /> : <BottomPanel onClose={() => setBottomOpen(false)} onSelectFinding={selectFinding} />}</div>
          </>) : null}
        </div>
        {rightOpen ? (<>
          <ResizeHandle axis="x" label="Resize Findings sidebar" onResize={(d) => setRightWidth((w) => clamp(w - d, RIGHT.min, RIGHT.max))} />
          <div className="shrink-0" style={{ width: rightWidth }}>
            {mode === "security" ? <SecurityInspector state={state} actions={actions} /> : <InspectorPanel selectedFileId={selectedFileId} selectedFindingId={selectedFindingId} applied={applied} onSelectFinding={selectFinding} onApply={applyFix} onClearFile={() => setSelectedFileId(null)} />}
          </div>
        </>) : null}
      </div>
      {mode === "security" ? <StatusBar layerName={null} fileName="security_demo.py" security={{ backendOk: state.backendOk, outcome: state.analysis?.outcome ?? null, reviewStatus: state.proposal?.review_status ?? null, applicationStatus: state.proposal?.application_status ?? state.application?.application_status ?? null, verificationStatus: state.proposal?.verification_status ?? state.application?.verification_status ?? state.analysis?.verification?.status ?? null }} /> : <StatusBar layerName={layerId ? LAYER_BY_ID[layerId].name : null} fileName={selectedFileId ? FILE_BY_ID[selectedFileId].name : null} />}
    </div>
  );
}
