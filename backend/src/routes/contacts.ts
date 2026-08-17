import { Router } from "express";
import { z } from "zod";
import { Contact } from "../models/Contact";
import { Conversation } from "../models/Conversation";
import { Message } from "../models/Message";
import { AutomationRun } from "../models/AutomationRun";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { NotFoundError } from "../utils/errors";
import { normalizePhone } from "../utils/phone";
import { runAutomations } from "../services/automationEngine";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    const tag = String(req.query.tag ?? "").trim();
    const consent = String(req.query.consent ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const filter: Record<string, unknown> = { organizationId: req.user!.organizationId };
    if (tag) filter.tags = tag;
    if (consent) filter.consentStatus = consent;
    if (status) filter.conversationStatus = status;
    if (q) {
      filter.$or = [
        { firstName: new RegExp(q, "i") },
        { lastName: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
        { phone: new RegExp(q, "i") },
      ];
    }
    const contacts = await Contact.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
    res.json({ contacts });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().min(7),
        email: z.string().email().optional().or(z.literal("")),
        tags: z.array(z.string()).optional(),
        consentStatus: z.enum(["opted_in", "opted_out", "unknown"]).optional(),
        optInSource: z.string().optional(),
        customFields: z.record(z.unknown()).optional(),
      })
      .parse(req.body);

    const contact = await Contact.create({
      ...body,
      organizationId: req.user!.organizationId,
      phone: normalizePhone(body.phone),
      optInTimestamp: body.consentStatus === "opted_in" ? new Date() : undefined,
    });
    await runAutomations({
      organizationId: req.user!.organizationId,
      triggerType: "contact_added",
      contactId: String(contact._id),
    });
    res.status(201).json({ contact });
  })
);

router.post(
  "/import",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        contacts: z.array(
          z.object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            phone: z.string().min(7),
            email: z.string().optional(),
            tags: z.array(z.string()).optional(),
            consentStatus: z.enum(["opted_in", "opted_out", "unknown"]).optional(),
            optInSource: z.string().optional(),
          })
        ),
      })
      .parse(req.body);

    const created = [];
    const skipped = [];
    for (const row of body.contacts) {
      const phone = normalizePhone(row.phone);
      const existing = await Contact.findOne({
        organizationId: req.user!.organizationId,
        phone,
      });
      if (existing) {
        skipped.push(phone);
        continue;
      }
      const contact = await Contact.create({
        ...row,
        organizationId: req.user!.organizationId,
        phone,
        optInTimestamp: row.consentStatus === "opted_in" ? new Date() : undefined,
      });
      created.push(contact);
      await runAutomations({
        organizationId: req.user!.organizationId,
        triggerType: "contact_added",
        contactId: String(contact._id),
      });
    }
    res.json({ created: created.length, skipped: skipped.length, contacts: created });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const contact = await Contact.findOne({
      _id: req.params.id,
      organizationId: req.user!.organizationId,
    }).populate("assignedAgentId", "name email");
    if (!contact) throw new NotFoundError("Contact not found");
    const conversation = await Conversation.findOne({
      organizationId: req.user!.organizationId,
      contactId: contact._id,
    });
    const messages = conversation
      ? await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 }).limit(200)
      : [];
    const automations = await AutomationRun.find({
      organizationId: req.user!.organizationId,
      contactId: contact._id,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("automationId", "name");
    res.json({ contact, conversation, messages, automations });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().optional(),
        tags: z.array(z.string()).optional(),
        leadScore: z.number().min(0).max(100).optional(),
        consentStatus: z.enum(["opted_in", "opted_out", "unknown"]).optional(),
        optInSource: z.string().optional(),
        assignedAgentId: z.string().nullable().optional(),
        customFields: z.record(z.unknown()).optional(),
      })
      .parse(req.body);
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user!.organizationId },
      { $set: body },
      { new: true }
    );
    if (!contact) throw new NotFoundError("Contact not found");
    res.json({ contact });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const contact = await Contact.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.user!.organizationId,
    });
    if (!contact) throw new NotFoundError("Contact not found");
    res.json({ ok: true });
  })
);

export default router;
