import { useEffect, useMemo, useState } from "react";
import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider, type EdgeTypes, type NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { SecurityGraph } from "../../../features/security/types";
import { layoutGraph } from "../../../features/security/layout";
import { SecurityNode, type SecFlowNode } from "./SecurityNode";
import { AttackEdge, type AttackFlowEdge } from "./AttackEdge";

const nodeTypes: NodeTypes = { security: SecurityNode };
const edgeTypes: EdgeTypes = { attack: AttackEdge };
const PATH_ORDER = ["request", "customer", "authenticate", "retrieve", "order", "ownership", "response", "finding-order-ownership-001"];

interface Props { graph: SecurityGraph | null; selectedSymbol: string | null; selectedNodeId: string | null; onSelectNode: (id: string | null, symbol?: string | null) => void; attackStatus: number | null; attackBody: unknown; replaying: boolean; replayNonce: number; hasAnalysis: boolean }

function Inner({ graph, selectedSymbol, selectedNodeId, onSelectNode, attackStatus, attackBody, replaying, replayNonce, hasAnalysis }: Props) {
  const reduce = useReducedMotion();
  const [visibleCount, setVisibleCount] = useState(99);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!graph) { setVisibleCount(0); return; }
    if (reduce) { setVisibleCount(graph.nodes.length); return; }
    setVisibleCount(0);
    const timers = graph.nodes.map((_, i) => setTimeout(() => setVisibleCount(i + 1), 80 * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [graph, reduce]);
  useEffect(() => {
    if (!replaying) return;
    if (attackStatus === 200) { const t = setTimeout(() => setFlash(true), 1800); const t2 = setTimeout(() => setFlash(false), 3200); return () => { clearTimeout(t); clearTimeout(t2); }; }
  }, [replaying, replayNonce, attackStatus]);

  const { nodes, edges } = useMemo(() => {
    if (!graph) return { nodes: [] as SecFlowNode[], edges: [] as AttackFlowEdge[] };
    const pos = layoutGraph(graph);
    const orderIndex = new Map(graph.nodes.map((n) => [n.id, PATH_ORDER.indexOf(n.id) === -1 ? 99 : PATH_ORDER.indexOf(n.id)]));
    const nodes: SecFlowNode[] = graph.nodes.map((n, i) => ({
      id: n.id, type: "security", position: pos.get(n.id) ?? { x: 0, y: i * 90 },
      selected: selectedNodeId === n.id,
      data: {
        label: n.label, type: n.type, symbolLine: n.source ? `${n.source.symbol}:${n.source.line_start ?? "?"}` : null,
        hasFinding: n.finding_ids.length > 0, dimmed: !!selectedSymbol && !!n.source && n.source.symbol !== selectedSymbol,
        flash: flash && n.id === "response", blocked: replaying && attackStatus === 403 && n.id === "ownership",
        appearIndex: i, visible: i < visibleCount,
      },
    }));
    const edges: AttackFlowEdge[] = graph.edges.map((e) => {
      const oi = Math.min(orderIndex.get(e.source) ?? 0, orderIndex.get(e.target) ?? 0);
      const blockedEdge = e.target === "ownership" || e.source === "ownership";
      return {
        id: e.id, source: e.source, target: e.target, type: "attack", label: e.relationship,
        data: { relationship: e.relationship, observed: e.observed, hasFinding: e.finding_ids.length > 0, isAuthorizes: e.relationship === "authorizes", attackActive: replaying, attackOrder: Math.max(0, oi), attackBlockedAtThis: blockedEdge, attackStatus },
      };
    });
    return { nodes, edges };
  }, [graph, selectedSymbol, selectedNodeId, flash, replaying, attackStatus, visibleCount]);

  if (!hasAnalysis || !graph) {
    return <div className="grid h-full place-items-center rounded-lg border border-line bg-panel p-6 text-center font-ui"><div><p className="text-[13px] text-zinc-300">No analysis yet</p><p className="mt-1 font-mono text-[10px] text-zinc-500">Run Analyze to build the security graph from the real backend.</p></div></div>;
  }
  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-line bg-panel" aria-label="Security graph">
      <ReactFlow key={replayNonce ? `r${replayNonce}` : "base"} nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView nodesConnectable={false} minZoom={0.25} maxZoom={2.2}
        onNodeClick={(_, n) => { const orig = graph.nodes.find((x) => x.id === n.id); onSelectNode(n.id, orig?.source?.symbol ?? null); }}
        onPaneClick={() => onSelectNode(null, null)}>
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#2a2a2e" />
        <Controls position="bottom-left" />
        <MiniMap position="bottom-right" pannable zoomable style={{ background: "#111113" }} />
      </ReactFlow>
      <AnimatePresence>
        {replaying && attackStatus === 200 ? (
          <motion.div key="leak" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-3 top-3 max-w-[260px] rounded-md border border-sev-critical bg-panel-2 p-3 font-mono text-[10px] text-zinc-200 shadow">
            <div className="font-bold text-sev-critical">200 — LEAK (real response)</div>
            <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(attackBody, null, 2)}</pre>
          </motion.div>
        ) : null}
        {replaying && attackStatus === 403 ? (
          <motion.div key="block" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute right-3 top-3 max-w-[260px] rounded-md border border-test-pass bg-panel-2 p-3 font-mono text-[10px] text-zinc-200 shadow">
            <div className="font-bold text-test-pass">🛡 403 — BLOCKED at Verify ownership</div>
            <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(attackBody, null, 2)}</pre>
            <div className="mt-1 text-zinc-400">403 Order does not belong to customer.</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div aria-live="polite" className="sr-only">{replaying ? `Replay finished with status ${attackStatus}` : ""}</div>
    </div>
  );
}
export function SecurityFlowCanvas(props: Props) { return <ReactFlowProvider><Inner {...props} /></ReactFlowProvider>; }
