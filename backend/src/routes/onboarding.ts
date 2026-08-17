import { Router } from "express";
import { z } from "zod";
import { Organization } from "../models/Organization";
import { BusinessProfile } from "../models/BusinessProfile";
import { AiAssistant } from "../models/AiAssistant";
import { ComplianceSettings } from "../models/ComplianceSettings";
import { Automation } from "../models/Automation";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import type { OnboardingStep } from "../types";

const router = Router();
router.use(requireAuth);

const steps: OnboardingStep[] = [
  "account",
  "business",
  "use_case",
  "twilio",
  "sms_number",
  "business_profile",
  "ai_personality",
  "compliance",
  "first_automation",
  "complete",
];

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const organization = await Organization.findById(req.user!.organizationId);
    const [profile, assistant, compliance] = await Promise.all([
      BusinessProfile.findOne({ organizationId: req.user!.organizationId }),
      AiAssistant.findOne({ organizationId: req.user!.organizationId }),
      ComplianceSettings.findOne({ organizationId: req.user!.organizationId }),
    ]);
    res.json({
      step: organization?.onboardingStep ?? "business",
      completed: organization?.onboardingCompleted ?? false,
      organization,
      profile,
      assistant,
      compliance,
    });
  })
);

router.put(
  "/",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        step: z.enum([
          "account",
          "business",
          "use_case",
          "twilio",
          "sms_number",
          "business_profile",
          "ai_personality",
          "compliance",
          "first_automation",
          "complete",
        ]),
        organization: z
          .object({
            name: z.string().optional(),
            industry: z.string().optional(),
            website: z.string().optional(),
            timezone: z.string().optional(),
            smsUseCases: z.array(z.string()).optional(),
          })
          .optional(),
        profile: z.record(z.unknown()).optional(),
        assistant: z.record(z.unknown()).optional(),
        compliance: z.record(z.unknown()).optional(),
        automation: z
          .object({
            name: z.string(),
            triggerType: z.string(),
            message: z.string().optional(),
          })
          .optional(),
      })
      .parse(req.body);

    const organization = await Organization.findByIdAndUpdate(
      req.user!.organizationId,
      {
        $set: {
          onboardingStep: body.step,
          ...(body.organization ?? {}),
          onboardingCompleted: body.step === "complete",
        },
      },
      { new: true }
    );

    if (body.profile) {
      await BusinessProfile.findOneAndUpdate(
        { organizationId: req.user!.organizationId },
        { $set: body.profile },
        { upsert: true }
      );
    }
    if (body.assistant) {
      await AiAssistant.findOneAndUpdate(
        { organizationId: req.user!.organizationId },
        { $set: body.assistant },
        { upsert: true }
      );
    }
    if (body.compliance) {
      await ComplianceSettings.findOneAndUpdate(
        { organizationId: req.user!.organizationId },
        { $set: body.compliance },
        { upsert: true }
      );
    }
    if (body.automation) {
      const triggerId = "trigger-1";
      const actionId = "action-1";
      await Automation.create({
        organizationId: req.user!.organizationId,
        name: body.automation.name,
        status: "active",
        triggerType: body.automation.triggerType,
        nodes: [
          {
            id: triggerId,
            type: "trigger",
            position: { x: 80, y: 160 },
            data: { triggerType: body.automation.triggerType },
          },
          {
            id: actionId,
            type: "action",
            position: { x: 420, y: 160 },
            data: {
              actionType: "send_sms",
              message: body.automation.message ?? "Thanks for reaching out — we will reply shortly.",
            },
          },
        ],
        edges: [{ id: "e1", source: triggerId, target: actionId, sourceHandle: "out" }],
      });
    }

    res.json({ organization, steps });
  })
);

export default router;
