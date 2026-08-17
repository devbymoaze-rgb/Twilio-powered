import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Organization } from "../models/Organization";
import { BusinessProfile } from "../models/BusinessProfile";
import { ComplianceSettings } from "../models/ComplianceSettings";
import { User } from "../models/User";
import { OrgWebhook } from "../models/OrgWebhook";
import { Suppression } from "../models/Suppression";
import { MessageLog } from "../models/MessageLog";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ConflictError } from "../utils/errors";

const router = Router();
router.use(requireAuth);

router.get(
  "/business",
  asyncHandler(async (req, res) => {
    const [organization, profile] = await Promise.all([
      Organization.findById(req.user!.organizationId),
      BusinessProfile.findOne({ organizationId: req.user!.organizationId }),
    ]);
    res.json({ organization, profile });
  })
);

router.put(
  "/business",
  requireRole("owner", "admin"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        organization: z
          .object({
            name: z.string().optional(),
            industry: z.string().optional(),
            website: z.string().optional(),
            timezone: z.string().optional(),
          })
          .optional(),
        profile: z.record(z.unknown()).optional(),
      })
      .parse(req.body);
    const organization = body.organization
      ? await Organization.findByIdAndUpdate(req.user!.organizationId, { $set: body.organization }, { new: true })
      : await Organization.findById(req.user!.organizationId);
    const profile = body.profile
      ? await BusinessProfile.findOneAndUpdate(
          { organizationId: req.user!.organizationId },
          { $set: body.profile },
          { new: true, upsert: true }
        )
      : await BusinessProfile.findOne({ organizationId: req.user!.organizationId });
    res.json({ organization, profile });
  })
);

router.get(
  "/compliance",
  asyncHandler(async (req, res) => {
    const [settings, suppressions, logs] = await Promise.all([
      ComplianceSettings.findOne({ organizationId: req.user!.organizationId }),
      Suppression.find({ organizationId: req.user!.organizationId }).sort({ createdAt: -1 }).limit(100),
      MessageLog.find({
        organizationId: req.user!.organizationId,
        event: { $regex: /^compliance/ },
      })
        .sort({ createdAt: -1 })
        .limit(50),
    ]);
    res.json({ settings, suppressions, logs });
  })
);

router.put(
  "/compliance",
  requireRole("owner", "admin"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        requireOptIn: z.boolean().optional(),
        helpMessage: z.string().optional(),
        optOutMessage: z.string().optional(),
        optInMessage: z.string().optional(),
        includeOptOutLanguage: z.boolean().optional(),
        businessName: z.string().optional(),
      })
      .parse(req.body);
    const settings = await ComplianceSettings.findOneAndUpdate(
      { organizationId: req.user!.organizationId },
      { $set: body },
      { new: true, upsert: true }
    );
    res.json({ settings });
  })
);

router.get(
  "/team",
  asyncHandler(async (req, res) => {
    const members = await User.find({ organizationId: req.user!.organizationId })
      .select("name email role invitePending createdAt lastLoginAt")
      .lean();
    res.json({ members });
  })
);

router.post(
  "/team",
  requireRole("owner", "admin"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(2),
        email: z.string().email(),
        role: z.enum(["admin", "agent"]),
      })
      .parse(req.body);
    const existing = await User.findOne({ email: body.email.toLowerCase() });
    if (existing) throw new ConflictError("That email is already in use");
    const passwordHash = await bcrypt.hash(crypto.randomBytes(12).toString("hex"), 10);
    const member = await User.create({
      organizationId: req.user!.organizationId,
      name: body.name,
      email: body.email.toLowerCase(),
      role: body.role,
      passwordHash,
      invitePending: true,
    });
    res.status(201).json({
      member: {
        id: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
        invitePending: true,
      },
    });
  })
);

router.get(
  "/notifications",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user!.userId).select("notificationPrefs");
    res.json({ prefs: user?.notificationPrefs });
  })
);

router.put(
  "/notifications",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        emailReplies: z.boolean().optional(),
        emailHandoffs: z.boolean().optional(),
        emailCampaigns: z.boolean().optional(),
        inApp: z.boolean().optional(),
      })
      .parse(req.body);
    const user = await User.findByIdAndUpdate(
      req.user!.userId,
      { $set: { notificationPrefs: body } },
      { new: true }
    ).select("notificationPrefs");
    res.json({ prefs: user?.notificationPrefs });
  })
);

router.get(
  "/webhooks",
  asyncHandler(async (req, res) => {
    const hooks = await OrgWebhook.find({ organizationId: req.user!.organizationId }).lean();
    res.json({
      webhooks: hooks.map((h) => ({
        id: h._id,
        url: h.url,
        events: h.events,
        active: h.active,
        secret: `${String(h.secret).slice(0, 4)}••••`,
      })),
    });
  })
);

router.post(
  "/webhooks",
  requireRole("owner", "admin"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        url: z.string().url(),
        events: z.array(z.string()).optional(),
      })
      .parse(req.body);
    const hook = await OrgWebhook.create({
      organizationId: req.user!.organizationId,
      url: body.url,
      events: body.events ?? ["message.inbound", "conversation.handoff"],
      secret: crypto.randomBytes(24).toString("hex"),
    });
    res.status(201).json({ webhook: hook });
  })
);

router.get(
  "/billing",
  asyncHandler(async (req, res) => {
    const organization = await Organization.findById(req.user!.organizationId).select("plan billingEmail name");
    res.json({
      plan: organization?.plan ?? "trial",
      billingEmail: organization?.billingEmail ?? "",
      plans: [
        { id: "trial", name: "Trial", price: 0, messages: 250 },
        { id: "starter", name: "Starter", price: 79, messages: 2500 },
        { id: "growth", name: "Growth", price: 199, messages: 15000 },
        { id: "scale", name: "Scale", price: 499, messages: 75000 },
      ],
    });
  })
);

export default router;
