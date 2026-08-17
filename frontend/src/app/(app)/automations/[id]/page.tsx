"use client";

import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { nodeTypes } from "@/components/automations/nodes";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import { ErrorState, Skeleton } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import type { Automation } from "@/lib/types";

const TRIGGERS = [
  "contact_added",
  "campaign_started",
  "sms_received",
  "sms_delivered",
  "no_response",
  "keyword_received",
  "lead_qualified",
  "appointment_booked",
];

const CONDITIONS = ["intent", "lead_score", "tags", "contact_field", "time_elapsed", "consent_status"];
const ACTIONS = [
  "send_sms",
  "generate_ai_reply",
  "wait",
  "add_tag",
  "update_lead_score",
  "assign_agent",
  "create_task",
  "notify_team",
  "human_handoff",
  "stop_automation",
];

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

export default function AutomationBuilderPage() {
  const params = useParams<{ id: string }>();
  const [automation, setAutomation] = useState<Automation | null>(null);
  const [error, setError] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("sms_received");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    api<{ automation: Automation }>(`/api/automations/${params.id}`)
      .then((d) => {
        setAutomation(d.automation);
        setName(d.automation.name);
        setTriggerType(d.automation.triggerType);
        setKeyword(String(d.automation.triggerConfig?.keyword ?? ""));
        setNodes(
          d.automation.nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data ?? {},
          }))
        );
        setEdges(
          d.automation.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
          }))
        );
      })
      .catch((e) => setError(e.message));
  }, [params.id, setEdges, setNodes]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)),
    [setEdges]
  );

  function addNode(type: "condition" | "action") {
    const id = `${type}-${Date.now()}`;
    const isCondition = type === "condition";
    setNodes((ns) => [
      ...ns,
      {
        id,
        type,
        position: { x: 200 + ns.length * 40, y: 80 + ns.length * 40 },
        data: isCondition
          ? { conditionType: "intent", value: "pricing", label: "Intent is pricing" }
          : { actionType: "send_sms", message: "Thanks — we will follow up.", label: "Send SMS" },
      },
    ]);
  }

  async function save(status?: "draft" | "active" | "paused") {
    try {
      const data = await api<{ automation: Automation }>(`/api/automations/${params.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          triggerType,
          triggerConfig: { keyword },
          status: status ?? automation?.status,
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type as "trigger" | "condition" | "action",
            position: n.position,
            data: n.data,
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
          })),
        }),
      });
      setAutomation(data.automation);
      toast.success(status === "active" ? "Automation is live" : "Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  if (error) return <div className="p-8"><ErrorState message={error} /></div>;
  if (!automation) return <div className="p-8"><Skeleton className="h-80" /></div>;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="w-56" />
          <span className="text-xs capitalize text-ink-faint">{automation.status}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => addNode("condition")}>
            Add IF
          </Button>
          <Button variant="secondary" onClick={() => addNode("action")}>
            Add THEN
          </Button>
          <Button variant="ghost" onClick={() => void save()}>
            Save
          </Button>
          <Button onClick={() => void save("active")}>Activate</Button>
        </div>
      </header>
      <div className="grid flex-1 md:grid-cols-[280px_1fr]">
        <aside className="space-y-4 border-r border-stone-200 bg-white p-4">
          <div>
            <Label>Trigger</Label>
            <Select
              value={triggerType}
              onChange={(e) => {
                setTriggerType(e.target.value);
                setNodes((ns) =>
                  ns.map((n) =>
                    n.type === "trigger"
                      ? { ...n, data: { ...n.data, triggerType: e.target.value, label: labelize(e.target.value) } }
                      : n
                  )
                );
              }}
            >
              {TRIGGERS.map((t) => (
                <option key={t} value={t}>
                  {labelize(t)}
                </option>
              ))}
            </Select>
          </div>
          {triggerType === "keyword_received" ? (
            <div>
              <Label>Keyword</Label>
              <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            </div>
          ) : null}
          <div>
            <Label>Selected node</Label>
            <p className="text-xs text-ink-faint">Click a node, then edit its fields below.</p>
          </div>
          <NodeEditor nodes={nodes} setNodes={setNodes} />
        </aside>
        <div className="bg-stone-50">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#d3ccc0" />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

function NodeEditor({
  nodes,
  setNodes,
}: {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
}) {
  const selected = nodes.find((n) => n.selected);
  if (!selected) return <p className="text-sm text-ink-faint">No node selected.</p>;

  function patch(data: Record<string, unknown>) {
    setNodes((ns) =>
      ns.map((n) => (n.id === selected!.id ? { ...n, data: { ...n.data, ...data } } : n))
    );
  }

  if (selected.type === "condition") {
    return (
      <div className="space-y-3">
        <Select
          value={String(selected.data.conditionType ?? "intent")}
          onChange={(e) => patch({ conditionType: e.target.value, label: `If ${labelize(e.target.value)}` })}
        >
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {labelize(c)}
            </option>
          ))}
        </Select>
        <Input
          value={String(selected.data.value ?? "")}
          onChange={(e) => patch({ value: e.target.value })}
          placeholder="Value"
        />
      </div>
    );
  }

  if (selected.type === "action") {
    return (
      <div className="space-y-3">
        <Select
          value={String(selected.data.actionType ?? "send_sms")}
          onChange={(e) => patch({ actionType: e.target.value, label: labelize(e.target.value) })}
        >
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {labelize(a)}
            </option>
          ))}
        </Select>
        <Input
          value={String(selected.data.message ?? selected.data.tag ?? selected.data.title ?? "")}
          onChange={(e) => patch({ message: e.target.value, tag: e.target.value, title: e.target.value })}
          placeholder="Message, tag, or task title"
        />
      </div>
    );
  }

  return <p className="text-sm text-ink-muted">Trigger: {labelize(String(selected.data.triggerType ?? ""))}</p>;
}
