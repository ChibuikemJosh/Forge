import { memo } from "react";
import { motion } from "motion/react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export interface ForgeNodeData extends Record<string, unknown> {
  kind: string;
  name: string;
  file: string;
}

export type ForgeFlowNode = Node<ForgeNodeData, "forge">;

/** One Forge component node on the landing graph. Selection is owned by React Flow. */
export const ForgeNode = memo(function ForgeNode({ data, selected }: NodeProps<ForgeFlowNode>) {
  return (
    <motion.div
      animate={{ scale: selected ? 1.045 : 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className={`w-[148px] rounded-md border bg-[#17171a] px-3 py-2.5 ${
        selected
          ? "border-ember shadow-[0_0_0_1px_#c2410c,0_10px_28px_rgba(0,0,0,0.45)]"
          : "border-line shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!size-2 !border-line !bg-zinc-500" />
      <span className="block font-mono text-[9px] font-semibold tracking-[0.14em] text-ember-bright">{data.kind}</span>
      <span className="mt-1 block truncate text-[13px] font-bold leading-tight text-zinc-50">{data.name}</span>
      <span className="mt-0.5 block truncate font-mono text-[10px] text-zinc-500">{data.file}</span>
      <Handle type="source" position={Position.Right} className="!size-2 !border-line !bg-zinc-500" />
    </motion.div>
  );
});
