import mongoose, { Schema, type InferSchemaType } from "mongoose";

const orgWebhookSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    url: { type: String, required: true },
    events: { type: [String], default: ["message.inbound", "conversation.handoff"] },
    secret: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type OrgWebhookDoc = InferSchemaType<typeof orgWebhookSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const OrgWebhook = mongoose.model("OrgWebhook", orgWebhookSchema);
