import mongoose, { Schema, type InferSchemaType } from "mongoose";

const taskSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation" },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    status: { type: String, enum: ["open", "done"], default: "open" },
  },
  { timestamps: true }
);

export type TaskDoc = InferSchemaType<typeof taskSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Task = mongoose.model("Task", taskSchema);
