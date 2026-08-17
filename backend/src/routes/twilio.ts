import { Router } from "express";
import { z } from "zod";
import { TwilioConnection } from "../models/TwilioConnection";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import {
  connectTwilioAccount,
  listIncomingNumbers,
  sanitizeConnection,
  selectPhoneNumber,
} from "../services/twilioService";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const connection = await TwilioConnection.findOne({
      organizationId: req.user!.organizationId,
    });
    res.json({ connection: sanitizeConnection(connection) });
  })
);

router.post(
  "/connect",
  requireRole("owner", "admin"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        accountSid: z.string().min(10),
        authToken: z.string().min(10),
      })
      .parse(req.body);
    const connection = await connectTwilioAccount(
      req.user!.organizationId,
      body.accountSid.trim(),
      body.authToken.trim()
    );
    res.json({ connection });
  })
);

router.get(
  "/numbers",
  asyncHandler(async (req, res) => {
    const numbers = await listIncomingNumbers(req.user!.organizationId);
    res.json({ numbers });
  })
);

router.post(
  "/numbers/select",
  requireRole("owner", "admin"),
  asyncHandler(async (req, res) => {
    const body = z.object({ phoneNumberSid: z.string().min(4) }).parse(req.body);
    const connection = await selectPhoneNumber(req.user!.organizationId, body.phoneNumberSid);
    res.json({ connection });
  })
);

export default router;
