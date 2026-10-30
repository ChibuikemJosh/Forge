import dagre from "@dagrejs/dagre";
import type { SecurityGraph } from "./types";
export function layoutGraph(graph: SecurityGraph): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 36, ranksep: 52, marginx: 16, marginy: 16 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of graph.nodes) g.setNode(n.id, { width: 196, height: 64 });
  for (const e of graph.edges) g.setEdge(e.source, e.target);
  dagre.layout(g);
  const map = new Map<string, { x: number; y: number }>();
  for (const n of graph.nodes) {
    const p = g.node(n.id);
    if (p) map.set(n.id, { x: p.x - 98, y: p.y - 32 });
  }
  return map;
}
