import mongoose, { Schema, type InferSchemaType } from "mongoose";

const messageSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", required: true },
    direction: { type: String, enum: ["inbound", "outbound"], required: true },
    body: { type: String, default: "" },
    status: {
      type: String,
      enum: ["queued", "sent", "delivered", "failed", "undelivered", "received"],
      default: "queued",
    },
    twilioSid: { type: String, default: "", index: true },
    source: {
      type: String,
      enum: ["ai", "human", "automation", "campaign", "system"],
      default: "human",
    },
    senderId: { type: Schema.Types.ObjectId, ref: "User" },
    mediaUrls: { type: [String], default: [] },
    errorCode: { type: String, default: "" },
    errorMessage: { type: String, default: "" },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign" },
    automationId: { type: Schema.Types.ObjectId, ref: "Automation" },
  },
  { timestamps: true }
);

messageSchema.index({ organizationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, createdAt: 1 });

export type MessageDoc = InferSchemaType<typeof messageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Message = mongoose.model("Message", messageSchema);
