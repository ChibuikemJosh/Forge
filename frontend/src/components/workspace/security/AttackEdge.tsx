import { memo, useId } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps, type Edge } from "@xyflow/react";
export interface AttackEdgeData { [key: string]: unknown; relationship: string; observed: boolean; hasFinding: boolean; isAuthorizes: boolean; attackActive: boolean; attackOrder: number; attackBlockedAtThis: boolean; attackStatus: number | null }
export type AttackFlowEdge = Edge<AttackEdgeData, "attack">;
export const AttackEdge = memo(function AttackEdge(props: EdgeProps<AttackFlowEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, label } = props;
  const [path, lx, ly] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const clipId = useId();
  const stroke = data?.isAuthorizes ? "#4ade80" : data?.hasFinding ? "#f87171" : "#8a6d4b";
  const showParticle = data?.attackActive;
  const dur = 0.45;
  const begin = data ? data.attackOrder * dur : 0;
  return (
    <>
      <BaseEdge id={id} path={path} style={{ stroke, strokeWidth: data?.hasFinding || data?.isAuthorizes ? 2 : 1.4, strokeDasharray: data?.observed === false ? "5 5" : undefined }} />
      {showParticle ? (
        <g>
          <circle r="6" fill={data.attackStatus === 403 && data.attackBlockedAtThis ? "#4ade80" : "#ff7a29"} opacity="0.95">
            <animateMotion dur={`${dur}s`} begin={`${begin}s`} fill="freeze" path={path} />
            <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.9;1" dur={`${dur}s`} begin={`${begin}s`} fill="freeze" />
          </circle>
          <circle r="11" fill="none" stroke={data.attackStatus === 403 && data.attackBlockedAtThis ? "#4ade80" : "#f87171"} strokeWidth="1.5" opacity="0.6">
            <animateMotion dur={`${dur}s`} begin={`${begin}s`} fill="freeze" path={path} />
          </circle>
          <defs><clipPath id={clipId}><rect x="0" y="0" width="1" height="1" /></clipPath></defs>
        </g>
      ) : null}
      <EdgeLabelRenderer>
        <div style={{ position: "absolute", transform: `translate(-50%,-50%) translate(${lx}px,${ly}px)`, pointerEvents: "none" }} className="rounded bg-panel px-1 font-mono text-[8.5px] text-zinc-400">{label as string}</div>
      </EdgeLabelRenderer>
    </>
  );
});
