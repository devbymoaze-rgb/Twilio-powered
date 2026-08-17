import mongoose, { Schema, type InferSchemaType } from "mongoose";

const twilioConnectionSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, unique: true },
    accountSidEncrypted: { type: String, required: true },
    authTokenEncrypted: { type: String, required: true },
    accountSidLast4: { type: String, default: "" },
    messagingServiceSid: { type: String, default: "" },
    phoneNumber: { type: String, default: "" },
    phoneNumberSid: { type: String, default: "" },
    friendlyName: { type: String, default: "" },
    status: { type: String, enum: ["disconnected", "connected", "error"], default: "disconnected" },
    lastError: { type: String, default: "" },
    inboundWebhookConfigured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type TwilioConnectionDoc = InferSchemaType<typeof twilioConnectionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const TwilioConnection = mongoose.model("TwilioConnection", twilioConnectionSchema);
