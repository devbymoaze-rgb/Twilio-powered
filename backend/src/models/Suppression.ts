import mongoose, { Schema, type InferSchemaType } from "mongoose";

const suppressionSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    phone: { type: String, required: true },
    reason: { type: String, default: "opt_out" },
    source: { type: String, default: "inbound" },
  },
  { timestamps: true }
);

suppressionSchema.index({ organizationId: 1, phone: 1 }, { unique: true });

export type SuppressionDoc = InferSchemaType<typeof suppressionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Suppression = mongoose.model("Suppression", suppressionSchema);
