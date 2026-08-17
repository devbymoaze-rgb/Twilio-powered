import OpenAI from "openai";
import { env } from "../config/env";
import { AiAssistant } from "../models/AiAssistant";
import { BusinessProfile } from "../models/BusinessProfile";
import { KnowledgeArticle } from "../models/KnowledgeArticle";
import { Message } from "../models/Message";
import { Conversation } from "../models/Conversation";
import { Contact } from "../models/Contact";
import type { Sentiment } from "../types";
import { AppError } from "../utils/errors";

function client() {
  if (!env.openaiApiKey) {
    throw new AppError("OpenAI is not configured on the server", 503, "AI_NOT_CONFIGURED");
  }
  return new OpenAI({ apiKey: env.openaiApiKey });
}

async function loadContext(organizationId: string) {
  const [assistant, profile, articles] = await Promise.all([
    AiAssistant.findOne({ organizationId }),
    BusinessProfile.findOne({ organizationId }),
    KnowledgeArticle.find({ organizationId, published: true }).limit(40),
  ]);
  return { assistant, profile, articles };
}

function knowledgeBlock(articles: { category: string; title: string; content: string }[]) {
  if (!articles.length) return "No knowledge base articles yet.";
  return articles
    .map((a) => `[${a.category}] ${a.title}\n${a.content}`)
    .join("\n\n")
    .slice(0, 8000);
}

export interface ConversationAnalysis {
  intent: string;
  sentiment: Sentiment;
  leadScore: number;
  summary: string;
  nextBestAction: string;
  objection: string;
  shouldHandoff: boolean;
  handoffReason: string;
  shouldQualify: boolean;
  qualificationQuestion: string;
}

const ANALYSIS_SCHEMA = `{
  "intent": "short intent label",
  "sentiment": "positive|neutral|negative|mixed",
  "leadScore": 0-100,
  "summary": "2-3 sentence conversation summary",
  "nextBestAction": "what a human or AI should do next",
  "objection": "detected objection or empty string",
  "shouldHandoff": boolean,
  "handoffReason": "why, or empty",
  "shouldQualify": boolean,
  "qualificationQuestion": "one question if shouldQualify else empty"
}`;

export async function analyzeConversation(params: {
  organizationId: string;
  conversationId: string;
  latestInbound: string;
}): Promise<ConversationAnalysis> {
  const { assistant, profile, articles } = await loadContext(params.organizationId);
  const history = await Message.find({ conversationId: params.conversationId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  const chronological = [...history].reverse();
  const transcript = chronological
    .map((m) => `${m.direction === "inbound" ? "Contact" : "Team"}: ${m.body}`)
    .join("\n");

  const openai = client();
  const completion = await openai.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You analyze SMS conversations for a B2B SMS platform.
Return JSON only matching: ${ANALYSIS_SCHEMA}

Business: ${profile?.companyName ?? ""} — ${profile?.description || assistant?.businessDescription || ""}
Escalation rules: ${assistant?.escalationRules || "Hand off when asked for a human, angry, legal, or complex."}

Rules:
- Intent should be a short label like pricing, booking, support, interested, not_interested, opt_out.
- Lead score 0-100 based on buying signals, not message count.
- shouldHandoff true only when a human is clearly needed.
- shouldQualify true ONLY if the contact's latest message is already answered by context AND a qualification question is naturally relevant. Never recommend qualifying after every message.`,
      },
      {
        role: "user",
        content: `Knowledge:\n${knowledgeBlock(articles)}\n\nTranscript:\n${transcript}\n\nLatest inbound:\n${params.latestInbound}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<ConversationAnalysis>;
  const sentiment = (["positive", "neutral", "negative", "mixed"] as const).includes(
    parsed.sentiment as Sentiment
  )
    ? (parsed.sentiment as Sentiment)
    : "neutral";

  return {
    intent: parsed.intent ?? "general",
    sentiment,
    leadScore: Math.max(0, Math.min(100, Number(parsed.leadScore ?? 0))),
    summary: parsed.summary ?? "",
    nextBestAction: parsed.nextBestAction ?? "",
    objection: parsed.objection ?? "",
    shouldHandoff: Boolean(parsed.shouldHandoff),
    handoffReason: parsed.handoffReason ?? "",
    shouldQualify: Boolean(parsed.shouldQualify),
    qualificationQuestion: parsed.qualificationQuestion ?? "",
  };
}

export async function generateReply(params: {
  organizationId: string;
  conversationId: string;
  instruction?: string;
}): Promise<string> {
  const { assistant, profile, articles } = await loadContext(params.organizationId);
  const [conversation, contact, history] = await Promise.all([
    Conversation.findById(params.conversationId),
    Conversation.findById(params.conversationId).then((c) =>
      c ? Contact.findById(c.contactId) : null
    ),
    Message.find({ conversationId: params.conversationId }).sort({ createdAt: 1 }).limit(30).lean(),
  ]);

  const transcript = history
    .map((m) => `${m.direction === "inbound" ? "Contact" : "Team"}: ${m.body}`)
    .join("\n");

  const faqs = (assistant?.faqs ?? [])
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n");

  const openai = client();
  const completion = await openai.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content: `You write SMS replies for ${profile?.companyName || "the business"}.
Tone: ${assistant?.tone ?? "professional"}. Personality: ${assistant?.personality || "Helpful, clear, human."}
Business: ${assistant?.businessDescription || profile?.description || ""}
Products/services: ${assistant?.productsServices || ""}
Rules: ${assistant?.conversationRules || ""}

Critical behavior:
1. Answer the contact's latest question first, directly and naturally.
2. Do NOT ask a qualification question after every message.
3. Only ask one qualification question if it is clearly relevant and the question is already answered.
4. Keep SMS short — usually 1-3 sentences. No markdown.
5. If you cannot help, say you will connect them with a teammate. Do not invent facts.
6. Never claim to be human. Be a helpful assistant for the business.

FAQs:
${faqs || "None"}

Knowledge:
${knowledgeBlock(articles)}

Contact: ${contact?.firstName ?? ""} ${contact?.lastName ?? ""} | score ${conversation?.leadScore ?? 0} | intent ${conversation?.intent ?? ""}
${params.instruction ? `Extra instruction: ${params.instruction}` : ""}`,
      },
      {
        role: "user",
        content: `Write the next outbound SMS.\n\nTranscript:\n${transcript}`,
      },
    ],
  });

  return (completion.choices[0]?.message?.content ?? "").trim();
}

export async function personalizeCampaignMessage(params: {
  organizationId: string;
  template: string;
  contact: { firstName?: string; lastName?: string; tags?: string[] };
}): Promise<string> {
  const { assistant, profile } = await loadContext(params.organizationId);
  const openai = client();
  const completion = await openai.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: `Lightly personalize an SMS for ${profile?.companyName || "the business"}.
Keep the same meaning and length. Use the contact first name if natural. Do not add hype. SMS only.`,
      },
      {
        role: "user",
        content: `Template: ${params.template}
Contact: ${params.contact.firstName ?? ""} ${params.contact.lastName ?? ""}
Tags: ${(params.contact.tags ?? []).join(", ")}
Tone: ${assistant?.tone ?? "professional"}`,
      },
    ],
  });
  return (completion.choices[0]?.message?.content ?? params.template).trim();
}

export async function generateDailyBrief(organizationId: string): Promise<string> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [needsHuman, qualified, inbound, failed] = await Promise.all([
    Conversation.countDocuments({ organizationId, status: "needs_human" }),
    Conversation.countDocuments({ organizationId, status: "qualified", updatedAt: { $gte: since } }),
    Message.countDocuments({ organizationId, direction: "inbound", createdAt: { $gte: since } }),
    Message.countDocuments({ organizationId, status: { $in: ["failed", "undelivered"] }, createdAt: { $gte: since } }),
  ]);

  if (!env.openaiApiKey) {
    return `Today: ${inbound} inbound replies, ${needsHuman} conversations need a human, ${qualified} newly qualified, ${failed} delivery issues.`;
  }

  const openai = client();
  const completion = await openai.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "Write a 3-4 sentence daily brief for a sales/support team using an SMS platform. Be specific and useful. No fluff.",
      },
      {
        role: "user",
        content: `Inbound last 24h: ${inbound}. Needs human: ${needsHuman}. Newly qualified: ${qualified}. Failed deliveries: ${failed}.`,
      },
    ],
  });
  return (completion.choices[0]?.message?.content ?? "").trim();
}
