import mongoose, { Schema, type InferSchemaType } from "mongoose";

const messageLogSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact" },
    messageId: { type: Schema.Types.ObjectId, ref: "Message" },
    event: { type: String, required: true },
    detail: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

messageLogSchema.index({ organizationId: 1, createdAt: -1 });

export type MessageLogDoc = InferSchemaType<typeof messageLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const MessageLog = mongoose.model("MessageLog", messageLogSchema);
