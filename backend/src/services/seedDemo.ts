import bcrypt from "bcryptjs";
import { Organization } from "../models/Organization";
import { User } from "../models/User";
import { BusinessProfile } from "../models/BusinessProfile";
import { AiAssistant } from "../models/AiAssistant";
import { ComplianceSettings } from "../models/ComplianceSettings";
import { Contact } from "../models/Contact";
import { Conversation } from "../models/Conversation";
import { Message } from "../models/Message";
import { Campaign } from "../models/Campaign";
import { Automation } from "../models/Automation";
import { AutomationRun } from "../models/AutomationRun";
import { KnowledgeArticle } from "../models/KnowledgeArticle";

export const DEMO_EMAIL = "demo@textpulse.com";
export const DEMO_PASSWORD = "Demo123456!";

export async function seedDemoWorkspace() {
  let user = await User.findOne({ email: DEMO_EMAIL });
  let organization;

  if (user) {
    organization = await Organization.findById(user.organizationId);
    if (organization) {
      organization.onboardingCompleted = true;
      organization.onboardingStep = "complete";
      await organization.save();
    }
  } else {
    organization = await Organization.create({
      name: "Northline Demo",
      industry: "Professional services",
      website: "https://northline.example",
      timezone: "America/New_York",
      smsUseCases: ["lead_generation", "customer_support", "follow_ups"],
      onboardingStep: "complete",
      onboardingCompleted: true,
      plan: "growth",
    });
    user = await User.create({
      organizationId: organization._id,
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      name: "Alex Rivera",
      role: "owner",
    });
  }

  if (!organization || !user) return;

  const orgId = organization._id;
  await BusinessProfile.findOneAndUpdate(
    { organizationId: orgId },
    {
      companyName: "Northline Demo",
      industry: "Professional services",
      website: "https://northline.example",
      description: "Northline helps mid-market teams turn inbound SMS into qualified conversations.",
      hours: "Mon–Fri 9:00–18:00 ET",
      supportEmail: "hello@northline.example",
    },
    { upsert: true }
  );

  await AiAssistant.findOneAndUpdate(
    { organizationId: orgId },
    {
      businessDescription: "B2B SMS automation for sales and support teams.",
      productsServices: "TextPulse Growth workspace, automations, human handoff.",
      tone: "professional",
      personality: "Clear, calm, and useful. Answers first.",
      autoReplyEnabled: true,
    },
    { upsert: true }
  );

  await ComplianceSettings.findOneAndUpdate(
    { organizationId: orgId },
    { requireOptIn: true, businessName: "Northline Demo" },
    { upsert: true }
  );

  const existingContacts = await Contact.countDocuments({ organizationId: orgId });
  if (existingContacts > 0) {
    console.log(`Demo workspace ready · ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
    return;
  }

  const contacts = await Contact.insertMany([
    {
      organizationId: orgId,
      firstName: "Maya",
      lastName: "Chen",
      phone: "+14155550198",
      email: "maya@harborandco.example",
      tags: ["warm", "pricing"],
      leadScore: 82,
      consentStatus: "opted_in",
      optInSource: "website",
      optInTimestamp: new Date(Date.now() - 86400000 * 12),
      conversationStatus: "qualified",
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 18),
    },
    {
      organizationId: orgId,
      firstName: "Jonah",
      lastName: "Reid",
      phone: "+12125550114",
      email: "jonah@northlineops.example",
      tags: ["support"],
      leadScore: 41,
      consentStatus: "opted_in",
      optInSource: "inbound",
      optInTimestamp: new Date(Date.now() - 86400000 * 4),
      conversationStatus: "needs_human",
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 42),
    },
    {
      organizationId: orgId,
      firstName: "Priya",
      lastName: "Shah",
      phone: "+13125550177",
      email: "priya@fieldwork.example",
      tags: ["demo"],
      leadScore: 67,
      consentStatus: "opted_in",
      optInSource: "event",
      optInTimestamp: new Date(Date.now() - 86400000 * 9),
      conversationStatus: "open",
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 90),
    },
    {
      organizationId: orgId,
      firstName: "Chris",
      lastName: "Alvarez",
      phone: "+16175550102",
      email: "chris@alvarez.example",
      tags: ["new"],
      leadScore: 28,
      consentStatus: "unknown",
      conversationStatus: "open",
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 200),
    },
  ]);

  const [maya, jonah, priya] = contacts;

  const convos = await Conversation.insertMany([
    {
      organizationId: orgId,
      contactId: maya._id,
      status: "qualified",
      unreadCount: 0,
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 18),
      lastMessagePreview: "Can we start next week?",
      handledBy: "mixed",
      intent: "pricing",
      sentiment: "positive",
      leadScore: 82,
      aiSummary: "Maya is comparing Growth vs Scale and asked about a next-week start.",
      nextBestAction: "Confirm a 20-minute walkthrough.",
      qualifiedAt: new Date(Date.now() - 1000 * 60 * 40),
      assignedAgentId: user._id,
    },
    {
      organizationId: orgId,
      contactId: jonah._id,
      status: "needs_human",
      unreadCount: 1,
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 42),
      lastMessagePreview: "Can a person take this from here?",
      handledBy: "ai",
      intent: "support",
      sentiment: "negative",
      leadScore: 41,
      aiSummary: "Jonah hit a billing mismatch and asked for a human.",
      nextBestAction: "Assign an agent and confirm the invoice.",
      handedOffAt: new Date(Date.now() - 1000 * 60 * 40),
      aiPaused: true,
    },
    {
      organizationId: orgId,
      contactId: priya._id,
      status: "open",
      unreadCount: 0,
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 90),
      lastMessagePreview: "Do reminders work for two locations?",
      handledBy: "ai",
      intent: "product",
      sentiment: "neutral",
      leadScore: 67,
      aiSummary: "Priya is evaluating appointment reminders for two clinics.",
      nextBestAction: "Share a two-location setup note.",
    },
  ]);

  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);

  await Message.insertMany([
    {
      organizationId: orgId,
      conversationId: convos[0]._id,
      contactId: maya._id,
      direction: "outbound",
      body: "Hi Maya — thanks for opting in. What are you hoping SMS will handle first?",
      status: "delivered",
      source: "campaign",
      createdAt: hoursAgo(30),
    },
    {
      organizationId: orgId,
      conversationId: convos[0]._id,
      contactId: maya._id,
      direction: "inbound",
      body: "What’s included in Growth?",
      status: "received",
      source: "human",
      createdAt: hoursAgo(6),
    },
    {
      organizationId: orgId,
      conversationId: convos[0]._id,
      contactId: maya._id,
      direction: "outbound",
      body: "Growth includes 15,000 messages, automations, and human handoff. I can have someone walk you through it.",
      status: "delivered",
      source: "ai",
      createdAt: hoursAgo(5.8),
    },
    {
      organizationId: orgId,
      conversationId: convos[0]._id,
      contactId: maya._id,
      direction: "inbound",
      body: "Can we start next week?",
      status: "received",
      source: "human",
      createdAt: hoursAgo(0.3),
    },
    {
      organizationId: orgId,
      conversationId: convos[1]._id,
      contactId: jonah._id,
      direction: "inbound",
      body: "This invoice does not match what we were quoted.",
      status: "received",
      source: "human",
      createdAt: hoursAgo(2),
    },
    {
      organizationId: orgId,
      conversationId: convos[1]._id,
      contactId: jonah._id,
      direction: "outbound",
      body: "I can see the mismatch. Connecting you with a teammate who can adjust the invoice.",
      status: "delivered",
      source: "ai",
      createdAt: hoursAgo(1.8),
    },
    {
      organizationId: orgId,
      conversationId: convos[1]._id,
      contactId: jonah._id,
      direction: "inbound",
      body: "Can a person take this from here?",
      status: "received",
      source: "human",
      createdAt: hoursAgo(0.7),
    },
    {
      organizationId: orgId,
      conversationId: convos[2]._id,
      contactId: priya._id,
      direction: "inbound",
      body: "Do reminders work for two locations?",
      status: "received",
      source: "human",
      createdAt: hoursAgo(1.5),
    },
    {
      organizationId: orgId,
      conversationId: convos[2]._id,
      contactId: priya._id,
      direction: "outbound",
      body: "Yes — each location can keep its own sender and consent list in one workspace.",
      status: "delivered",
      source: "ai",
      createdAt: hoursAgo(1.4),
    },
  ]);

  const campaign = await Campaign.create({
    organizationId: orgId,
    name: "April warm-lead follow-up",
    message: "Hi {{firstName}}, this is Northline. Reply YES if you still want a 15-minute walkthrough. Reply STOP to opt out.",
    aiPersonalization: true,
    status: "completed",
    rateLimitPerMinute: 30,
    startedAt: hoursAgo(40),
    completedAt: hoursAgo(36),
    createdBy: user._id,
    stats: {
      targeted: 4,
      sent: 18,
      delivered: 17,
      failed: 1,
      replies: 6,
      optOuts: 0,
      qualifiedLeads: 1,
    },
  });

  await Campaign.create({
    organizationId: orgId,
    name: "Support check-in",
    message: "Quick check-in from Northline — anything we can unblock this week?",
    status: "paused",
    rateLimitPerMinute: 20,
    createdBy: user._id,
    stats: {
      targeted: 2,
      sent: 2,
      delivered: 2,
      failed: 0,
      replies: 1,
      optOuts: 0,
      qualifiedLeads: 0,
    },
  });

  const automation = await Automation.create({
    organizationId: orgId,
    name: "Inbound → AI reply",
    status: "active",
    triggerType: "sms_received",
    runCount: 9,
    lastRunAt: hoursAgo(1),
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 40, y: 140 },
        data: { triggerType: "sms_received", label: "SMS received" },
      },
      {
        id: "action-1",
        type: "action",
        position: { x: 360, y: 140 },
        data: { actionType: "generate_ai_reply", label: "Generate AI reply" },
      },
    ],
    edges: [{ id: "e1", source: "trigger-1", target: "action-1", sourceHandle: "out" }],
  });

  await AutomationRun.create({
    organizationId: orgId,
    automationId: automation._id,
    contactId: priya._id,
    conversationId: convos[2]._id,
    status: "completed",
  });

  await KnowledgeArticle.insertMany([
    {
      organizationId: orgId,
      category: "pricing",
      title: "Growth plan",
      content: "15,000 messages / month, automations, and human handoff.",
    },
    {
      organizationId: orgId,
      category: "services",
      title: "Two-location reminders",
      content: "Each location can use its own sender ID and consent list.",
    },
  ]);

  void campaign;
  console.log(`Demo workspace seeded · ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}
