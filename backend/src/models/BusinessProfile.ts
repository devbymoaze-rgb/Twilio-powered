import mongoose, { Schema, type InferSchemaType } from "mongoose";

const businessProfileSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, unique: true },
    companyName: { type: String, default: "" },
    industry: { type: String, default: "" },
    website: { type: String, default: "" },
    description: { type: String, default: "" },
    address: { type: String, default: "" },
    supportPhone: { type: String, default: "" },
    supportEmail: { type: String, default: "" },
    hours: { type: String, default: "" },
  },
  { timestamps: true }
);

export type BusinessProfileDoc = InferSchemaType<typeof businessProfileSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BusinessProfile = mongoose.model("BusinessProfile", businessProfileSchema);
