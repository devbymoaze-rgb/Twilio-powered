import mongoose, { Schema, type InferSchemaType } from "mongoose";

const automationRunSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    automationId: { type: Schema.Types.ObjectId, ref: "Automation", required: true, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact" },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation" },
    status: { type: String, enum: ["running", "completed", "stopped", "failed"], default: "running" },
    currentNodeId: { type: String, default: "" },
    waitUntil: { type: Date },
    log: {
      type: [
        {
          at: { type: Date, default: Date.now },
          nodeId: String,
          message: String,
        },
      ],
      default: [],
    },
    error: { type: String, default: "" },
  },
  { timestamps: true }
);

automationRunSchema.index({ organizationId: 1, createdAt: -1 });
automationRunSchema.index({ waitUntil: 1, status: 1 });

export type AutomationRunDoc = InferSchemaType<typeof automationRunSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AutomationRun = mongoose.model("AutomationRun", automationRunSchema);
