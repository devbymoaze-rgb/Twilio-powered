import mongoose, { Schema, type InferSchemaType } from "mongoose";

const campaignSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    aiPersonalization: { type: Boolean, default: false },
    senderPhone: { type: String, default: "" },
    audience: {
      type: { type: String, enum: ["all", "tags", "ids"], default: "all" },
      tags: { type: [String], default: [] },
      contactIds: { type: [Schema.Types.ObjectId], default: [] },
      consentOnly: { type: Boolean, default: true },
    },
    scheduledAt: { type: Date },
    rateLimitPerMinute: { type: Number, default: 30, min: 1, max: 200 },
    status: {
      type: String,
      enum: ["draft", "scheduled", "running", "paused", "completed"],
      default: "draft",
    },
    stats: {
      targeted: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      replies: { type: Number, default: 0 },
      optOuts: { type: Number, default: 0 },
      qualifiedLeads: { type: Number, default: 0 },
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    cursor: { type: Number, default: 0 },
  },
  { timestamps: true }
);

campaignSchema.index({ organizationId: 1, createdAt: -1 });

export type CampaignDoc = InferSchemaType<typeof campaignSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Campaign = mongoose.model("Campaign", campaignSchema);
