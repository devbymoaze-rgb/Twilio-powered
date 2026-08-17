import { Router } from "express";
import { z } from "zod";
import { Conversation } from "../models/Conversation";
import { Message } from "../models/Message";
import { Contact } from "../models/Contact";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { NotFoundError } from "../utils/errors";
import { generateReply, analyzeConversation } from "../services/aiService";
import { sendOutbound } from "../services/messagingService";
import { runAutomations } from "../services/automationEngine";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    const filterKey = String(req.query.filter ?? "all");
    const query: Record<string, unknown> = { organizationId: req.user!.organizationId };

    switch (filterKey) {
      case "unread":
        query.unreadCount = { $gt: 0 };
        break;
      case "qualified":
        query.status = "qualified";
        break;
      case "needs_human":
        query.status = "needs_human";
        break;
      case "ai_handled":
        query.handledBy = { $in: ["ai", "mixed"] };
        break;
      case "open":
        query.status = "open";
        break;
      default:
        break;
    }

    if (q) {
      const contacts = await Contact.find({
        organizationId: req.user!.organizationId,
        $or: [
          { firstName: new RegExp(q, "i") },
          { lastName: new RegExp(q, "i") },
          { phone: new RegExp(q, "i") },
        ],
      }).select("_id");
      query.contactId = { $in: contacts.map((c) => c._id) };
    }

    const conversations = await Conversation.find(query)
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .populate("contactId", "firstName lastName phone leadScore consentStatus tags")
      .populate("assignedAgentId", "name email")
      .lean();
    res.json({ conversations });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      organizationId: req.user!.organizationId,
    })
      .populate("contactId")
      .populate("assignedAgentId", "name email");
    if (!conversation) throw new NotFoundError("Conversation not found");
    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .limit(300)
      .populate("senderId", "name");
    conversation.unreadCount = 0;
    await conversation.save();
    res.json({ conversation, messages });
  })
);

router.post(
  "/:id/reply",
  asyncHandler(async (req, res) => {
    const body = z.object({ body: z.string().min(1) }).parse(req.body);
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      organizationId: req.user!.organizationId,
    });
    if (!conversation) throw new NotFoundError("Conversation not found");
    const result = await sendOutbound({
      organizationId: req.user!.organizationId,
      contactId: String(conversation.contactId),
      body: body.body,
      source: "human",
      senderId: req.user!.userId,
    });
    res.json(result);
  })
);

router.post(
  "/:id/ai-reply",
  asyncHandler(async (req, res) => {
    const body = z.object({ instruction: z.string().optional() }).parse(req.body);
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      organizationId: req.user!.organizationId,
    });
    if (!conversation) throw new NotFoundError("Conversation not found");
    const draft = await generateReply({
      organizationId: req.user!.organizationId,
      conversationId: String(conversation._id),
      instruction: body.instruction,
    });
    res.json({ draft });
  })
);

router.post(
  "/:id/analyze",
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      organizationId: req.user!.organizationId,
    });
    if (!conversation) throw new NotFoundError("Conversation not found");
    const lastInbound = await Message.findOne({
      conversationId: conversation._id,
      direction: "inbound",
    }).sort({ createdAt: -1 });
    const analysis = await analyzeConversation({
      organizationId: req.user!.organizationId,
      conversationId: String(conversation._id),
      latestInbound: lastInbound?.body ?? "",
    });
    conversation.intent = analysis.intent;
    conversation.sentiment = analysis.sentiment;
    conversation.leadScore = analysis.leadScore;
    conversation.aiSummary = analysis.summary;
    conversation.nextBestAction = analysis.nextBestAction;
    conversation.objection = analysis.objection;
    await conversation.save();
    res.json({ analysis, conversation });
  })
);

router.post(
  "/:id/assign",
  asyncHandler(async (req, res) => {
    const body = z.object({ agentId: z.string().nullable() }).parse(req.body);
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user!.organizationId },
      { $set: { assignedAgentId: body.agentId } },
      { new: true }
    );
    if (!conversation) throw new NotFoundError("Conversation not found");
    res.json({ conversation });
  })
);

router.post(
  "/:id/qualify",
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user!.organizationId },
      { $set: { status: "qualified", qualifiedAt: new Date() } },
      { new: true }
    );
    if (!conversation) throw new NotFoundError("Conversation not found");
    await Contact.updateOne(
      { _id: conversation.contactId },
      { $set: { conversationStatus: "qualified", leadScore: Math.max(conversation.leadScore, 70) } }
    );
    await runAutomations({
      organizationId: req.user!.organizationId,
      triggerType: "lead_qualified",
      contactId: String(conversation.contactId),
      conversationId: String(conversation._id),
    });
    res.json({ conversation });
  })
);

router.post(
  "/:id/handoff",
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user!.organizationId },
      {
        $set: {
          status: "needs_human",
          aiPaused: true,
          handedOffAt: new Date(),
        },
      },
      { new: true }
    );
    if (!conversation) throw new NotFoundError("Conversation not found");
    await Contact.updateOne(
      { _id: conversation.contactId },
      { $set: { conversationStatus: "needs_human" } }
    );
    res.json({ conversation });
  })
);

router.post(
  "/:id/close",
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user!.organizationId },
      { $set: { status: "closed", closedAt: new Date() } },
      { new: true }
    );
    if (!conversation) throw new NotFoundError("Conversation not found");
    await Contact.updateOne(
      { _id: conversation.contactId },
      { $set: { conversationStatus: "closed" } }
    );
    res.json({ conversation });
  })
);

router.post(
  "/:id/reopen",
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user!.organizationId },
      { $set: { status: "open", aiPaused: false } },
      { new: true }
    );
    if (!conversation) throw new NotFoundError("Conversation not found");
    res.json({ conversation });
  })
);

export default router;
