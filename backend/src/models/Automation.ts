import mongoose, { Schema, type InferSchemaType } from "mongoose";

const nodeSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ["trigger", "condition", "action"], required: true },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const edgeSchema = new Schema(
  {
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    sourceHandle: { type: String, default: "" },
  },
  { _id: false }
);

const automationSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["draft", "active", "paused"], default: "draft" },
    triggerType: {
      type: String,
      enum: [
        "contact_added",
        "campaign_started",
        "sms_received",
        "sms_delivered",
        "no_response",
        "keyword_received",
        "lead_qualified",
        "appointment_booked",
      ],
      required: true,
    },
    triggerConfig: { type: Schema.Types.Mixed, default: {} },
    nodes: { type: [nodeSchema], default: [] },
    edges: { type: [edgeSchema], default: [] },
    runCount: { type: Number, default: 0 },
    lastRunAt: { type: Date },
  },
  { timestamps: true }
);

automationSchema.index({ organizationId: 1, status: 1, triggerType: 1 });

export type AutomationDoc = InferSchemaType<typeof automationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Automation = mongoose.model("Automation", automationSchema);
