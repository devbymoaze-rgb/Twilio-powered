import { Campaign } from "../models/Campaign";
import { Contact } from "../models/Contact";
import { Message } from "../models/Message";
import { Conversation } from "../models/Conversation";
import { Suppression } from "../models/Suppression";
import { AppError, NotFoundError } from "../utils/errors";
import { sendOutbound } from "./messagingService";
import { personalizeCampaignMessage } from "./aiService";
import { runAutomations } from "./automationEngine";

function emptyStats() {
  return {
    targeted: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    replies: 0,
    optOuts: 0,
    qualifiedLeads: 0,
  };
}

async function audienceQuery(
  organizationId: string,
  campaign: {
    audience?: {
      type?: string;
      tags?: string[];
      contactIds?: unknown[];
      consentOnly?: boolean;
    } | null;
  }
) {
  const query: Record<string, unknown> = {
    organizationId,
    consentStatus: { $ne: "opted_out" },
  };
  const audience = campaign.audience ?? {};
  if (audience.consentOnly !== false) {
    query.consentStatus = "opted_in";
  }
  if (audience.type === "tags" && audience.tags?.length) {
    query.tags = { $in: audience.tags };
  }
  if (audience.type === "ids" && audience.contactIds?.length) {
    query._id = { $in: audience.contactIds };
  }
  return query;
}

export async function launchCampaign(organizationId: string, campaignId: string) {
  const campaign = await Campaign.findOne({ _id: campaignId, organizationId });
  if (!campaign) throw new NotFoundError("Campaign not found");
  if (!campaign.message.trim()) throw new AppError("Campaign message is required");

  const query = await audienceQuery(organizationId, campaign);
  const targeted = await Contact.countDocuments(query);
  campaign.status = "running";
  campaign.startedAt = new Date();
  campaign.cursor = 0;
  campaign.stats = {
    ...emptyStats(),
    ...(campaign.stats ?? {}),
    targeted,
  };
  await campaign.save();

  await runAutomations({
    organizationId,
    triggerType: "campaign_started",
    campaignId: String(campaign._id),
  });

  void processCampaignBatch(String(campaign._id));
  return campaign;
}

export async function processCampaignBatch(campaignId: string) {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign || campaign.status !== "running") return;

  const query = await audienceQuery(String(campaign.organizationId), campaign);
  const batchSize = Math.min(campaign.rateLimitPerMinute ?? 30, 40);
  const contacts = await Contact.find(query)
    .sort({ _id: 1 })
    .skip(campaign.cursor ?? 0)
    .limit(batchSize);

  if (!contacts.length) {
    campaign.status = "completed";
    campaign.completedAt = new Date();
    await campaign.save();
    return;
  }

  for (const contact of contacts) {
    const suppressed = await Suppression.findOne({
      organizationId: campaign.organizationId,
      phone: contact.phone,
    });
    if (suppressed || contact.consentStatus === "opted_out") {
      campaign.cursor = (campaign.cursor ?? 0) + 1;
      continue;
    }

    let body = campaign.message
      .replace(/\{\{firstName\}\}/g, contact.firstName || "there")
      .replace(/\{\{lastName\}\}/g, contact.lastName || "");

    if (campaign.aiPersonalization) {
      try {
        body = await personalizeCampaignMessage({
          organizationId: String(campaign.organizationId),
          template: body,
          contact: {
            firstName: contact.firstName,
            lastName: contact.lastName,
            tags: contact.tags,
          },
        });
      } catch {
        // Keep the templated message if personalization is unavailable.
      }
    }

    try {
      await sendOutbound({
        organizationId: String(campaign.organizationId),
        contactId: String(contact._id),
        body,
        source: "campaign",
        campaignId: String(campaign._id),
        skipConsentCheck: campaign.audience?.consentOnly === false,
      });
      campaign.stats = { ...emptyStats(), ...(campaign.stats ?? {}) };
      campaign.stats.sent += 1;
    } catch {
      campaign.stats = { ...emptyStats(), ...(campaign.stats ?? {}) };
      campaign.stats.failed += 1;
    }
    campaign.cursor = (campaign.cursor ?? 0) + 1;
  }

  await campaign.save();

  if (campaign.status === "running") {
    setTimeout(() => {
      void processCampaignBatch(String(campaign._id));
    }, 60_000);
  }
}

export async function refreshCampaignStats(organizationId: string, campaignId: string) {
  const campaign = await Campaign.findOne({ _id: campaignId, organizationId });
  if (!campaign) throw new NotFoundError("Campaign not found");

  const [delivered, failed, replies, optOuts, qualified] = await Promise.all([
    Message.countDocuments({ organizationId, campaignId, status: "delivered" }),
    Message.countDocuments({
      organizationId,
      campaignId,
      status: { $in: ["failed", "undelivered"] },
    }),
    Message.countDocuments({
      organizationId,
      direction: "inbound",
      contactId: { $in: await Message.distinct("contactId", { campaignId, organizationId }) },
      createdAt: { $gte: campaign.startedAt ?? campaign.createdAt },
    }),
    Contact.countDocuments({
      organizationId,
      consentStatus: "opted_out",
      optOutTimestamp: { $gte: campaign.startedAt ?? campaign.createdAt },
    }),
    Conversation.countDocuments({
      organizationId,
      status: "qualified",
      qualifiedAt: { $gte: campaign.startedAt ?? campaign.createdAt },
    }),
  ]);

  campaign.stats = {
    ...emptyStats(),
    ...(campaign.stats ?? {}),
    delivered,
    failed,
    replies,
    optOuts,
    qualifiedLeads: qualified,
  };
  await campaign.save();
  return campaign;
}

export async function resumeScheduledCampaigns() {
  const due = await Campaign.find({
    status: "scheduled",
    scheduledAt: { $lte: new Date() },
  });
  for (const campaign of due) {
    await launchCampaign(String(campaign.organizationId), String(campaign._id));
  }
}
