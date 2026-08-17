import mongoose from "mongoose";
import { Message } from "../models/Message";
import { Conversation } from "../models/Conversation";
import { Campaign } from "../models/Campaign";
import { Contact } from "../models/Contact";

function startOfDaysAgo(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

export async function dashboardMetrics(organizationId: string) {
  const since = startOfDaysAgo(30);
  const [
    sent,
    delivered,
    replies,
    activeConversations,
    qualifiedLeads,
    aiHandled,
    humanHandoffs,
    failed,
  ] = await Promise.all([
    Message.countDocuments({ organizationId, direction: "outbound", createdAt: { $gte: since } }),
    Message.countDocuments({ organizationId, status: "delivered", createdAt: { $gte: since } }),
    Message.countDocuments({ organizationId, direction: "inbound", createdAt: { $gte: since } }),
    Conversation.countDocuments({ organizationId, status: { $in: ["open", "needs_human", "qualified"] } }),
    Conversation.countDocuments({ organizationId, status: "qualified" }),
    Conversation.countDocuments({ organizationId, handledBy: { $in: ["ai", "mixed"] } }),
    Conversation.countDocuments({ organizationId, status: "needs_human" }),
    Message.countDocuments({
      organizationId,
      status: { $in: ["failed", "undelivered"] },
      createdAt: { $gte: since },
    }),
  ]);

  const responseRate = sent > 0 ? Math.round((replies / sent) * 1000) / 10 : 0;

  const [attention, campaigns, recentReplies, automationActivity, deliveryActivity] =
    await Promise.all([
      Conversation.find({
        organizationId,
        status: { $in: ["needs_human", "qualified"] },
      })
        .sort({ lastMessageAt: -1 })
        .limit(8)
        .populate("contactId", "firstName lastName phone leadScore")
        .lean(),
      Campaign.find({ organizationId, status: { $in: ["running", "scheduled", "paused"] } })
        .sort({ updatedAt: -1 })
        .limit(6)
        .lean(),
      Message.find({ organizationId, direction: "inbound" })
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("contactId", "firstName lastName phone")
        .lean(),
      import("../models/AutomationRun").then(({ AutomationRun }) =>
        AutomationRun.find({ organizationId }).sort({ createdAt: -1 }).limit(8).populate("automationId", "name").lean()
      ),
      Message.find({
        organizationId,
        direction: "outbound",
        status: { $in: ["delivered", "failed", "undelivered", "sent"] },
      })
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("contactId", "firstName lastName phone")
        .lean(),
    ]);

  return {
    metrics: {
      sent,
      delivered,
      replies,
      responseRate,
      activeConversations,
      qualifiedLeads,
      aiHandled,
      humanHandoffs,
      failed,
    },
    attention,
    campaigns,
    recentReplies,
    automationActivity,
    deliveryActivity,
  };
}

export async function analyticsOverview(organizationId: string, days = 30) {
  const since = startOfDaysAgo(days);
  const [outbound, delivered, inbound, failed, optedOut, qualified, aiConvos, humanConvos] =
    await Promise.all([
      Message.countDocuments({ organizationId, direction: "outbound", createdAt: { $gte: since } }),
      Message.countDocuments({ organizationId, status: "delivered", createdAt: { $gte: since } }),
      Message.countDocuments({ organizationId, direction: "inbound", createdAt: { $gte: since } }),
      Message.countDocuments({
        organizationId,
        status: { $in: ["failed", "undelivered"] },
        createdAt: { $gte: since },
      }),
      Contact.countDocuments({ organizationId, consentStatus: "opted_out", optOutTimestamp: { $gte: since } }),
      Conversation.countDocuments({ organizationId, status: "qualified", qualifiedAt: { $gte: since } }),
      Conversation.countDocuments({ organizationId, handledBy: "ai" }),
      Conversation.countDocuments({ organizationId, handledBy: { $in: ["human", "mixed"] } }),
    ]);

  const orgId = new mongoose.Types.ObjectId(organizationId);
  const firstInbound = await Message.aggregate([
    { $match: { organizationId: orgId, direction: "inbound", createdAt: { $gte: since } } },
    { $sort: { createdAt: 1 } },
    {
      $lookup: {
        from: "messages",
        let: { cid: "$conversationId", at: "$createdAt" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$conversationId", "$$cid"] },
                  { $eq: ["$direction", "outbound"] },
                  { $gt: ["$createdAt", "$$at"] },
                ],
              },
            },
          },
          { $sort: { createdAt: 1 } },
          { $limit: 1 },
        ],
        as: "reply",
      },
    },
    { $unwind: "$reply" },
    {
      $project: {
        delta: { $subtract: ["$reply.createdAt", "$createdAt"] },
      },
    },
    { $group: { _id: null, avg: { $avg: "$delta" } } },
  ]);

  const series = await Message.aggregate([
    {
      $match: {
        organizationId: orgId,
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        sent: { $sum: { $cond: [{ $eq: ["$direction", "outbound"] }, 1, 0] } },
        replies: { $sum: { $cond: [{ $eq: ["$direction", "inbound"] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const campaigns = await Campaign.find({ organizationId }).sort({ createdAt: -1 }).limit(12).lean();

  return {
    totals: {
      messages: outbound,
      deliveryRate: outbound > 0 ? Math.round((delivered / outbound) * 1000) / 10 : 0,
      responseRate: outbound > 0 ? Math.round((inbound / outbound) * 1000) / 10 : 0,
      conversionRate: inbound > 0 ? Math.round((qualified / inbound) * 1000) / 10 : 0,
      optOutRate: outbound > 0 ? Math.round((optedOut / outbound) * 1000) / 10 : 0,
      qualifiedLeads: qualified,
      failed,
      aiConversations: aiConvos,
      humanConversations: humanConvos,
      avgResponseMs: firstInbound[0]?.avg ?? 0,
    },
    series,
    campaigns,
  };
}
