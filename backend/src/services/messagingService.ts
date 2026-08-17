import { Contact } from "../models/Contact";
import { Conversation } from "../models/Conversation";
import { Message } from "../models/Message";
import { MessageLog } from "../models/MessageLog";
import { Suppression } from "../models/Suppression";
import { ComplianceSettings } from "../models/ComplianceSettings";
import { AiAssistant } from "../models/AiAssistant";
import { AppError } from "../utils/errors";
import { normalizePhone } from "../utils/phone";
import { sendSms } from "./twilioService";
import { analyzeConversation, generateReply } from "./aiService";
import { runAutomations } from "./automationEngine";
import type { MessageSource } from "../types";

export async function assertCanSend(organizationId: string, phone: string) {
  const normalized = normalizePhone(phone);
  const suppressed = await Suppression.findOne({ organizationId, phone: normalized });
  if (suppressed) {
    throw new AppError("This number is on the suppression list and cannot be messaged", 400, "OPTED_OUT");
  }
  const contact = await Contact.findOne({ organizationId, phone: normalized });
  if (contact?.consentStatus === "opted_out") {
    throw new AppError("Contact has opted out of SMS", 400, "OPTED_OUT");
  }
  const compliance = await ComplianceSettings.findOne({ organizationId });
  if (compliance?.requireOptIn && contact && contact.consentStatus !== "opted_in") {
    throw new AppError(
      "Contact has not opted in. Enable sending only after documented consent.",
      400,
      "CONSENT_REQUIRED"
    );
  }
  return { contact, normalized };
}

export async function upsertConversation(organizationId: string, contactId: string) {
  return Conversation.findOneAndUpdate(
    { organizationId, contactId },
    { $setOnInsert: { organizationId, contactId, status: "open" } },
    { upsert: true, new: true }
  );
}

export async function sendOutbound(params: {
  organizationId: string;
  contactId: string;
  body: string;
  source: MessageSource;
  senderId?: string;
  campaignId?: string;
  automationId?: string;
  skipConsentCheck?: boolean;
}) {
  const contact = await Contact.findOne({
    _id: params.contactId,
    organizationId: params.organizationId,
  });
  if (!contact) throw new AppError("Contact not found", 404);

  if (!params.skipConsentCheck) {
    await assertCanSend(params.organizationId, contact.phone);
  } else if (contact.consentStatus === "opted_out") {
    throw new AppError("Contact has opted out of SMS", 400, "OPTED_OUT");
  }

  const conversation = await upsertConversation(params.organizationId, String(contact._id));
  const twilioMessage = await sendSms({
    organizationId: params.organizationId,
    to: contact.phone,
    body: params.body,
  });

  const message = await Message.create({
    organizationId: params.organizationId,
    conversationId: conversation._id,
    contactId: contact._id,
    direction: "outbound",
    body: params.body,
    status: twilioMessage.status === "failed" ? "failed" : "queued",
    twilioSid: twilioMessage.sid,
    source: params.source,
    senderId: params.senderId,
    campaignId: params.campaignId,
    automationId: params.automationId,
  });

  conversation.lastMessageAt = new Date();
  conversation.lastMessagePreview = params.body.slice(0, 140);
  if (params.source === "human") {
    conversation.handledBy = conversation.handledBy === "ai" ? "mixed" : "human";
  }
  await conversation.save();

  contact.lastMessageAt = new Date();
  contact.conversationStatus = conversation.status;
  await contact.save();

  await MessageLog.create({
    organizationId: params.organizationId,
    contactId: contact._id,
    messageId: message._id,
    event: "message.outbound",
    detail: params.source,
  });

  return { message, conversation };
}

export async function handleInboundSms(params: {
  organizationId: string;
  from: string;
  to: string;
  body: string;
  twilioSid: string;
  mediaUrls?: string[];
}) {
  const phone = normalizePhone(params.from);
  let contact = await Contact.findOne({ organizationId: params.organizationId, phone });
  if (!contact) {
    contact = await Contact.create({
      organizationId: params.organizationId,
      phone,
      firstName: "",
      lastName: "",
      source: "inbound",
      consentStatus: "unknown",
    });
    await runAutomations({
      organizationId: params.organizationId,
      triggerType: "contact_added",
      contactId: String(contact._id),
    });
  }

  const conversation = await upsertConversation(params.organizationId, String(contact._id));
  const message = await Message.create({
    organizationId: params.organizationId,
    conversationId: conversation._id,
    contactId: contact._id,
    direction: "inbound",
    body: params.body,
    status: "received",
    twilioSid: params.twilioSid,
    source: "human",
    mediaUrls: params.mediaUrls ?? [],
  });

  conversation.unreadCount += 1;
  conversation.lastMessageAt = new Date();
  conversation.lastMessagePreview = params.body.slice(0, 140);
  if (conversation.status === "closed") conversation.status = "open";
  await conversation.save();

  contact.lastMessageAt = new Date();
  contact.conversationStatus = conversation.status;
  await contact.save();

  await MessageLog.create({
    organizationId: params.organizationId,
    contactId: contact._id,
    messageId: message._id,
    event: "message.inbound",
    detail: params.body.slice(0, 200),
  });

  await runAutomations({
    organizationId: params.organizationId,
    triggerType: "sms_received",
    contactId: String(contact._id),
    conversationId: String(conversation._id),
    inboundBody: params.body,
  });

  await runAutomations({
    organizationId: params.organizationId,
    triggerType: "keyword_received",
    contactId: String(contact._id),
    conversationId: String(conversation._id),
    inboundBody: params.body,
  });

  return { contact, conversation, message };
}

export async function applyAiToInbound(organizationId: string, conversationId: string, inboundBody: string) {
  const conversation = await Conversation.findOne({ _id: conversationId, organizationId });
  if (!conversation || conversation.aiPaused || conversation.status === "needs_human") {
    return { replied: false };
  }

  const assistant = await AiAssistant.findOne({ organizationId });
  let analysis;
  try {
    analysis = await analyzeConversation({
      organizationId,
      conversationId,
      latestInbound: inboundBody,
    });
  } catch {
    return { replied: false };
  }

  conversation.intent = analysis.intent;
  conversation.sentiment = analysis.sentiment;
  conversation.leadScore = analysis.leadScore;
  conversation.aiSummary = analysis.summary;
  conversation.nextBestAction = analysis.nextBestAction;
  conversation.objection = analysis.objection;
  await conversation.save();

  await Contact.updateOne(
    { _id: conversation.contactId },
    { $set: { leadScore: analysis.leadScore } }
  );

  if (analysis.shouldHandoff) {
    conversation.status = "needs_human";
    conversation.handedOffAt = new Date();
    conversation.aiPaused = true;
    conversation.handledBy = conversation.handledBy === "human" ? "mixed" : "ai";
    await conversation.save();
    await Contact.updateOne(
      { _id: conversation.contactId },
      { $set: { conversationStatus: "needs_human" } }
    );
    await runAutomations({
      organizationId,
      triggerType: "lead_qualified",
      contactId: String(conversation.contactId),
      conversationId: String(conversation._id),
    });
    return { replied: false, handedOff: true, analysis };
  }

  if (!assistant?.autoReplyEnabled) {
    return { replied: false, analysis };
  }

  const instruction = analysis.shouldQualify && analysis.qualificationQuestion
    ? `After answering their question, you may include this single qualification question if it still fits: ${analysis.qualificationQuestion}`
    : "Answer their question. Do not ask a qualification question unless it is essential.";

  const reply = await generateReply({
    organizationId,
    conversationId,
    instruction,
  });

  if (!reply) return { replied: false, analysis };

  await sendOutbound({
    organizationId,
    contactId: String(conversation.contactId),
    body: reply,
    source: "ai",
  });

  conversation.handledBy = conversation.handledBy === "human" ? "mixed" : "ai";
  await conversation.save();
  return { replied: true, analysis, reply };
}

export async function updateMessageStatus(twilioSid: string, status: string, errorCode?: string, errorMessage?: string) {
  const message = await Message.findOne({ twilioSid });
  if (!message) return null;

  const mapped =
    status === "delivered"
      ? "delivered"
      : status === "failed"
        ? "failed"
        : status === "undelivered"
          ? "undelivered"
          : status === "sent"
            ? "sent"
            : message.status;

  message.status = mapped;
  if (errorCode) message.errorCode = errorCode;
  if (errorMessage) message.errorMessage = errorMessage;
  await message.save();

  if (mapped === "delivered") {
    await runAutomations({
      organizationId: String(message.organizationId),
      triggerType: "sms_delivered",
      contactId: String(message.contactId),
      conversationId: String(message.conversationId),
    });
  }

  await MessageLog.create({
    organizationId: message.organizationId,
    contactId: message.contactId,
    messageId: message._id,
    event: `message.${mapped}`,
    detail: errorMessage ?? status,
  });

  return message;
}
