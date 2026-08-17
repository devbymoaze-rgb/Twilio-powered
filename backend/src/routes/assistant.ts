import { Router } from "express";
import { z } from "zod";
import { AiAssistant } from "../models/AiAssistant";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { generateReply } from "../services/aiService";
import { Conversation } from "../models/Conversation";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const assistant = await AiAssistant.findOne({ organizationId: req.user!.organizationId });
    res.json({ assistant });
  })
);

router.put(
  "/",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        businessDescription: z.string().optional(),
        productsServices: z.string().optional(),
        tone: z.enum(["professional", "friendly", "concise", "warm", "formal"]).optional(),
        personality: z.string().optional(),
        qualificationQuestions: z.array(z.string()).optional(),
        conversationRules: z.string().optional(),
        escalationRules: z.string().optional(),
        faqs: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
        autoReplyEnabled: z.boolean().optional(),
      })
      .parse(req.body);
    const assistant = await AiAssistant.findOneAndUpdate(
      { organizationId: req.user!.organizationId },
      { $set: body },
      { new: true, upsert: true }
    );
    res.json({ assistant });
  })
);

router.post(
  "/test",
  asyncHandler(async (req, res) => {
    const body = z.object({ conversationId: z.string().optional(), instruction: z.string().optional() }).parse(req.body);
    if (body.conversationId) {
      const conversation = await Conversation.findOne({
        _id: body.conversationId,
        organizationId: req.user!.organizationId,
      });
      if (conversation) {
        const draft = await generateReply({
          organizationId: req.user!.organizationId,
          conversationId: String(conversation._id),
          instruction: body.instruction,
        });
        return res.json({ draft });
      }
    }
    res.json({
      draft:
        "Connect a live conversation to preview a real AI reply. The assistant answers the contact first and only qualifies when it is relevant.",
    });
  })
);

export default router;
