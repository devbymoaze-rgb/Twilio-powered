import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { analyticsOverview } from "../services/analyticsService";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const days = Number(req.query.days ?? 30);
    const data = await analyticsOverview(req.user!.organizationId, Number.isFinite(days) ? days : 30);
    res.json(data);
  })
);

export default router;
