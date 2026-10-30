import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { Complexity } from "./data";

export interface GraphNodeData extends Record<string, unknown> {
  variant: "layer" | "file";
  eyebrow: string;
  name: string;
  desc: string;
  complexity: Complexity;
  meta: string;
  dimmed?: boolean;
}

export type GraphFlowNode = Node<GraphNodeData, "graph">;

const complexityClass: Record<Complexity, string> = {
  simple: "text-test-pass",
  moderate: "text-sev-warning",
  complex: "text-sev-critical",
};

// Layer card (overview) and file card (drilled view) — refs Images 2–5.
export const GraphNode = memo(function GraphNode({ data, selected }: NodeProps<GraphFlowNode>) {
  const isLayer = data.variant === "layer";
  return (
    <div
      className={`${isLayer ? "w-52.5" : "w-54.5"} rounded-lg border bg-panel-2 px-3.5 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.45)] transition-[opacity,filter] duration-500 ${
        selected ? "border-ember-bright shadow-[0_0_0_1px_var(--color-ember),0_12px_32px_rgba(0,0,0,0.5)]" : "border-line hover:border-zinc-600"
      } ${data.dimmed ? "opacity-25 saturate-50" : "opacity-100"}`}
    >
      <Handle type="target" position={Position.Top} className="!size-2 !border-line !bg-zinc-500" />
      <div className="flex items-baseline justify-between gap-2">
        <span className={`font-mono text-[9px] font-semibold tracking-[0.16em] ${isLayer ? "text-ember-bright" : "text-ide-blue"}`}>{data.eyebrow}</span>
        <span className={`font-mono text-[9px] ${complexityClass[data.complexity]}`}>{data.complexity}</span>
      </div>
      <span className="mt-1.5 block truncate font-display text-[13.5px] font-semibold leading-tight text-zinc-50" title={data.name}>{data.name}</span>
      <span className="mt-1 line-clamp-2 block text-[11px] leading-snug text-zinc-500">{data.desc}</span>
      <span className="mt-2 block font-mono text-[9.5px] text-zinc-600">{data.meta}</span>
      <Handle type="source" position={Position.Bottom} className="!size-2 !border-line !bg-zinc-500" />
    </div>
  );
});
