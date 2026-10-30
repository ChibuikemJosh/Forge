import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { motion, useReducedMotion } from "motion/react";
export interface SecNodeData { [key: string]: unknown; label: string; type: string; symbolLine: string | null; hasFinding: boolean; dimmed: boolean; flash: boolean; blocked: boolean; appearIndex: number; visible: boolean }
export type SecFlowNode = Node<SecNodeData, "security">;
function color(type: string, hasFinding: boolean) {
  if (hasFinding) return "border-sev-critical text-sev-critical";
  if (type === "authorization") return "border-test-pass text-test-pass";
  if (type === "authentication" || type === "authenticated_customer") return "border-ember text-ember-bright";
  return "border-line text-zinc-300";
}
export const SecurityNode = memo(function SecurityNode({ data, selected }: NodeProps<SecFlowNode>) {
  const reduce = useReducedMotion();
  if (!data.visible) return <div style={{ width: 196, height: 64, opacity: 0 }}><Handle type="target" position={Position.Top} style={{ opacity: 0 }} /><Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} /></div>;
  return (
    <motion.div initial={reduce ? false : { opacity: 0, scale: 0.92 }} animate={{ opacity: data.dimmed ? 0.28 : 1, scale: 1 }} transition={{ delay: reduce ? 0 : data.appearIndex * 0.08, duration: 0.25 }}
      className={`relative w-[196px] rounded-md border bg-panel px-3 py-2 font-ui shadow ${color(data.type, data.hasFinding)} ${selected ? "ring-2 ring-ember" : ""} ${data.flash ? "!border-sev-critical bg-sev-critical/20" : ""} ${data.blocked ? "!border-test-pass bg-test-pass/15" : ""}`}>
      {data.hasFinding && !reduce ? <span className="absolute inset-0 animate-ping rounded-md border border-sev-critical opacity-30" aria-hidden /> : null}
      <Handle type="target" position={Position.Top} style={{ background: "#8a6d4b" }} />
      <div className="truncate text-[12px] font-semibold text-zinc-100">{data.label}</div>
      <div className="font-mono text-[9px] uppercase tracking-wider opacity-80">{data.type}</div>
      {data.symbolLine ? <div className="truncate font-mono text-[9px] text-zinc-500">{data.symbolLine}</div> : null}
      <Handle type="source" position={Position.Bottom} style={{ background: "#8a6d4b" }} />
    </motion.div>
  );
});
