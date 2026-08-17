import mongoose, { Schema, type InferSchemaType } from "mongoose";

const aiAssistantSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, unique: true },
    businessDescription: { type: String, default: "" },
    productsServices: { type: String, default: "" },
    tone: {
      type: String,
      enum: ["professional", "friendly", "concise", "warm", "formal"],
      default: "professional",
    },
    personality: { type: String, default: "" },
    qualificationQuestions: { type: [String], default: [] },
    conversationRules: { type: String, default: "" },
    escalationRules: { type: String, default: "" },
    faqs: {
      type: [
        {
          question: String,
          answer: String,
        },
      ],
      default: [],
    },
    autoReplyEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type AiAssistantDoc = InferSchemaType<typeof aiAssistantSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AiAssistant = mongoose.model("AiAssistant", aiAssistantSchema);
