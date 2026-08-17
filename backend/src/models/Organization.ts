import mongoose, { Schema, type InferSchemaType } from "mongoose";
import type { OnboardingStep } from "../types";

const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    industry: { type: String, default: "" },
    website: { type: String, default: "" },
    timezone: { type: String, default: "America/New_York" },
    smsUseCases: { type: [String], default: [] },
    onboardingStep: {
      type: String,
      enum: [
        "account",
        "business",
        "use_case",
        "twilio",
        "sms_number",
        "business_profile",
        "ai_personality",
        "compliance",
        "first_automation",
        "complete",
      ] as OnboardingStep[],
      default: "business",
    },
    onboardingCompleted: { type: Boolean, default: false },
    plan: { type: String, enum: ["trial", "starter", "growth", "scale"], default: "trial" },
    billingEmail: { type: String, default: "" },
  },
  { timestamps: true }
);

export type OrganizationDoc = InferSchemaType<typeof organizationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Organization = mongoose.model("Organization", organizationSchema);
