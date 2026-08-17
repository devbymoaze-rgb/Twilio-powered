import { Router } from "express";
import { z } from "zod";
import { Automation } from "../models/Automation";
import { AutomationRun } from "../models/AutomationRun";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { NotFoundError } from "../utils/errors";

const router = Router();
router.use(requireAuth);

const nodeSchema = z.object({
  id: z.string(),
  type: z.enum(["trigger", "condition", "action"]),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.unknown()).optional(),
});

const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
});

const automationBody = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  triggerType: z.enum([
    "contact_added",
    "campaign_started",
    "sms_received",
    "sms_delivered",
    "no_response",
    "keyword_received",
    "lead_qualified",
    "appointment_booked",
  ]),
  triggerConfig: z.record(z.unknown()).optional(),
  nodes: z.array(nodeSchema).optional(),
  edges: z.array(edgeSchema).optional(),
  status: z.enum(["draft", "active", "paused"]).optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const automations = await Automation.find({ organizationId: req.user!.organizationId })
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ automations });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = automationBody.parse(req.body);
    const automation = await Automation.create({
      ...body,
      organizationId: req.user!.organizationId,
    });
    res.status(201).json({ automation });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const automation = await Automation.findOne({
      _id: req.params.id,
      organizationId: req.user!.organizationId,
    });
    if (!automation) throw new NotFoundError("Automation not found");
    const runs = await AutomationRun.find({ automationId: automation._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    res.json({ automation, runs });
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = automationBody.partial().parse(req.body);
    const automation = await Automation.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user!.organizationId },
      { $set: body },
      { new: true }
    );
    if (!automation) throw new NotFoundError("Automation not found");
    res.json({ automation });
  })
);

router.post(
  "/:id/activate",
  asyncHandler(async (req, res) => {
    const automation = await Automation.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user!.organizationId },
      { $set: { status: "active" } },
      { new: true }
    );
    if (!automation) throw new NotFoundError("Automation not found");
    res.json({ automation });
  })
);

router.post(
  "/:id/pause",
  asyncHandler(async (req, res) => {
    const automation = await Automation.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user!.organizationId },
      { $set: { status: "paused" } },
      { new: true }
    );
    if (!automation) throw new NotFoundError("Automation not found");
    res.json({ automation });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await Automation.deleteOne({
      _id: req.params.id,
      organizationId: req.user!.organizationId,
    });
    res.json({ ok: true });
  })
);

export default router;
