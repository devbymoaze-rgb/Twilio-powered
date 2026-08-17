import { Router } from "express";
import { z } from "zod";
import { KnowledgeArticle } from "../models/KnowledgeArticle";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { NotFoundError } from "../utils/errors";

const router = Router();
router.use(requireAuth);

const articleBody = z.object({
  category: z.enum(["products", "services", "pricing", "faqs", "policies", "company"]),
  title: z.string().min(2),
  content: z.string().min(2),
  published: z.boolean().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const category = String(req.query.category ?? "");
    const filter: Record<string, unknown> = { organizationId: req.user!.organizationId };
    if (category) filter.category = category;
    const articles = await KnowledgeArticle.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({ articles });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = articleBody.parse(req.body);
    const article = await KnowledgeArticle.create({
      ...body,
      organizationId: req.user!.organizationId,
    });
    res.status(201).json({ article });
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = articleBody.partial().parse(req.body);
    const article = await KnowledgeArticle.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user!.organizationId },
      { $set: body },
      { new: true }
    );
    if (!article) throw new NotFoundError("Article not found");
    res.json({ article });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await KnowledgeArticle.deleteOne({
      _id: req.params.id,
      organizationId: req.user!.organizationId,
    });
    res.json({ ok: true });
  })
);

export default router;
