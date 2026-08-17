import mongoose, { Schema, type InferSchemaType } from "mongoose";

const knowledgeArticleSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    category: {
      type: String,
      enum: ["products", "services", "pricing", "faqs", "policies", "company"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

knowledgeArticleSchema.index({ organizationId: 1, category: 1 });

export type KnowledgeArticleDoc = InferSchemaType<typeof knowledgeArticleSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const KnowledgeArticle = mongoose.model("KnowledgeArticle", knowledgeArticleSchema);
