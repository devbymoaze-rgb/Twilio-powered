import { Router } from "express";
import { z } from "zod";
import { Campaign } from "../models/Campaign";
import { Contact } from "../models/Contact";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError, NotFoundError } from "../utils/errors";
import { launchCampaign, refreshCampaignStats } from "../services/campaignService";
import { sendOutbound } from "../services/messagingService";
import { normalizePhone } from "../utils/phone";

const router = Router();
router.use(requireAuth);

const campaignBody = z.object({
  name: z.string().min(2),
  message: z.string().min(1),
  aiPersonalization: z.boolean().optional(),
  senderPhone: z.string().optional(),
  audience: z
    .object({
      type: z.enum(["all", "tags", "ids"]).optional(),
      tags: z.array(z.string()).optional(),
      contactIds: z.array(z.string()).optional(),
      consentOnly: z.boolean().optional(),
    })
    .optional(),
  scheduledAt: z.string().optional().nullable(),
  rateLimitPerMinute: z.number().min(1).max(200).optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const campaigns = await Campaign.find({ organizationId: req.user!.organizationId })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ campaigns });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = campaignBody.parse(req.body);
    const campaign = await Campaign.create({
      ...body,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      organizationId: req.user!.organizationId,
      createdBy: req.user!.userId,
      status: body.scheduledAt ? "scheduled" : "draft",
    });
    res.status(201).json({ campaign });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      organizationId: req.user!.organizationId,
    });
    if (!campaign) throw new NotFoundError("Campaign not found");
    const refreshed = await refreshCampaignStats(req.user!.organizationId, String(campaign._id));
    res.json({ campaign: refreshed });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = campaignBody.partial().parse(req.body);
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user!.organizationId },
      {
        $set: {
          ...body,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        },
      },
      { new: true }
    );
    if (!campaign) throw new NotFoundError("Campaign not found");
    res.json({ campaign });
  })
);

router.post(
  "/:id/launch",
  asyncHandler(async (req, res) => {
    const campaign = await launchCampaign(req.user!.organizationId, req.params.id);
    res.json({ campaign });
  })
);

router.post(
  "/:id/pause",
  asyncHandler(async (req, res) => {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user!.organizationId, status: "running" },
      { $set: { status: "paused" } },
      { new: true }
    );
    if (!campaign) throw new AppError("Campaign is not running", 400);
    res.json({ campaign });
  })
);

router.post(
  "/:id/resume",
  asyncHandler(async (req, res) => {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user!.organizationId, status: "paused" },
      { $set: { status: "running" } },
      { new: true }
    );
    if (!campaign) throw new AppError("Campaign is not paused", 400);
    const { processCampaignBatch } = await import("../services/campaignService");
    void processCampaignBatch(String(campaign._id));
    res.json({ campaign });
  })
);

router.post(
  "/:id/test",
  asyncHandler(async (req, res) => {
    const body = z.object({ phone: z.string().min(7) }).parse(req.body);
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      organizationId: req.user!.organizationId,
    });
    if (!campaign) throw new NotFoundError("Campaign not found");
    const phone = normalizePhone(body.phone);
    let contact = await Contact.findOne({ organizationId: req.user!.organizationId, phone });
    if (!contact) {
      contact = await Contact.create({
        organizationId: req.user!.organizationId,
        phone,
        firstName: "Test",
        consentStatus: "opted_in",
        optInSource: "test_send",
        optInTimestamp: new Date(),
        source: "test",
      });
    }
    const result = await sendOutbound({
      organizationId: req.user!.organizationId,
      contactId: String(contact._id),
      body: campaign.message,
      source: "campaign",
      campaignId: String(campaign._id),
    });
    res.json(result);
  })
);

export default router;
