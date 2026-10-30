import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActivityBar, type ActivityId } from "../components/workspace/ActivityBar";
import { BottomPanel } from "../components/workspace/BottomPanel";
import { FileExplorer } from "../components/workspace/FileExplorer";
import { GraphCanvas } from "../components/workspace/GraphCanvas";
import { InspectorPanel } from "../components/workspace/InspectorPanel";
import { StatusBar } from "../components/workspace/StatusBar";
import { ResizeHandle } from "../components/workspace/ResizeHandle";
import { TitleBar } from "../components/workspace/TitleBar";
import { FILE_BY_ID, LAYER_BY_ID } from "../components/workspace/data";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
/** Panel size limits (px), VS Code-like. */
const LEFT = { def: 240, min: 180, max: 420 };
const RIGHT = { def: 320, min: 240, max: 560 };
const BOTTOM = { def: 224, min: 120, max: 520 };

export default function Workspace() {
  const navigate = useNavigate();
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

  const selectFile = useCallback((fileId: string) => {
    const file = FILE_BY_ID[fileId];
    if (!file) return;
    setSelectedFileId(fileId);
    setLayerId(file.layerId);
    setRightOpen(true);
  }, []);

  const selectFinding = useCallback((findingId: string, fileId: string) => {
    setSelectedFindingId(findingId);
    selectFile(fileId);
    setRightOpen(true);
  }, [selectFile]);

  const handleActivity = useCallback((id: ActivityId) => {
    setActivity(id);
    if (id === "explorer" || id === "search") setLeftOpen(true);
    else setLeftOpen(false);
  }, []);

  const applyFix = useCallback((findingId: string) => {
    setApplied((prev) => new Set(prev).add(findingId));
  }, []);

  return (
    <div className="flex h-screen flex-col gap-1.5 bg-ide-bg p-1.5 font-ui text-zinc-100">
      <a href="#workspace-graph" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-ember focus:px-3 focus:py-2 focus:text-white">Skip to graph</a>
      <TitleBar
        leftOpen={leftOpen} rightOpen={rightOpen} bottomOpen={bottomOpen}
        onToggleLeft={() => setLeftOpen((v) => !v)}
        onToggleRight={() => setRightOpen((v) => !v)}
        onToggleBottom={() => setBottomOpen((v) => !v)}
        onHome={() => navigate("/")}
      />
      <div className="flex min-h-0 flex-1 gap-1.5">
        <ActivityBar active={activity} onSelect={handleActivity} />
        {leftOpen ? (
          <>
            <div className="shrink-0" style={{ width: leftWidth }}>
              <FileExplorer selectedFileId={selectedFileId} onSelectFile={selectFile} onSelectFindingFile={(fileId) => selectFile(fileId)} />
            </div>
            <ResizeHandle axis="x" label="Resize Explorer sidebar" onResize={(d) => setLeftWidth((w) => clamp(w + d, LEFT.min, LEFT.max))} />
          </>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5" id="workspace-graph">
          <GraphCanvas
            layerId={layerId} selectedFileId={selectedFileId}
            onDrill={(id) => { setLayerId(id); setSelectedFileId(null); }}
            onSelectFile={setSelectedFileId}
            onBack={() => { setLayerId(null); setSelectedFileId(null); }}
          />
          {bottomOpen ? (
            <>
              <ResizeHandle axis="y" label="Resize bottom panel" onResize={(d) => setBottomHeight((h) => clamp(h - d, BOTTOM.min, BOTTOM.max))} />
              <div className="shrink-0" style={{ height: bottomHeight }}>
                <BottomPanel onClose={() => setBottomOpen(false)} onSelectFinding={selectFinding} />
              </div>
            </>
          ) : null}
        </div>
        {rightOpen ? (
          <>
            <ResizeHandle axis="x" label="Resize Findings sidebar" onResize={(d) => setRightWidth((w) => clamp(w - d, RIGHT.min, RIGHT.max))} />
            <div className="shrink-0" style={{ width: rightWidth }}>
              <InspectorPanel
                selectedFileId={selectedFileId} selectedFindingId={selectedFindingId} applied={applied}
                onSelectFinding={selectFinding} onApply={applyFix} onClearFile={() => setSelectedFileId(null)}
              />
            </div>
          </>
        ) : null}
      </div>
      <StatusBar layerName={layerId ? LAYER_BY_ID[layerId].name : null} fileName={selectedFileId ? FILE_BY_ID[selectedFileId].name : null} />
    </div>
  );
}
