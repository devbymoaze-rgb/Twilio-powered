import mongoose, { Schema, type InferSchemaType } from "mongoose";

const complianceSettingsSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, unique: true },
    requireOptIn: { type: Boolean, default: true },
    helpMessage: {
      type: String,
      default:
        "Reply STOP to unsubscribe. Msg & data rates may apply. Reply HELP for help.",
    },
    optOutMessage: {
      type: String,
      default: "You are unsubscribed and will no longer receive messages. Reply START to resubscribe.",
    },
    optInMessage: {
      type: String,
      default: "You are subscribed to messages. Reply STOP to unsubscribe, HELP for help.",
    },
    includeOptOutLanguage: { type: Boolean, default: true },
    businessName: { type: String, default: "" },
  },
  { timestamps: true }
);

export type ComplianceSettingsDoc = InferSchemaType<typeof complianceSettingsSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ComplianceSettings = mongoose.model(
  "ComplianceSettings",
  complianceSettingsSchema
);
