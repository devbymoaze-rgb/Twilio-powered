"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

export function TriggerNode({ data }: NodeProps) {
  return (
    <div className="w-56 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-card">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">When</p>
      <p className="mt-1 text-sm font-medium">{String(data.label ?? "Trigger")}</p>
      <Handle type="source" position={Position.Right} id="out" className="!bg-pulse" />
    </div>
  );
}

export function ConditionNode({ data }: NodeProps) {
  return (
    <div className="w-56 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
      <Handle type="target" position={Position.Left} className="!bg-ink" />
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">If</p>
      <p className="mt-1 text-sm font-medium">{String(data.label ?? "Condition")}</p>
      <Handle type="source" position={Position.Right} id="yes" className="!top-1/3 !bg-pulse" />
      <Handle type="source" position={Position.Right} id="no" className="!top-2/3 !bg-stone-300" />
      <div className="mt-2 flex justify-between text-[10px] text-ink-faint">
        <span>yes</span>
        <span>no</span>
      </div>
    </div>
  );
}

export function ActionNode({ data }: NodeProps) {
  return (
    <div className="w-56 rounded-2xl border border-pulse/20 bg-pulse-soft px-4 py-3">
      <Handle type="target" position={Position.Left} className="!bg-pulse" />
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pulse">Then</p>
      <p className="mt-1 text-sm font-medium">{String(data.label ?? "Action")}</p>
      <Handle type="source" position={Position.Right} id="out" className="!bg-pulse" />
    </div>
  );
}

export const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};
