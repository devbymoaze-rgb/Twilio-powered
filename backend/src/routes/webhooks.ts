import { Router } from "express";
import { TwilioConnection } from "../models/TwilioConnection";
import { asyncHandler } from "../utils/asyncHandler";
import { decryptSecret } from "../utils/crypto";
import { validateTwilioSignature } from "../services/twilioService";
import { handleComplianceKeywords } from "../services/complianceService";
import { applyAiToInbound, handleInboundSms, updateMessageStatus } from "../services/messagingService";
import { env } from "../config/env";
import { normalizePhone } from "../utils/phone";

const router = Router();

function collectParams(body: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string") params[key] = value;
  }
  return params;
}

async function findOrgByToNumber(to: string) {
  const phone = normalizePhone(to);
  return TwilioConnection.findOne({
    $or: [{ phoneNumber: to }, { phoneNumber: phone }],
    status: "connected",
  });
}

router.post(
  "/twilio/inbound",
  asyncHandler(async (req, res) => {
    const params = collectParams(req.body ?? {});
    const to = params.To ?? "";
    const from = params.From ?? "";
    const body = params.Body ?? "";
    const sid = params.MessageSid ?? "";
    const connection = await findOrgByToNumber(to);
    if (!connection) {
      res.type("text/xml").send("<Response></Response>");
      return;
    }

    const signature = String(req.headers["x-twilio-signature"] ?? "");
    const authToken = decryptSecret(connection.authTokenEncrypted);
    const url = `${env.publicApiUrl.replace(/\/$/, "")}/api/webhooks/twilio/inbound`;
    const valid = validateTwilioSignature(authToken, signature, url, params);
    if (!valid && env.isProd) {
      res.status(403).type("text/xml").send("<Response></Response>");
      return;
    }

    const organizationId = String(connection.organizationId);
    const compliance = await handleComplianceKeywords({ organizationId, from, body });
    if (compliance.handled) {
      res.type("text/xml").send("<Response></Response>");
      return;
    }

    const inbound = await handleInboundSms({
      organizationId,
      from,
      to,
      body,
      twilioSid: sid,
      mediaUrls: Object.keys(params)
        .filter((k) => k.startsWith("MediaUrl"))
        .map((k) => params[k]),
    });

    void applyAiToInbound(organizationId, String(inbound.conversation._id), body);
    res.type("text/xml").send("<Response></Response>");
  })
);

router.post(
  "/twilio/status",
  asyncHandler(async (req, res) => {
    const params = collectParams(req.body ?? {});
    const sid = params.MessageSid ?? "";
    const status = params.MessageStatus ?? "";
    if (sid) {
      await updateMessageStatus(sid, status, params.ErrorCode, params.ErrorMessage);
    }
    res.status(204).end();
  })
);

export default router;
