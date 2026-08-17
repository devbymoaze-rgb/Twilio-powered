import twilio from "twilio";
import { env } from "../config/env";
import { TwilioConnection } from "../models/TwilioConnection";
import { AppError, NotFoundError } from "../utils/errors";
import { decryptSecret, encryptSecret, maskSecret } from "../utils/crypto";

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
}

export async function getTwilioCredentials(
  organizationId: string
): Promise<TwilioCredentials> {
  const connection = await TwilioConnection.findOne({ organizationId });
  if (!connection) throw new NotFoundError("Twilio is not connected");
  return {
    accountSid: decryptSecret(connection.accountSidEncrypted),
    authToken: decryptSecret(connection.authTokenEncrypted),
  };
}

export async function getTwilioClient(organizationId: string) {
  const { accountSid, authToken } = await getTwilioCredentials(organizationId);
  return twilio(accountSid, authToken);
}

export async function connectTwilioAccount(
  organizationId: string,
  accountSid: string,
  authToken: string
) {
  const client = twilio(accountSid, authToken);
  try {
    await client.api.accounts(accountSid).fetch();
  } catch {
    throw new AppError("Could not authenticate with Twilio. Check your Account SID and Auth Token.", 400);
  }

  const connection = await TwilioConnection.findOneAndUpdate(
    { organizationId },
    {
      organizationId,
      accountSidEncrypted: encryptSecret(accountSid),
      authTokenEncrypted: encryptSecret(authToken),
      accountSidLast4: accountSid.slice(-4),
      status: "connected",
      lastError: "",
    },
    { upsert: true, new: true }
  );

  return sanitizeConnection(connection);
}

export async function listIncomingNumbers(organizationId: string) {
  const client = await getTwilioClient(organizationId);
  const numbers = await client.incomingPhoneNumbers.list({ limit: 50 });
  return numbers.map((n) => ({
    sid: n.sid,
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
    capabilities: {
      sms: Boolean(n.capabilities?.sms),
      mms: Boolean(n.capabilities?.mms),
    },
  }));
}

export async function selectPhoneNumber(
  organizationId: string,
  phoneNumberSid: string
) {
  const client = await getTwilioClient(organizationId);
  const number = await client.incomingPhoneNumbers(phoneNumberSid).fetch();
  const webhookBase = env.publicApiUrl.replace(/\/$/, "");

  await client.incomingPhoneNumbers(phoneNumberSid).update({
    smsUrl: `${webhookBase}/api/webhooks/twilio/inbound`,
    smsMethod: "POST",
    statusCallback: `${webhookBase}/api/webhooks/twilio/status`,
    statusCallbackMethod: "POST",
  });

  let messagingServiceSid = "";
  const connection = await TwilioConnection.findOne({ organizationId });
  if (connection?.messagingServiceSid) {
    messagingServiceSid = connection.messagingServiceSid;
  } else {
    const service = await client.messaging.v1.services.create({
      friendlyName: "TextPulse",
      inboundRequestUrl: `${webhookBase}/api/webhooks/twilio/inbound`,
      inboundMethod: "POST",
      statusCallback: `${webhookBase}/api/webhooks/twilio/status`,
    });
    messagingServiceSid = service.sid;
    await client.messaging.v1
      .services(messagingServiceSid)
      .phoneNumbers.create({ phoneNumberSid });
  }

  const updated = await TwilioConnection.findOneAndUpdate(
    { organizationId },
    {
      phoneNumber: number.phoneNumber,
      phoneNumberSid: number.sid,
      friendlyName: number.friendlyName,
      messagingServiceSid,
      inboundWebhookConfigured: true,
      status: "connected",
    },
    { new: true }
  );

  return sanitizeConnection(updated);
}

export function sanitizeConnection(connection: {
  accountSidLast4?: string;
  messagingServiceSid?: string;
  phoneNumber?: string;
  phoneNumberSid?: string;
  friendlyName?: string;
  status?: string;
  lastError?: string;
  inboundWebhookConfigured?: boolean;
} | null) {
  if (!connection) return null;
  return {
    connected: connection.status === "connected",
    status: connection.status,
    accountSidMasked: connection.accountSidLast4
      ? maskSecret(`ACXXXXXXXXXXXXXXXXXXXXXXXX${connection.accountSidLast4}`, 4)
      : "",
    messagingServiceSid: connection.messagingServiceSid ?? "",
    phoneNumber: connection.phoneNumber ?? "",
    phoneNumberSid: connection.phoneNumberSid ?? "",
    friendlyName: connection.friendlyName ?? "",
    inboundWebhookConfigured: Boolean(connection.inboundWebhookConfigured),
    lastError: connection.lastError ?? "",
  };
}

export function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  return twilio.validateRequest(authToken, signature, url, params);
}

export async function sendSms(params: {
  organizationId: string;
  to: string;
  body: string;
  statusCallback?: string;
}) {
  const connection = await TwilioConnection.findOne({ organizationId: params.organizationId });
  if (!connection?.phoneNumber) {
    throw new AppError("Select an SMS number before sending messages", 400);
  }
  const client = await getTwilioClient(params.organizationId);
  const webhookBase = env.publicApiUrl.replace(/\/$/, "");
  const payload: {
    to: string;
    body: string;
    from?: string;
    messagingServiceSid?: string;
    statusCallback: string;
  } = {
    to: params.to,
    body: params.body,
    statusCallback:
      params.statusCallback ?? `${webhookBase}/api/webhooks/twilio/status`,
  };

  if (connection.messagingServiceSid) {
    payload.messagingServiceSid = connection.messagingServiceSid;
  } else {
    payload.from = connection.phoneNumber;
  }

  return client.messages.create(payload);
}
