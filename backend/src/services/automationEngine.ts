import { Automation } from "../models/Automation";
import { AutomationRun } from "../models/AutomationRun";
import { Contact } from "../models/Contact";
import { Conversation } from "../models/Conversation";
import { Task } from "../models/Task";
import { generateReply } from "./aiService";
import type { AutomationTriggerType } from "../types";

export interface AutomationEvent {
  organizationId: string;
  triggerType: AutomationTriggerType;
  contactId?: string;
  conversationId?: string;
  campaignId?: string;
  inboundBody?: string;
}

interface FlowNode {
  id: string;
  type: "trigger" | "condition" | "action";
  data?: Record<string, unknown>;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function evaluateCondition(
  node: FlowNode,
  event: AutomationEvent
): Promise<boolean> {
  const data = node.data ?? {};
  const kind = asString(data.conditionType);
  const contact = event.contactId
    ? await Contact.findById(event.contactId)
    : null;
  const conversation = event.conversationId
    ? await Conversation.findById(event.conversationId)
    : null;

  switch (kind) {
    case "intent": {
      const expected = asString(data.value).toLowerCase();
      return (conversation?.intent ?? "").toLowerCase().includes(expected);
    }
    case "lead_score": {
      const op = asString(data.operator, "gte");
      const threshold = asNumber(data.value);
      const score = contact?.leadScore ?? conversation?.leadScore ?? 0;
      if (op === "lte") return score <= threshold;
      if (op === "eq") return score === threshold;
      return score >= threshold;
    }
    case "tags": {
      const tag = asString(data.value).toLowerCase();
      return (contact?.tags ?? []).some((t) => t.toLowerCase() === tag);
    }
    case "contact_field": {
      const field = asString(data.field);
      const expected = asString(data.value).toLowerCase();
      const raw = (contact as unknown as Record<string, unknown> | null)?.[field];
      return String(raw ?? "").toLowerCase() === expected;
    }
    case "time_elapsed": {
      const minutes = asNumber(data.value);
      const last = conversation?.lastMessageAt ?? contact?.lastMessageAt;
      if (!last) return false;
      return Date.now() - new Date(last).getTime() >= minutes * 60_000;
    }
    case "consent_status": {
      return contact?.consentStatus === asString(data.value);
    }
    default:
      return true;
  }
}

async function executeAction(
  node: FlowNode,
  event: AutomationEvent,
  automationId: string
): Promise<"continue" | "stop" | "wait"> {
  const data = node.data ?? {};
  const actionType = asString(data.actionType);

  switch (actionType) {
    case "send_sms": {
      if (!event.contactId) return "continue";
      const { sendOutbound } = await import("./messagingService");
      await sendOutbound({
        organizationId: event.organizationId,
        contactId: event.contactId,
        body: asString(data.message, "Thanks for your message — we will follow up shortly."),
        source: "automation",
        automationId,
      });
      return "continue";
    }
    case "generate_ai_reply": {
      if (!event.contactId || !event.conversationId) return "continue";
      const { sendOutbound } = await import("./messagingService");
      const reply = await generateReply({
        organizationId: event.organizationId,
        conversationId: event.conversationId,
        instruction: asString(data.instruction),
      });
      if (reply) {
        await sendOutbound({
          organizationId: event.organizationId,
          contactId: event.contactId,
          body: reply,
          source: "ai",
          automationId,
        });
      }
      return "continue";
    }
    case "wait":
      return "wait";
    case "add_tag": {
      if (!event.contactId) return "continue";
      const tag = asString(data.tag);
      if (tag) {
        await Contact.updateOne(
          { _id: event.contactId },
          { $addToSet: { tags: tag } }
        );
      }
      return "continue";
    }
    case "update_lead_score": {
      if (!event.contactId) return "continue";
      const score = Math.max(0, Math.min(100, asNumber(data.score)));
      await Contact.updateOne({ _id: event.contactId }, { $set: { leadScore: score } });
      if (event.conversationId) {
        await Conversation.updateOne(
          { _id: event.conversationId },
          { $set: { leadScore: score } }
        );
      }
      return "continue";
    }
    case "assign_agent": {
      if (!event.conversationId) return "continue";
      const agentId = asString(data.agentId);
      if (agentId) {
        await Conversation.updateOne(
          { _id: event.conversationId },
          { $set: { assignedAgentId: agentId } }
        );
        if (event.contactId) {
          await Contact.updateOne(
            { _id: event.contactId },
            { $set: { assignedAgentId: agentId } }
          );
        }
      }
      return "continue";
    }
    case "create_task": {
      await Task.create({
        organizationId: event.organizationId,
        conversationId: event.conversationId,
        contactId: event.contactId,
        title: asString(data.title, "Follow up"),
      });
      return "continue";
    }
    case "notify_team":
      return "continue";
    case "human_handoff": {
      if (event.conversationId) {
        await Conversation.updateOne(
          { _id: event.conversationId },
          {
            $set: {
              status: "needs_human",
              aiPaused: true,
              handedOffAt: new Date(),
            },
          }
        );
        if (event.contactId) {
          await Contact.updateOne(
            { _id: event.contactId },
            { $set: { conversationStatus: "needs_human" } }
          );
        }
      }
      return "continue";
    }
    case "stop_automation":
      return "stop";
    default:
      return "continue";
  }
}

function triggerMatches(automation: { triggerType: string; triggerConfig?: Record<string, unknown> }, event: AutomationEvent) {
  if (automation.triggerType !== event.triggerType) return false;
  if (event.triggerType === "keyword_received") {
    const keyword = asString(automation.triggerConfig?.keyword).toLowerCase();
    if (!keyword) return false;
    return (event.inboundBody ?? "").toLowerCase().includes(keyword);
  }
  if (event.triggerType === "campaign_started") {
    const campaignId = asString(automation.triggerConfig?.campaignId);
    if (campaignId && event.campaignId && campaignId !== event.campaignId) return false;
  }
  return true;
}

async function walkGraph(
  nodes: FlowNode[],
  edges: FlowEdge[],
  startId: string,
  event: AutomationEvent,
  runId: string,
  automationId: string
) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  let current = nodeMap.get(startId);
  while (current) {
    const node = current;
    await AutomationRun.updateOne(
      { _id: runId },
      {
        $set: { currentNodeId: node.id },
        $push: { log: { at: new Date(), nodeId: node.id, message: node.type } },
      }
    );

    if (node.type === "condition") {
      const passed = await evaluateCondition(node, event);
      const handle = passed ? "yes" : "no";
      const preferred = edges.find((e) => e.source === node.id && e.sourceHandle === handle);
      const nextEdge =
        preferred ??
        edges.find((e) => e.source === node.id && (e.sourceHandle === handle || !e.sourceHandle));
      current = nextEdge ? nodeMap.get(nextEdge.target) : undefined;
      continue;
    }

    if (node.type === "action") {
      const result = await executeAction(node, event, automationId);
      if (result === "stop") {
        await AutomationRun.updateOne({ _id: runId }, { $set: { status: "stopped" } });
        return;
      }
      if (result === "wait") {
        const minutes = asNumber(node.data?.minutes, 15);
        await AutomationRun.updateOne(
          { _id: runId },
          {
            $set: {
              status: "running",
              waitUntil: new Date(Date.now() + minutes * 60_000),
              currentNodeId: node.id,
            },
          }
        );
        return;
      }
    }

    const next = edges.find((e) => e.source === node.id && (!e.sourceHandle || e.sourceHandle === "out"));
    current = next ? nodeMap.get(next.target) : undefined;
  }

  await AutomationRun.updateOne({ _id: runId }, { $set: { status: "completed" } });
}

export async function runAutomations(event: AutomationEvent) {
  const automations = await Automation.find({
    organizationId: event.organizationId,
    status: "active",
    triggerType: event.triggerType,
  });

  for (const automation of automations) {
    if (!triggerMatches(automation, event)) continue;
    const nodes = (automation.nodes ?? []) as FlowNode[];
    const edges = (automation.edges ?? []) as FlowEdge[];
    const triggerNode = nodes.find((n) => n.type === "trigger") ?? nodes[0];
    if (!triggerNode) continue;

    const run = await AutomationRun.create({
      organizationId: event.organizationId,
      automationId: automation._id,
      contactId: event.contactId,
      conversationId: event.conversationId,
      status: "running",
      currentNodeId: triggerNode.id,
    });

    try {
      await walkGraph(nodes, edges, triggerNode.id, event, String(run._id), String(automation._id));
      await Automation.updateOne(
        { _id: automation._id },
        { $inc: { runCount: 1 }, $set: { lastRunAt: new Date() } }
      );
    } catch (error) {
      await AutomationRun.updateOne(
        { _id: run._id },
        {
          $set: {
            status: "failed",
            error: error instanceof Error ? error.message : "Automation failed",
          },
        }
      );
    }
  }
}

export async function resumeWaitingRuns() {
  const due = await AutomationRun.find({
    status: "running",
    waitUntil: { $lte: new Date() },
  }).limit(25);

  for (const run of due) {
    const automation = await Automation.findById(run.automationId);
    if (!automation) {
      run.status = "failed";
      run.error = "Automation missing";
      await run.save();
      continue;
    }
    const nodes = (automation.nodes ?? []) as FlowNode[];
    const edges = (automation.edges ?? []) as FlowEdge[];
    const current = nodes.find((n) => n.id === run.currentNodeId);
    const next = current
      ? edges.find((e) => e.source === current.id)
      : undefined;
    run.waitUntil = undefined;
    await run.save();
    if (!next) {
      run.status = "completed";
      await run.save();
      continue;
    }
    await walkGraph(
      nodes,
      edges,
      next.target,
      {
        organizationId: String(run.organizationId),
        triggerType: automation.triggerType as AutomationTriggerType,
        contactId: run.contactId ? String(run.contactId) : undefined,
        conversationId: run.conversationId ? String(run.conversationId) : undefined,
      },
      String(run._id),
      String(automation._id)
    );
  }
}
