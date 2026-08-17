import mongoose, { Schema, type InferSchemaType } from "mongoose";

const contactSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    firstName: { type: String, default: "", trim: true },
    lastName: { type: String, default: "", trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    tags: { type: [String], default: [] },
    leadScore: { type: Number, default: 0, min: 0, max: 100 },
    consentStatus: { type: String, enum: ["opted_in", "opted_out", "unknown"], default: "unknown" },
    optInSource: { type: String, default: "" },
    optInTimestamp: { type: Date },
    optOutTimestamp: { type: Date },
    lastMessageAt: { type: Date },
    conversationStatus: {
      type: String,
      enum: ["none", "open", "closed", "needs_human", "qualified"],
      default: "none",
    },
    customFields: { type: Schema.Types.Mixed, default: {} },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: "User" },
    source: { type: String, default: "manual" },
  },
  { timestamps: true }
);

contactSchema.index({ organizationId: 1, phone: 1 }, { unique: true });
contactSchema.index({ organizationId: 1, tags: 1 });
contactSchema.index({ organizationId: 1, leadScore: -1 });
contactSchema.index({
  firstName: "text",
  lastName: "text",
  email: "text",
  phone: "text",
});

export type ContactDoc = InferSchemaType<typeof contactSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Contact = mongoose.model("Contact", contactSchema);
