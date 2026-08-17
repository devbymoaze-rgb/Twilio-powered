import mongoose, { Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["owner", "admin", "agent"], default: "owner" },
    avatarUrl: { type: String, default: "" },
    lastLoginAt: { type: Date },
    invitePending: { type: Boolean, default: false },
    notificationPrefs: {
      emailReplies: { type: Boolean, default: true },
      emailHandoffs: { type: Boolean, default: true },
      emailCampaigns: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

userSchema.index({ organizationId: 1, email: 1 });

export type UserDoc = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User = mongoose.model("User", userSchema);
