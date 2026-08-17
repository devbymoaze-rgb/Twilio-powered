import mongoose, { Schema, type InferSchemaType } from "mongoose";

const conversationSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", required: true, index: true },
    status: {
      type: String,
      enum: ["open", "closed", "needs_human", "qualified"],
      default: "open",
    },
    unreadCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessagePreview: { type: String, default: "" },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: "User" },
    handledBy: { type: String, enum: ["ai", "human", "mixed"], default: "ai" },
    intent: { type: String, default: "" },
    sentiment: { type: String, enum: ["positive", "neutral", "negative", "mixed", ""], default: "" },
    leadScore: { type: Number, default: 0 },
    aiSummary: { type: String, default: "" },
    tags: { type: [String], default: [] },
    qualifiedAt: { type: Date },
    closedAt: { type: Date },
    handedOffAt: { type: Date },
    nextBestAction: { type: String, default: "" },
    objection: { type: String, default: "" },
    aiPaused: { type: Boolean, default: false },
    noResponseFiredAt: { type: Date },
  },
  { timestamps: true }
);

conversationSchema.index({ organizationId: 1, lastMessageAt: -1 });
conversationSchema.index({ organizationId: 1, status: 1 });
conversationSchema.index({ organizationId: 1, contactId: 1 }, { unique: true });

export type ConversationDoc = InferSchemaType<typeof conversationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Conversation = mongoose.model("Conversation", conversationSchema);
