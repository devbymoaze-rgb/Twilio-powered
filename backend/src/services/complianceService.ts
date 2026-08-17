import { Contact } from "../models/Contact";
import { ComplianceSettings } from "../models/ComplianceSettings";
import { Suppression } from "../models/Suppression";
import { MessageLog } from "../models/MessageLog";
import { isHelpKeyword, isStartKeyword, isStopKeyword, normalizePhone } from "../utils/phone";
import { sendSms } from "./twilioService";

export async function handleComplianceKeywords(params: {
  organizationId: string;
  from: string;
  body: string;
}): Promise<{ handled: boolean; response?: string }> {
  const phone = normalizePhone(params.from);
  const settings = await ComplianceSettings.findOne({ organizationId: params.organizationId });

  if (isStopKeyword(params.body)) {
    await Contact.findOneAndUpdate(
      { organizationId: params.organizationId, phone },
      {
        $set: {
          consentStatus: "opted_out",
          optOutTimestamp: new Date(),
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    await Suppression.findOneAndUpdate(
      { organizationId: params.organizationId, phone },
      { reason: "opt_out", source: "inbound" },
      { upsert: true }
    );
    await MessageLog.create({
      organizationId: params.organizationId,
      event: "compliance.opt_out",
      detail: phone,
    });
    const response =
      settings?.optOutMessage ||
      "You are unsubscribed and will no longer receive messages. Reply START to resubscribe.";
    try {
      await sendSms({ organizationId: params.organizationId, to: phone, body: response });
    } catch {
      // Still treat the opt-out as handled even if the confirmation SMS fails.
    }
    return { handled: true, response };
  }

  if (isStartKeyword(params.body)) {
    await Contact.findOneAndUpdate(
      { organizationId: params.organizationId, phone },
      {
        $set: {
          consentStatus: "opted_in",
          optInSource: "sms_start",
          optInTimestamp: new Date(),
        },
        $unset: { optOutTimestamp: 1 },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    await Suppression.deleteOne({ organizationId: params.organizationId, phone });
    await MessageLog.create({
      organizationId: params.organizationId,
      event: "compliance.opt_in",
      detail: phone,
    });
    const response =
      settings?.optInMessage ||
      "You are subscribed to messages. Reply STOP to unsubscribe, HELP for help.";
    try {
      await sendSms({ organizationId: params.organizationId, to: phone, body: response });
    } catch {
      // Opt-in is recorded regardless of confirmation delivery.
    }
    return { handled: true, response };
  }

  if (isHelpKeyword(params.body)) {
    const response =
      settings?.helpMessage ||
      "Reply STOP to unsubscribe. Msg & data rates may apply. Reply HELP for help.";
    try {
      await sendSms({ organizationId: params.organizationId, to: phone, body: response });
    } catch {
      // HELP still counts as handled.
    }
    await MessageLog.create({
      organizationId: params.organizationId,
      event: "compliance.help",
      detail: phone,
    });
    return { handled: true, response };
  }

  return { handled: false };
}
