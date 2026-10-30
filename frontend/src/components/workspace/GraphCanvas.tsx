import { useCallback, useEffect, useMemo } from "react";
import {
  Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider,
  useEdgesState, useNodesState, useReactFlow,
  type Edge, type Node, type NodeMouseHandler, type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FILES, FILE_BY_ID, LAYER_BY_ID, LAYER_EDGES, LAYERS, PROJECT, filesInLayer } from "./data";
import { GraphNode, type GraphFlowNode } from "./GraphNode";

const nodeTypes: NodeTypes = { graph: GraphNode };
const edgeLabel = { fill: "#d6a05a", fontSize: 10, fontFamily: "JetBrains Mono, monospace" } as const;

interface Props {
  layerId: string | null; // null = project overview
  selectedFileId: string | null;
  onDrill: (layerId: string) => void;
  onSelectFile: (fileId: string) => void;
  onBack: () => void;
}

/* Every layer keeps a fixed home in one shared scene. Drilling in never
   swaps the graph: the focused layer expands in place over its home, the
   rest of the project stays mounted (dimmed) behind it. */
const home = (i: number) => ({ x: 40 + (i % 3) * 580, y: 40 + Math.floor(i / 3) * 470 });
const FOCUS_CONTAINER = "focus-container";

function buildGraph(layerId: string | null, selectedFileId: string | null): { nodes: Node[]; edges: Edge[] } {
  const focused = layerId ? LAYER_BY_ID[layerId] : null;

  const layerNodes: GraphFlowNode[] = LAYERS.map((layer, i) => ({
    id: layer.id, type: "graph", position: home(i), zIndex: focused && layer.id !== focused.id ? 1 : 3,
    selected: focused?.id === layer.id,
    data: {
      variant: "layer", eyebrow: "LAYER", name: layer.name, desc: layer.desc,
      complexity: layer.complexity,
      meta: focused?.id === layer.id ? `${layer.fileCount} files · expanded below ↓` : `${layer.fileCount} files · click to explore →`,
      dimmed: !!focused && layer.id !== focused.id,
    },
  }));

  const layerEdges: Edge[] = LAYER_EDGES.map((e) => {
    const active = !!focused && (e.source === focused.id || e.target === focused.id);
    return {
      id: `${e.source}-${e.target}`, source: e.source, target: e.target, label: String(e.count),
      type: "default" as const, animated: active, zIndex: active ? 2 : 0,
      style: focused
        ? active
          ? { stroke: "#c99a5b", strokeWidth: 1.8 }
          : { stroke: "#8a6d4b", strokeWidth: 1, opacity: 0.14 }
        : { stroke: "#8a6d4b", strokeWidth: 1.4 },
      labelStyle: focused && !active ? { ...edgeLabel, opacity: 0.15 } : edgeLabel,
      labelBgStyle: { fill: "#131315", fillOpacity: focused && !active ? 0.3 : 0.9 },
    };
  });

  if (!focused) return { nodes: layerNodes, edges: layerEdges };

  // --- Focused layer: transparent group expanding from its layer card. ---
  const files = filesInLayer(focused.id);
  const cols = Math.min(3, Math.max(1, files.length));
  const rows = Math.ceil(files.length / cols);
  const origin = home(LAYERS.findIndex((l) => l.id === focused.id));
  const container: Node = {
    id: FOCUS_CONTAINER, type: "group", position: { x: origin.x - 20, y: origin.y + 118 },
    draggable: false, selectable: false, focusable: false, zIndex: 1,
    style: {
      width: 48 + cols * 218 + (cols - 1) * 50,
      height: 56 + rows * 128 + (rows - 1) * 50 + 24,
      backgroundColor: "rgba(19,19,21,0.82)",
      border: "1px solid #4a3b28",
      borderRadius: 12,
      boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
    },
    data: {},
  };
  const title: Node = {
    id: "focus-container-title", type: "default", parentId: FOCUS_CONTAINER, extent: "parent",
    position: { x: 16, y: 12 }, draggable: false, selectable: false, focusable: false, zIndex: 2,
    data: { label: `${focused.name} · ${files.length} files` },
    style: { background: "transparent", border: "none", boxShadow: "none", color: "#a1a1aa", fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", width: "auto", padding: 0, pointerEvents: "none" },
  };
  const selected = selectedFileId ? FILE_BY_ID[selectedFileId] : null;
  const related = (fileId: string) =>
    !selected || fileId === selected.id || selected.imports.includes(fileId) || FILE_BY_ID[fileId]?.imports.includes(selected.id);
  const fileNodes: Node[] = files.map((file, i) => ({
    id: file.id, type: "graph", parentId: FOCUS_CONTAINER, extent: "parent",
    position: { x: 24 + (i % cols) * 268, y: 56 + Math.floor(i / cols) * 178 },
    selected: file.id === selectedFileId, zIndex: 3,
    data: { variant: "file", eyebrow: "FILE", name: file.name, desc: file.desc, complexity: file.complexity, meta: file.path, dimmed: !related(file.id) },
  }));

  const ids = new Set(files.map((x) => x.id));
  const fileEdges: Edge[] = files.flatMap((file) =>
    file.imports.filter((t) => ids.has(t)).map((t) => {
      const active = !selectedFileId || selectedFileId === file.id || selectedFileId === t;
      return {
        id: `${file.id}-${t}`, source: file.id, target: t, label: "imports", type: "default" as const,
        animated: selectedFileId === file.id, zIndex: 2,
        style: { stroke: "#c99a5b", strokeWidth: 1.6, strokeDasharray: "6 5", opacity: active ? 1 : 0.15 },
        labelStyle: active ? edgeLabel : { ...edgeLabel, opacity: 0.15 },
        labelBgStyle: { fill: "#131315", fillOpacity: 0.9 },
      };
    }),
  );

  /* Cross-layer connections are kept, not dropped: a file importing into
     another layer gets a faint ghost edge to that (dimmed) layer card, and
     vice-versa for outside files importing a focused file. */
  const ghost = new Map<string, Edge>();
  const addGhost = (source: string, target: string) => {
    const id = `ghost-${source}-${target}`;
    if (!ghost.has(id)) ghost.set(id, {
      id, source, target, label: "imports", type: "default",
      style: { stroke: "#8a6d4b", strokeWidth: 1.2, strokeDasharray: "3 6", opacity: 0.45 },
      labelStyle: { ...edgeLabel, opacity: 0.6 }, labelBgStyle: { fill: "#131315", fillOpacity: 0.7 },
    });
  };
  for (const file of files) for (const t of file.imports) {
    const target = FILE_BY_ID[t];
    if (target && target.layerId !== focused.id) addGhost(file.id, target.layerId);
  }
  for (const file of FILES) {
    if (file.layerId === focused.id) continue;
    for (const t of file.imports) if (ids.has(t)) addGhost(file.layerId, t);
  }

  return { nodes: [...layerNodes, container, title, ...fileNodes], edges: [...layerEdges, ...fileEdges, ...ghost.values()] };
}

function Flow({ layerId, selectedFileId, onDrill, onSelectFile }: Omit<Props, "onBack">) {
  const graph = useMemo(() => buildGraph(layerId, selectedFileId), [layerId, selectedFileId]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  const { fitView } = useReactFlow();
  useEffect(() => { setNodes(graph.nodes); setEdges(graph.edges); }, [graph, setNodes, setEdges]);

  // Camera move instead of a scene swap: zoom into the focused layer's
  // card + expanded files; zoom back out to the whole project on exit.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (layerId) {
        const ids = [layerId, FOCUS_CONTAINER, ...filesInLayer(layerId).map((f) => f.id)];
        fitView({ nodes: ids.map((id) => ({ id })), padding: 0.18, duration: 750, maxZoom: 1.15 });
      } else {
        fitView({ padding: 0.22, duration: 750, maxZoom: 1 });
      }
    }, 60);
    return () => window.clearTimeout(t);
  }, [layerId, fitView]);

  const handleClick: NodeMouseHandler = useCallback((_e, node) => {
    if (node.type !== "graph") return; // ignore container group + its title label
    const file = FILE_BY_ID[node.id];
    if (file) onSelectFile(node.id);
    else onDrill(node.id); // layer card: focus it (or switch focus to it)
  }, [onDrill, onSelectFile]);

  return (
    <ReactFlow
      nodes={nodes} edges={edges} nodeTypes={nodeTypes}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={handleClick}
      colorMode="dark" fitView fitViewOptions={{ padding: 0.22 }} minZoom={0.12} maxZoom={2.2}
      nodesConnectable={false} proOptions={{ hideAttribution: false }}
      aria-label={layerId ? `${LAYER_BY_ID[layerId].name} files over the dimmed project graph. Click a file to inspect it, or another layer to switch focus.` : `${PROJECT.name} layers. Click a layer to explore its files.`}
    >
      <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#26262a" />
      <Controls position="bottom-left" showInteractive />
      <MiniMap position="bottom-right" pannable zoomable nodeColor="#2a2a2e" maskColor="rgba(10,10,11,0.72)" className="!rounded-md !border !border-line !bg-panel" />
    </ReactFlow>
  );
}

/** Centre canvas: one project graph; clicking a layer zooms into it in place. */
export function GraphCanvas({ layerId, selectedFileId, onDrill, onSelectFile, onBack }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && layerId) onBack(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [layerId, onBack]);

  const layer = layerId ? LAYER_BY_ID[layerId] : null;
  const crossImports = layerId ? filesInLayer(layerId).reduce((n, x) => n + x.imports.filter((t) => FILE_BY_ID[t]?.layerId !== layerId).length, 0) : 0;

  return (
    <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-line bg-ide-bg font-ui" aria-label="Project graph">
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2">
        {layer ? (
          <button type="button" onClick={onBack} aria-label="Back to Project Overview (previous layer)"
            className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-ember/60 bg-ember-deep/90 py-1.5 pl-2.5 pr-3 font-display text-[12px] font-semibold text-orange-100 shadow-lg hover:bg-ember focus-visible:outline-2 focus-visible:outline-ide-blue">
            <span aria-hidden>←</span> Back
          </button>
        ) : null}
        <nav className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-line bg-panel/95 py-1.5 pl-3 pr-2 text-[12px] shadow-lg" aria-label="Breadcrumb">
          <button type="button" onClick={onBack} className="font-medium text-zinc-300 hover:text-white focus-visible:outline-2 focus-visible:outline-ide-blue rounded">Project</button>
          {layer ? (<><span className="text-zinc-600" aria-hidden>›</span><span className="font-display font-bold tracking-wide text-zinc-50">{layer.name.toUpperCase()}</span><span className="text-[11px] text-zinc-500">(Esc to go back)</span></>) : <span className="font-display font-bold tracking-widest text-zinc-400">PROJECT OVERVIEW</span>}
        </nav>
      </div>
      <span className="absolute right-3 top-3 z-10 hidden font-mono text-[10.5px] text-zinc-600 sm:block">Press ? for keyboard shortcuts</span>
      {layer ? <p className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-panel/95 px-3 py-1 font-mono text-[10px] text-zinc-500">{filesInLayer(layer.id).length} files shown · {crossImports} imports to other layers kept as faded links · other layers dimmed behind</p> : null}
      {/* Vignette while focused: darkens the scene edges, focused group stays lit via node dimming. */}
      {layer ? <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] shadow-[inset_0_0_140px_rgba(0,0,0,0.6)]" /> : null}
      <div className="min-h-0 flex-1">
        <ReactFlowProvider>
          <Flow layerId={layerId} selectedFileId={selectedFileId} onDrill={onDrill} onSelectFile={onSelectFile} />
        </ReactFlowProvider>
      </div>
    </section>
  );
}
